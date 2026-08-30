---
title: "一个巧妙的业务优化器实践：解决Flink SQL Code Generation 64 KB 故障，用虚拟节点打断投影合并"
date: "2023-12-24 20:30:00"
updated: "2023-12-24 20:30:00"
categories:
  - "Flink"
tags:
  - "Flink"
  - "Spark"
  - "SQL优化"
  - "Code Generation"
  - "JVM"
  - "RBO"
description: "复杂特征 SQL 因投影合并生成超大方法，触发 JVM 单方法 64 KB 限制。本文从故障链路出发，介绍如何在前置业务优化器中注入逻辑屏障，低成本打断 Code Generation。"
---

在大数据计算中，有一类问题常见：SQL 本身语法正确，数据量也没有明显增长，任务却在提交或编译阶段失败。继续增加并行度、内存或 CPU 都没有效果，因为任务甚至还没有真正开始处理数据。

我们在特征生产业务中遇到的正是这种故障。业务方配置了大量过滤条件和多层 `SELECT`，Flink 最终生成的 Java 方法超过 JVM 单方法字节码上限，查询因此失败。

常见的处理方向是继续增强通用 Code Splitter，把超大方法递归拆成多个小方法。但在实际业务中，拆分过程可能带来很重的提交期开销，并伴随频繁 GC，极端情况下任务要等待数十分钟才能提交。为此，我们换了一个思路：**不在代码已经膨胀后继续修补，而是在业务优化器中提前打断造成膨胀的投影合并链路。**

这个方案看似只是插入一个逻辑节点，背后却涉及 SQL 优化器、代码生成和 JVM 限制三层机制。本文完整拆解这一问题。

## 一、故障现象：SQL 没错，为什么就是跑不起来？

问题最初出现在特征生产任务中。此类任务通常具有几个特点：

- 原始字段很多；
- 特征加工链路包含多层 `SELECT`；
- 每一层都可能新增 `CASE WHEN`、函数调用或类型转换；
- 业务方可以动态配置大量过滤条件；
- 上一层生成的字段会被下一层继续引用。

一个经过简化的 SQL 结构如下：

```sql
SELECT
  user_id,
  feature_a,
  CASE WHEN feature_b > 10 THEN 1 ELSE 0 END AS feature_c
FROM (
  SELECT
    user_id,
    raw_a * 100 AS feature_a,
    CASE WHEN condition_1 AND condition_2 THEN raw_b ELSE 0 END AS feature_b
  FROM (
    SELECT *
    FROM feature_source
    WHERE condition_3
      AND condition_4
      -- 还有大量动态过滤条件
  ) t1
) t2;
```

从业务视角看，这只是分层组织 SQL；从优化器视角看，连续投影却很可能被合并。合并后，上层表达式会不断展开并替换下层字段引用，最终形成一个巨大的表达式树。

典型报错会包含类似信息：

```text
Method code too large
Code of method ... grows beyond 64 KB
```

这时增加 TaskManager 内存通常无效，因为问题不是“堆不够”，而是**生成的单个 JVM 方法无法被合法表示**。

## 二、为什么 Flink 和 Spark 要做代码生成？

传统 Volcano 执行模型通过算子逐行拉取数据。它结构清晰、扩展方便，但每处理一条记录都可能发生多次虚函数调用、类型判断和中间对象创建。

Flink、Spark 以及现代数据库普遍使用 Code Generation，将确定后的算子逻辑拼接成 Java 源码，再编译为 JVM 字节码。原本分散在多个算子中的判断和计算可以被融合进紧凑的执行方法，从而获得这些收益：

- 减少算子之间的虚函数调用；
- 降低中间对象和数据转换开销；
- 让 JIT 更容易进行内联和常量传播；
- 提高 CPU-bound 场景下的执行效率。

可以把它简化为下面的过程：

```text
SQL
  ↓
逻辑计划
  ↓  RBO / CBO 优化
物理计划
  ↓  Code Generation
Java 源码
  ↓  编译
JVM 字节码
  ↓
任务执行
```

代码生成的优势来自“融合”，风险也来自“融合”：当太多表达式被塞进同一个方法时，方法会变得异常庞大。

