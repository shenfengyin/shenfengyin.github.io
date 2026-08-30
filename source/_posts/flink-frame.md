---
title: "Flink运行时架构"
date: "2023-12-17 02:40:00"
updated: "2023-12-17 03:00:00"
categories:
  - "Flink"
tags:
  - "Flink"
  - "分布式架构"
recovery_source: "https://shenfengyin.github.io/2024/01/15/flink-frame/"
recovery_branch: "master"
---
# Flink运行时架构

> 本文主要介绍Flink的架构，涉及具体源码请移步源码解析。一句话总结——**Flink是一个分布式的并行流处理系统**。

Flink作为如今最为热门的流处理框架，从批处理到Lambda架构再到Flink的问世，对比总结Flink的优点无非以下几点：

-   **高吞吐和低延迟**。每秒处理数百万个事件，毫秒级延迟。
    
-   结果的准确性。Flink 提供了事件时间（event-time）和处理时间（processing-time）语义。对于乱序事件流，事件时间语义仍然能提供一致且准确的结果。
    
-   **精确一次（exactly-once）的状态一致性保证。**
    
-   可以连接到最常用的存储系统，如 Apache Kafka、Apache Cassandra、Elasticsearch、JDBC、Kinesis 和（分布式）文件系统，如 HDFS 和 S3。
    
-   高可用。本身高可用的设置，**加上与 K8s，YARN 和 Mesos 的紧密集成**，再加上从故障中快速恢复和动态扩展任务的能力，Flink 能做到以极少的停机时间 7×24 全天候运行。
    
-   能够更新应用程序代码并将作业（jobs）迁移到不同的 Flink 集群，而不会丢失应用程序的状态。（待。。。
    

## 一、 Flink系统架构

![image-20231216224323919](image-20231216224323919.png)

<center>图1：Flink作业提交和任务处理系统</center>

​ 这里首先要说明一下“客户端”。**其实客户端并不是处理系统的一部分，它只负责作业的提交。**具体来说，就是调用程序的 main 方法，**将代码转换成“数据流图”（Dataflow Graph），并最终生成作业图（JobGraph），一并发送给 JobManager**。提交之后，任务的执行其实就跟客户端没有关系了；我们可以在客户端选择断开与 JobManager 的连接, 也可以继续保持连接。之前我们在命令提交作业时，加上的-d 参数，就是表示分离模式（detached mode)，也就是断开连接。

​ 当然，客户端可以随时连接到 JobManager，获取当前作业的状态和执行结果，也可以发送请求取消作业。不论通过 Web UI 还是命令行执行“flink run”的相关操作，都是通过客户端实现的。

JobManager 和 TaskManagers 可以以不同的方式启动：

1.  作为独立（Standalone）集群的进程，直接在机器上启动
    
2.  在容器中启动
    
3.  由资源管理平台调度启动，比如 YARN、K8S
    

​ 这其实就对应着不同的部署方式。TaskManager 启动之后，JobManager 会与它建立连接，并将作业图（JobGraph）转换成可执行的“执行图”（ExecutionGraph）分发给可用的 TaskManager，然后就由 TaskManager 具体执行任务。

​ 上面的Flink作业提交和任务处理系统图只做一个简单的介绍，对于JobManager、JobMaster、TaskManager、ResourceManager、Dispatcher下面做简单介绍，详细介绍在源码解析中。

### 1.1 作业管理器（JobManager）

​ JobManager 是一个 Flink 集群中任务管理和调度的核心，是**控制应用执行的主进程**。也就是说，每个应用都应该被唯一的 JobManager 所控制执行。

​ 当然，在高可用（HA）的场景下，可能会出现多个 JobManager；这时只有一个是正在运行的领导节点（leader），其他都是备用节点（standby）。JobManger 又包含 3 个不同的组件，下面我们一一讲解：

1.  JobMaster

​ **JobMaster 是 JobManager 中最核心的组件，负责处理单独的作业（Job）**。所以 JobMaster和具体的 Job 是一一对应的，多个 Job 可以同时运行在一个 Flink 集群中, 每个 Job 都有一个自己的 JobMaster。需要注意在早期版本的 Flink 中，没有 JobMaster 的概念；而 JobManager的概念范围较小，实际指的就是现在所说的 JobMaster。

​ **在作业提交时，JobMaster 会先接收到要执行的应用。这里所说“应用”一般是客户端提交来的，包括：Jar 包，数据流图（dataflow graph），和作业图（JobGraph）（sql呢？？？。**JobMaster 会把 JobGraph 转换成一个物理层面的数据流图，这个图被叫作“执行图”（ExecutionGraph），它包含了所有可以并发执行的任务。

​ JobMaster 会向资源管理器（ResourceManager）发出请求，申请执行任务必要的资源。**一旦它获取到了足够的资源，就会将执行图分发到真正运行它们的 TaskManager 上。**

​ 而在运行过程中，JobMaster 会负责所有需要中央协调的操作，比如说检查点（checkpoints）的协调。

2.  资源管理器（ResourceManager）

​ ResourceManager 主要负责资源的分配和管理，在 Flink 集群中只有一个。所谓“资源”，主要是指 TaskManager 的任务槽（task slots）。任务槽就是 Flink 集群中的资源调配单元，包含了机器用来执行计算的一组 CPU 和内存资源。**每一个任务（Task）都需要分配到一个 slot 上执行。**（这里注意task可以空间上共享slot，类似并发）

​ 这里注意要把 Flink 内置的 ResourceManager 和其他资源管理平台（比如 YARN）的ResourceManager 区分开。Flink 的 ResourceManager，针对不同的环境和资源管理平台（比如 Standalone 部署，或者YARN），有不同的具体实现。在 Standalone 部署时，因为 TaskManager 是单独启动的（没有Per-Job 模式），所以 ResourceManager 只能分发可用 TaskManager 的任务槽，不能单独启动新TaskManager。

​ 而在有资源管理平台时，就不受此限制。当新的作业申请资源时，ResourceManager 会将有空闲槽位的 TaskManager 分配给 JobMaster。如果 ResourceManager 没有足够的任务槽，它还可以向资源提供平台发起会话，请求提供启动 TaskManager 进程的容器。另外，ResourceManager 还负责停掉空闲的 TaskManager，释放计算资源。

3.  分发器（Dispatcher）
    
    > 1.  接受用户作业 2. 启动jobMaster
    

​ **Dispatcher 主要负责提供一个 REST 接口，用来提交应用，并且负责为每一个新提交的作业启动一个新的 JobMaster 组件**。Dispatcher 也会启动一个 Web UI，用来方便地展示和监控作业执行的信息。**Dispatcher 在架构中并不是必需的**，在不同的部署模式下可能会被忽略掉。

### 1.2 任务管理器（TaskManager）

​ **TaskManager 是 Flink 中的工作进程，数据流的具体计算就是它来做的，所以也被称为“Worker”**。Flink 集群中必须至少有一个 TaskManager；当然由于分布式计算的考虑，通常会有多个 TaskManager 运行，每一个 TaskManager 都包含了一定数量的任务槽（task slots）。**Slot是资源调度的最小单位，slot 的数量限制了 TaskManager 能够并行处理的任务数量。**

​ 启动之后，TaskManager 会向资源管理器注册它的 slots；**收到资源管理器的指令后，TaskManager 就会将一个或者多个槽位提供给 JobMaster 调用，JobMaster 就可以分配任务来执行了。**在执行过程中，TaskManager 可以缓冲数据，还可以跟其他运行同一应用的 TaskManager交换数据。

## 二、 Flink作业提交流程

Flink作业根据部署模式、资源管理平台的不同，有不同的作业提交流程，首先介绍下抽象的流程：

### 2.1 抽象作业提交流程

![image-20231216233932729](image-20231216233932729.png)

<center>Flink作业提交流程</center>

（1） 一般情况下，由客户端（App）通过分发器提供的 REST 接口，将作业提交给JobManager。

（2）由分发器启动 JobMaster，并将作业（包含 JobGraph）提交给 JobMaster。

（3）**JobMaster 将 JobGraph 解析为可执行的 ExecutionGraph**，得到所需的资源数量，然后向资源管理器请求资源（slots）。

（4）资源管理器判断当前是否由足够的可用资源；如果没有，启动新的 TaskManager。

（5）TaskManager 启动之后，向 ResourceManager 注册自己的可用任务槽（slots）。

（6）资源管理器通知 TaskManager 为新的作业提供 slots。