## 三、真正的硬限制：单个方法不能超过 64 KB

JVM Class 文件使用 `Code` 属性保存方法字节码。JVM 规范要求 `code_length` 必须小于 `65536`，也就是单个方法的字节码长度不能达到 64 KB。

需要注意，这不是以下限制：

- 不是整个 JAR 包不能超过 64 KB；
- 不是一个 Java 类不能超过 64 KB；
- 不是 JVM 堆内存不足；
- 也不是 SQL 文本长度简单超过某个字符数。

它限制的是**编译后某一个方法的字节码大小**。SQL 文本长度只能作为风险信号，真正决定结果的是表达式经过优化、展开并生成代码后的复杂度。

例如，大量 `CASE WHEN`、嵌套函数、类型转换、空值判断和重复表达式，都可能生成远多于原 SQL 字符数的 Java 代码。因此，两个长度相近的 SQL，最终生成的方法大小可能相差很大。

## 四、根因为什么是 RBO 阶段的投影合并？

### 1. 投影合并本来是一条正确的优化规则

连续的 `SELECT` 在关系代数中通常表现为连续的 Project 节点：

```text
Project C
  └─ Project B
       └─ Project A
            └─ Scan
```

如果 B 只是基于 A 继续计算字段，C 又基于 B 计算字段，那么优化器可以用表达式替换把它们合成一个 Project：

```text
Project C(B(A(...)))
  └─ Scan
```

这就是常见的 Project Merge。它属于基于规则的优化（RBO），目标是减少无意义的中间节点，为后续算子融合和代码生成创造条件。对于绝大多数 SQL，这条规则能带来更好的执行效率。

### 2. 在复杂特征 SQL 中，表达式替换会急剧膨胀

问题出在业务 SQL 的形态上。假设下层定义：

```sql
CASE WHEN c1 AND c2 THEN expensive_function(raw_value) ELSE 0 END AS feature_a
```

上层多次引用 `feature_a`，投影合并后，别名可能被完整表达式替换。再叠加多层 `SELECT`，同一个复杂表达式会在生成计划中反复展开。

于是出现这样一条故障链路：

```text
动态条件和连续 SELECT 增多
  ↓
RBO 合并连续 Project
  ↓
字段引用被复杂表达式递归替换
  ↓
单个算子的表达式树显著膨胀
  ↓
Code Generation 生成超大 Java 方法
  ↓
方法字节码超过 64 KB
  ↓
编译失败，任务无法提交或执行
```

因此，“过滤条件太多”只是业务表象，Code Generation 超限是直接原因，而**连续投影被过度合并**才是这个场景下可干预的根因。

## 五、通用解法 Code Splitter 为什么不够理想？

Flink 社区针对超大生成代码提供了 Code Splitter 思路：分析生成的 Java 代码，把大方法中的语句和表达式抽取到多个辅助方法，直到每个方法都低于限制。

它的优点很明显：

- 位于代码生成层，对上层业务 SQL 相对透明；
- 能覆盖多种导致方法过大的情况；
- 不要求业务方重写 SQL。

但它处理问题的时间点偏后。此时表达式已经完成合并，庞大的 Java 源码也已经生成。拆分器需要继续分析、改写、递归检查并重新编译这些代码。

在我们的业务场景中，这条路径存在显著代价：

- 超大源码本身会占用大量临时内存；
- 递归拆分和重复编译增加 CPU 开销；
- 大量短生命周期对象可能触发频繁 GC；
- 任务提交时间可能从秒级上升到分钟级；
- 即使最终提交成功，用户也很难判断任务是在处理还是已经卡住。

这里需要说明：提交耗时达到数十分钟是特定复杂 SQL 和运行环境下的业务观测，并不代表所有 Code Splitter 场景都会出现相同问题。

## 六、核心方案：用逻辑屏障打断投影合并

既然问题来自连续 Project 被合并，那么最直接的做法就是让这些 Project **不再连续**。

我们的系统在 Flink 之前还有一层面向业务的前置 SQL 优化器。它理解特征加工节点和业务拓扑，因此可以在检测到高风险投影链时，插入一个不产生实际外部输出的逻辑 Sink 节点，作为优化边界。