（7）TaskManager 连接到对应的 JobMaster，提供 slots。

（8）JobMaster 将需要执行的任务分发给 TaskManager。

（9）TaskManager 执行任务，互相之间可以交换数据。

​ 如果部署模式不同，或者集群环境不同（例如 Standalone、YARN、K8S 等），其中一些步骤可能会不同或被省略，也可能有些组件会运行在同一个 JVM 进程中。比如我们在上一章实践过的独立集群环境的会话模式，就是需要先启动集群，如果资源不够，只能等待资源释放，而不会直接启动新的 TaskManager。

### 2.2 yarn集群部署模式

下面两张图对比独立模式和yarn集群的区别，其实主要就是资源分配的区别：

![image-20231217000352858](image-20231217000352858.png)

![image-20231217000418508](image-20231217000418508.png)

​ 在**独立模式**（Standalone）下，只有**会话模式和应用模式**两种部署方式。两者整体来看流程是非常相似的：**TaskManager 都需要手动启动，所以当 ResourceManager 收到 JobMaster 的请求时，会直接要求 TaskManager 提供资源。**而 JobMaster 的启动时间点，会话模式是预先启动，应用模式则是在作业提交时启动。

**yarn集群会话**（session）模式：

（1）客户端通过 REST 接口，将作业提交给分发器。

（2）分发器启动 JobMaster，并将作业（包含 JobGraph）提交给 JobMaster。

（3）JobMaster 向资源管理器请求资源（slots）。

（4）资源管理器向 YARN 的资源管理器请求 container 资源。

（5）**YARN 启动新的 TaskManager 容器**。

（6）TaskManager 启动之后，向 Flink 的资源管理器注册自己的可用任务槽。

（7）资源管理器通知 TaskManager 为新的作业提供 slots。

（8）TaskManager 连接到对应的 JobMaster，提供 slots。

（9）JobMaster 将需要执行的任务分发给 TaskManager，执行任务。

​ 可见，整个流程除了请求资源时要“上报”YARN 的资源管理器，其他与独立模式几乎一样，**yarn会话模式帮助我们管理TM，而不需要我们手动启动TM**。

​ yarn会话模式还有一点需要注意的是：在**会话模式下，我们需要先启动一个 YARN session，这个会话会创建一个 Flink 集群**。

![image-20231217001306829](image-20231217001306829.png)

​ 可以发现刚启动YARN session的时候，JobManager只有ResourceManager和Dispatcher，**并没有JobMaster，因为此时并没有Flink任务提交，自然无需JobMaster调度TM**。同时这里只启动了 JobManager，而 TaskManager 可以根据需要动态地启动（yarn控制？）。

**yarn单作业**（per-job）模式：

与session模式最大区别在于——**在单作业模式下，Flink 集群不会预先启动，而是在提交作业时，才启动新的 JobManager**，如图所示：

![image-20231217002139143](image-20231217002139143.png)

（1）客户端将作业提交给 YARN 的资源管理器，这一步中会同时将 Flink 的 Jar 包和配置

上传到 HDFS，以便后续启动 Flink 相关组件的容器。

（2）YARN 的资源管理器分配 Container 资源，启动 Flink JobManager，并将作业提交给JobMaster。这里省略了 Dispatcher 组件。

（3）JobMaster 向资源管理器请求资源（slots）。

（4）资源管理器向 YARN 的资源管理器请求 container 资源。

（5）YARN 启动新的 TaskManager 容器。

（6）TaskManager 启动之后，向 Flink 的资源管理器注册自己的可用任务槽。

（7）资源管理器通知 TaskManager 为新的作业提供 slots。

（8）TaskManager 连接到对应的 JobMaster，提供 slots。

（9）JobMaster 将需要执行的任务分发给 TaskManager，执行任务。

​ 可见，区别**只在于 JobManager 的启动方式，以及省去了分发器**。当第 2 步作业提交给JobMaster，之后的流程就与会话模式完全一样了。

一般互联网用的是pre-job模式？也就是说，每次提交一个 Flink SQL 作业，都会创建一个对应的作业实例，并在 YARN 上分配资源来运行该实例？

使用 per-job 模式的原因包括：

1.  资源隔离：每个作业会有自己独立的资源分配，这样可以确保作业之间不会相互影响，提高了资源利用效率。
2.  灵活性和控制：per-job 模式允许每个作业运行时可以独立地配置参数，比如内存分配、并行度等，从而更好地控制每个作业的运行环境。
3.  故障隔离：当一个作业发生故障时，per-job 模式可以确保这个故障不会影响到其他作业，提高了整体系统的稳定性和可靠性。

总的来说，per-job 模式可以提供更好的资源隔离、灵活性和故障隔离，使得每个作业可以更加独立地运行和管理。

​ 还有一种应用（application）模式，与单作业模式的提交流程非常相似，只是初始提交给 YARN 资源管理器的不再是具体的作业，而是整个应用。一个应用中可能包含了多个作业，这些作业都将在 Flink 集群中启动各自对应的 JobMaster。

​ 整体来说，YARN 上部署的过程是：**客户端把 Flink 应用提交给 Yarn 的 ResourceManager, Yarn 的 ResourceManager 会向 Yarn 的 NodeManager 申请容器。在这些容器上，Flink 会部署JobManager 和 TaskManager 的实例，从而启动集群。**Flink 会根据运行在 JobManger 上的作业所需要的 Slot 数量动态分配 TaskManager 资源。 关于NodeManager等信息可以了解下Hadoop架构，待。。。

## 三、 FLink数据流图

> 介绍Dataflow Graph方便更深入理解所谓“流处理”到底是怎么抽象实现的。

​ Flink 是流式计算框架。它的程序结构，其实就是定义了一连串的处理操作，每一个数据输入之后都会依次调用每一步计算。在 Flink 代码中，**我们定义的每一个处理转换操作都叫作“算子”（Operator）**，所以我们的程序可以看作是一串算子构成的管道，数据则像水流一样有序地流过。 以wordcount举例说明：

```java
public class StreamWordCount {
    public static void main(String[] args) throws Exception {
        // 1. 创建流式执行环境
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        // 2. 读取文本流
        DataStreamSource<String> lineDSS = env.socketTextStream("hadoop102", 7777);
        // 3. 转换数据格式
        SingleOutputStreamOperator<Tuple2<String, Long>> wordAndOne = lineDSS
                .flatMap((String line, Collector<String> words) -> {
                    Arrays.stream(line.split(" ")).forEach(words::collect);
                })
                .returns(Types.STRING)
                .map(word -> Tuple2.of(word, 1L))
                .returns(Types.TUPLE(Types.STRING, Types.LONG));
        // 4. 分组
        KeyedStream<Tuple2<String, Long>, String> wordAndOneKS = wordAndOne
                .keyBy(t -> t.f0);
        // 5. 求和
        SingleOutputStreamOperator<Tuple2<String, Long>> result = wordAndOneKS
                .sum(1);
        // 6. 打印
        result.print();
        // 7. 执行
        env.execute();
    }
}
```

所有的 Flink 程序都可以归纳为由三部分构成：Source、Transformation 和 Sink。

-   Source 表示“源算子”，负责读取数据源。
    
-   transformation 表示“转换算子”，利用各种算子进行处理加工。
    
-   Sink 表示“下沉算子”，负责数据的输出。
    

​ source、sink算子见名知意，transformation算子相对来说就复杂一点。以上面wordcount来看，flatMap、map、sum都是transformation算子。**但是这里的keyBy并不是算子，因为一个中间的转换算子（Transformation Operator）必须是一个转换处理的操作；而在代码中有一些方法调用，数据是没有完成转换的。**可能只是对属性做了一个设置，也可能定义的是数据的传递方式而非转换，又或者是需要几个方法合在一起才能表达一个完整的转换操作。

​ 事实上也可以根据返回值的类型判断，可以看出flatMap、map、sum它们的返回值都是Operator类，而keyBy这里是KeyedStream，可以简单看下继承关系：

![image-20231217010522064](image-20231217010522064.png)

​ 可以看出KeyedStream和SingleOutputStreamOperator都是DataStream，而且两个是兄弟关系，KeyedStream不是Operator，关于DataStream API详细可以看Flink DataStream API介绍。 待。。。。。。。。

### 3.1 并行计算

​ 在介绍Flink的DAG内部转化之前，首先需要介绍一个基本概念——并行度Parallelism。