插入前：

```text
Project C
  └─ Project B
       └─ Project A
            └─ Source

RBO 可能将 A、B、C 合并成一个超大 Project。
```

插入后：

```text
Project C
  └─ Logical Sink Barrier
       └─ Project B
            └─ Project A
                 └─ Source

Project Merge 无法跨越 Barrier 继续匹配。
```

这里的 Sink 是前置优化器中的**逻辑屏障节点**，不连接真实外部表，也不产生业务输出。它的目的不是把中间结果写入存储，而是改变关系计划的节点结构，使下游优化器无法把屏障两侧的投影合并成同一个巨大方法。

这一点非常重要：在标准 Flink 或 Spark SQL 中，不能随意在查询中插入普通 Sink 并假设语义不变。该方案依赖自研前置优化器对逻辑节点的识别、转换和消除能力。

## 七、业务优化器如何落地？

### 1. 找到高风险投影链

最稳妥的方式不是只统计 SQL 字符数，而是分析逻辑计划。可以为每条连续 Project 链记录：

- 连续 Project 层数；
- 输出字段数量；
- 表达式树节点数量；
- `CASE WHEN` 分支数量；
- UDF 和内置函数调用数量；
- 同一复杂表达式被上层引用的次数；
- 过滤条件数量及嵌套深度。

这些指标可以组合成风险分数：

```text
riskScore =
    projectDepth        × w1
  + expressionNodeCount × w2
  + caseBranchCount      × w3
  + repeatedRefCount     × w4
  + functionCallCount    × w5
```

权重和阈值应来自真实失败样本，而不是凭经验一次写死。第一版也可以先使用保守阈值，再通过线上观测逐步校准。

### 2. 在合适位置插入屏障

屏障不能随便插。通常应优先选择：

- 累积表达式复杂度即将超过阈值的位置；
- 业务节点之间天然存在阶段边界的位置；
- 复用度高、继续展开会造成大量复制的位置；
- 不会破坏字段血缘和类型信息的位置。

概念伪代码如下：

```java
RelNode optimize(RelNode root) {
    PlanMetrics metrics = analyzer.analyze(root);
    if (!metrics.hasCodegenRisk()) {
        return root;
    }

    List<RelNode> breakpoints = selector.chooseBreakpoints(metrics);
    RelNode rewritten = barrierInjector.inject(root, breakpoints);

    validator.checkSchemaEquivalent(root, rewritten);
    validator.checkNoExternalSink(rewritten);
    return rewritten;
}
```

### 3. 采用“预检 + 失败重试”两级策略

仅靠静态复杂度估算难以精确对应最终字节码大小。工程上可以设计两级保护：

1. **预检阶段**：复杂度明显超阈值时，直接插入屏障；
2. **兜底阶段**：首次编译捕获明确的 `Method code too large` 类错误，带屏障重新规划并重试一次。

兜底重试必须只匹配已知错误，不能把所有编译异常都吞掉，否则真实的 UDF、类型或语法问题会被误判为 64 KB 超限。

### 4. 保证规则幂等

优化规则应当是幂等的：同一计划运行多次，不应不断插入新的屏障。可以给节点增加内部标记，或者在插入前检查相邻路径上是否已经存在 Barrier。

```text
optimize(plan) == optimize(optimize(plan))
```

如果不保证幂等，失败重试和多阶段优化可能生成越来越复杂的计划，反而制造新的问题。

## 八、为什么这个方案巧妙？

它的关键不是使用了多复杂的算法，而是选择了更合适的干预层次。

Code Splitter 的思路是：

```text
代码已经过大 → 分析超大代码 → 递归拆成小方法
```

业务优化器的思路是：

```text
识别会导致代码膨胀的业务计划 → 提前阻止过度合并 → 生成规模可控的代码
```

后者利用了业务优化器对 SQL 结构和特征拓扑的理解，把一个通用编译器问题转换成更容易处理的关系计划问题。它有几个明显优势：

- 避免先生成超大代码再做昂贵拆分；
- 改写范围小，只影响高风险投影链；
- 不要求业务方理解 JVM 字节码限制；
- 不需要人工重写大量历史 SQL；
- 可以在任务提交前给出明确的命中日志和诊断信息。