​ 上面已经说了，Flink任务可以看做成source—transformation—sink这样一个个算子相连的数据处理过程。对于单独一个数据而言，这个数据处理过程显然是没法并行的。对于单个数据而言，不可能说source和sink并行，因为只有经历了source和transformation才可以执行sink算子。所以说**并行只针对多条数据而言**！

​ 那我们这里说的并行是什么呢？

​ **其实Flink中的并行指的是“数据并行”——多条数据同时到来，我们应该可以同时source读入，同时在不同节点执行 flatMap 等transformation操作。**

​ 怎样实现数据并行呢？其实也很简单，**我们把一个算子操作，“复制”多份到多个节点，数据来了之后就可以到其中任意一个执行。**这样一来，**一个算子任务就被拆分成了多个并行的“子任务”（subtasks），再将它们分发到不同节点，就真正实现了并行计算。**在 Flink 执行过程中，**每一个算子（operator）可以包含一个或多个子任务（operator subtask），这些子任务在不同的线程、不同的物理机或不同的容器中完全独立地执行。**

​ **我们通过拆分算子的形式实现数据并行**：

![image-20231217012240834](image-20231217012240834.png)

### 3.2 算子链

​ 数据流在算子之间传输数据的形式可以是一对一（one-to-one）的直通 (forwarding)模式，也可以是打乱的重分区（redistributing）/shuffle模式，具体是哪一种形式，取决于算子的种类。

​ 如上图source-map之间为forwarding模式，但是map-…-sink是redistributing模式。

​ 在 Flink 中，并行度相同的一对一（one to one）算子操作，可以直接链接在一起形成一个“大”的任务（task），这样原来的算子就成为了真正任务里的一部分，**如上图所示，source1和map1会作为一个task，最终会被一个线程执行**。这样的技术被称为“算子链”（Operator Chain）。

​ Flink 为什么要有算子链这样一个设计呢？这是因为将算子链接成 task 是非常有效的优化：**可以减少线程之间的切换和基于缓存区的数据交换，在减少时延的同时提升吞吐量。**

### 3.3 Logic StreamGraph→ Physical Graph

​ **由 Flink 程序直接映射成的数据流图（dataflow graph），也被称为逻辑流图（logical StreamGraph）**，因为它们表示的是计算逻辑的高级视图。

​ 到具体执行环节时，我们还要考虑并行子任务的分配、数据在任务间的传输，以及合并算子链的优化。为了说明最终应该怎样执行一个流处理程序，**Flink 需要将逻辑流图进行解析，转换为物理数据流图。**

**逻辑流图（StreamGraph）→ 作业图（JobGraph）→ 执行图（ExecutionGraph）→ 物理图（Physical Graph）**

![image-20231217013739113](image-20231217013739113.png)

1.  逻辑流图（StreamGraph） 生成DAG

​ 这是根据用户通过 DataStream API 编写的代码生成的最初的 DAG 图，用来表示程序的拓扑结构。**这一步一般在客户端完成。**

我们可以看到，逻辑流图中的节点，完全对应着代码中的四步算子操作：源算子 Source（socketTextStream()）→扁平映射算子 Flat Map(flatMap()) →分组聚合算子Keyed Aggregation(keyBy/sum()) →输出算子 Sink(print())。

2.  作业图（JobGraph） 实现算子链优化

​ StreamGraph 经过优化后生成的就是作业图（JobGraph），**这是提交给 JobManager 的数据结构，确定了当前作业中所有任务的划分。**主要的优化为: 将多个符合条件的节点链接在一起合并成一个任务节点，**形成算子链**，这样可以减少数据交换的消耗。**JobGraph 一般也是在客户端生成的，在作业提交时传递给 JobMaster。**

3.  执行图（ExecutionGraph） 实现并行度

​ **JobMaster 收到 JobGraph 后，会根据它来生成执行图（ExecutionGraph）**。ExecutionGraph是 JobGraph 的**并行化**版本，是调度层最核心的数据结构。

​ **与 JobGraph 最大的区别就是按照并行度对并行子任务进行了拆分，并明确了任务间数据传输的方式。**待。。。。

4.  物理图（Physical Graph）

​ **JobMaster 生成执行图后， 会将它分发给 TaskManager；各个 TaskManager 会根据执行图部署任务，最终的物理执行过程也会形成一张“图”，一般就叫作物理图（Physical Graph）**。这只是具体执行层面的图，并不是一个具体的数据结构。物理图主要就是在执行图的基础上，进一步确定数据存放的位置和收发的具体方式。有了物理图，TaskManager 就可以对传递来的数据进行处理计算了。