本质上，这是用**领域知识换取通用算法难以获得的效率**。

## 九、方案的代价与边界

任何优化规则都有代价。阻止 Project Merge 也可能减少算子融合机会，因此必须控制使用范围。

### 1. 可能降低正常 SQL 的运行效率

对原本不会超限的 SQL 插入过多屏障，可能增加方法调用、对象传递或执行阶段。因此规则应只针对已达到风险阈值的计划，而不是全局关闭 Project Merge。

### 2. 必须证明语义等价

改写前后至少要验证：

- 输出字段名称、类型和顺序一致；
- 空值语义一致；
- 确定性表达式计算结果一致；
- 屏障不会产生外部 I/O；
- 字段血缘和权限校验信息不丢失。

对于非确定性函数、时间函数和有副作用的 UDF，应单独测试，因为改变表达式融合与求值位置可能影响调用次数或结果。

### 3. 这是架构能力，不是 SQL 小技巧

方案依赖前置业务优化器和下游计算引擎之间的计划协议。如果直接使用原生 Flink/Spark，没有相应扩展点和节点转换逻辑，就不能照搬“插入空 Sink”。这时更现实的选择仍然是简化 SQL、拆分作业、物化中间结果或使用框架自带的代码拆分机制。

## 十、如何验证优化真的有效？

不能只以“任务终于跑起来了”作为验收标准。建议建立四组对比指标。

### 1. 正确性

- 改写前后的输出 Schema 是否一致；
- 在可运行的中小样本上，结果是否逐行一致；
- 包含空值、边界值和异常值时是否一致；
- UDF、时间函数和非确定性表达式是否符合预期。

### 2. 编译与提交

- 最大生成方法的字节码大小；
- 生成 Java 源码的总长度；
- Code Generation 耗时；
- 编译耗时；
- 从提交到进入运行态的总时间。

### 3. 资源开销

- 提交进程的峰值堆内存；
- Young GC / Full GC 次数和停顿时间；
- 临时对象分配速率；
- 失败重试次数。

### 4. 运行性能

- 吞吐量和端到端延迟；
- CPU 使用率；
- 反压情况；
- 屏障前后算子调用开销。

理想结果是：高风险 SQL 的提交时间显著下降且不再触发 64 KB 限制，同时普通 SQL 不命中规则，运行性能基本不受影响。

## 十一、线上可观测性设计

一条自动生效的优化规则必须“看得见”。每次命中时建议记录：

```text
rule_name=projection_codegen_barrier
query_id=...
project_depth_before=...
expression_nodes_before=...
barrier_count=...
trigger=precheck|compile_retry
compile_time_before_ms=...
compile_time_after_ms=...
```

同时提供原始计划和改写后计划的摘要，但日志中要避免输出敏感 SQL 常量。这样既能解释规则为什么生效，也能快速定位误判和性能回退。

## 十二、总结

这次故障可以压缩成四层结论：

1. Flink 和 Spark 通过 Code Generation 提升执行效率，但生成代码仍受 JVM Class 文件规范约束；
2. 复杂特征 SQL 中，连续投影在 RBO 阶段被合并，可能造成表达式递归展开；
3. 超大表达式最终可能生成超过 64 KB 的单个方法，导致任务在编译或提交阶段失败；
4. 在具备前置业务优化器的架构中，可以插入无外部输出的逻辑屏障，打断投影合并，从源头控制生成代码规模。

这个方案最有价值的地方，是它没有继续和膨胀后的代码搏斗，而是回到问题产生之前，用业务语义改变优化器的选择。面对非常深层的框架限制时，业务优化器不只是做 SQL 美化或规则替换，它还可以成为隔离底层复杂度、保护生产稳定性的关键一层。

## 参考资料

- [JVM 规范：The Code Attribute](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-4.html#jvms-4.7.3)
- [FLINK-23007：Split generated code to avoid 64 KB method limitation](https://issues.apache.org/jira/browse/FLINK-23007)
- [Apache Calcite ProjectMergeRule](https://calcite.apache.org/javadocAggregate/org/apache/calcite/rel/rules/ProjectMergeRule.html)