​ 所以我们可以看到，程序里定义了四个算子操作：源（Source）->转换（flatMap）->分组聚合（keyBy/sum）->输出（print）；合并算子链进行优化之后，就只有三个任务节点了；再考虑并行度后，一共有 5 个并行子任务，最终需要 5 个线程来执行。

## 四、任务槽（task slot）

​ 上面主要介绍了Flink任务提交流程和数据流图的变化，我们可以了解到Flink在着期间做了并行计算，比如上面的wordcount，最后对应了5个subtask、5个线程来并行处理数据。

​ 但是对于TaskManager，我们上面介绍了是一个工作进程，那么TM进程和上面说的并行计算的线程怎么对应呢？**一个TM有几个线程？一个wordcount对应一个JM，那么对应几个TM呢？实际上这其中的关系是由slot进行联系的。**

​ 之前已经提到过，Flink 中每一个 worker(也就是 TaskManager)都是一个 JVM 进程，它可以启动多个独立的线程，来并行执行多个子任务（subtask）。所以**如果想要执行 5 个任务，并不一定非要 5 个 TaskManager，我们可以让 TaskManager多线程执行任务。**如果可以同时运行 5 个线程，那么只要一个 TaskManager 就可以满足我们之前程序的运行需求了。

​ **但是TaskManager 的计算资源是有限的，并不是所有任务都可以放在一个 TaskManager上并行执行。并行的任务越多，每个线程的资源就会越少。**

​ **那一个 TaskManager 到底能并行处理多少个任务呢？**

​ 为了**控制并发量**，我们需要在 TaskManager 上对每个任务运行所占用的资源做出明确的划分，这就是所谓的任务槽（task slots）。

![image-20231217022548524](image-20231217022548524.png)

​ 假如一个 TaskManager 有三个 slot，**那么它会将管理的内存平均分成三份**，每个 slot 独自占据一份。这样一来，我们在 slot 上执行**一个子任务时，相当于划定了一块内存“专款专用”，就不需要跟来自其他作业的任务去竞争内存资源了**。所以现在我们只要 2 个 TaskManager，就可以并行处理分配好的 5 个任务了。

​ **TM设置多个slot，意味着多个子任务可以共享一个JVM。意味着在同一个 JVM 进程中运行的任务，将共享 TCP 连接和心跳消息，也可能共享数据集和数据结构，这就减少了每个任务的运行开销，在降低隔离级别的同时提升了性能。**

​ slot 目前仅仅用来隔离内存，不会涉及 CPU 的隔离。在具体应用时，可以将 slot 数量配置为机器的 CPU 核心数，尽量避免不同任务之间对 CPU 的竞争。这也是开发环境默认并行度设为机器 CPU 数量的原因。

​ 但是上面我们介绍的都是slot充足的理想状况，如果当前只有2个TM，各包含3个slot，那么对于分为13个subtask的任务应该怎么办呢？

![image-20231217023352283](image-20231217023352283.png)

如上图所示，我们可以让多个子任务共享slot。

​ 当我们**将资源密集型和非密集型的任务同时放到一个 slot 中，它们就可以自行分配对资源占用的比例，**从而保证最重的活平均分配给所有的TaskManager。 待。。。。。。。。。。。。

flink中一个slot中被source1和keyby1两个子任务共享，请问它们的共享是可以同时运行吗？还是说空间上共享，时间上是串行的？待。。。。。。。。

​ **slot 共享另一个好处就是允许我们保存完整的作业管道。**这样一来，即使某个 TaskManager出现故障宕机，其他节点也可以完全不受影响，作业的任务可以继续执行。

​ 另外，**同一个任务节点的并行子任务是不能共享 slot 的**，所以允许 slot 共享之后，运行作业所需的 slot 数量正好就是作业中所有算子并行度的最大值。这样一来，我们考虑当前集群需要配置多少 slot 资源时，就不需要再去详细计算一个作业总共包含多少个并行子任务了，只看最大的并行度就够了。

> 这里肯定不能让“数据并行”（即是并行子任务）的任务放到一个slot，否则就不叫并行了
