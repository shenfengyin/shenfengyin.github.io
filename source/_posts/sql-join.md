---
title: "SQL JOIN算子"
date: "2023-10-05 22:00:00"
updated: "2023-10-05 23:00:00"
categories:
  - "Flink"
tags:
  - "Flink"
  - "SQL"
  - "JOIN"
recovery_source: "https://shenfengyin.github.io/2024/01/15/sql-join/"
recovery_branch: "master"
---
## join算子

### 标准SQL的JOIN

在介绍Flink SQL中的JOIN的之前，先回顾一下标准SQL的实现。

JOIN的本质是将多表数据通过相同字段的联系进行拼接，之所以出现多表的情况，也是因为现实中不可能存在一张大表包括所有字段。

JOIN分类：

-   Cross join - 笛卡尔积（交叉）连接
-   Inner join - 内连接
-   Outer join - 外连接(left, right, full)
-   Self join - 自连接

JOIN语法：

-   SQL89——表之间用“，”逗号分割，链接条件和过滤条件都在Where子句指定：

```plaintext
SQL
SELECT 
  a.colA, 
  b.colA 
FROM  
  tab1 AS a , tab2 AS b 
WHERE a.id = b.id and a.other > b.other 
```

-   SQL92——表之间用JOIN分隔，将链接条件在ON子句指定，过滤条件在WHERE子句指定：

```plaintext
SQL
SELECT 
  a.colA, 
  b.colA 
FROM 
  tab1 AS a JOIN tab2 AS b ON a.id = b.id 
WHERE 
  a.other > b.other 
```

JOIN涉及到的rule：

在inner join的时候，可能涉及到**过Filter**和**JOIN**的组合，这里会涉及到**RULE（请看这篇博客——CALCITE：SQL OPTIMIZE，待补充）**

```plaintext
SQL
SELECT     
stu.no, stu.name , s.score
FROM student stu JOIN score s ON  stu.no = s.s_no
WHERE s.score > 80; 
```

这里简单介绍一下，上述SQL改写成先执行Filter，效率会更快

```plaintext
SQL
SELECT 
no, name , score 
FROM student stu JOIN ( SELECT s_no, score FROM score s WHERE s.score >80) as sc ON no = s_no; 
```

因为先过滤再内联的话，性能会提升很多。

当然实际上我们不需要改书写顺序，实际上数据库本身的优化器会自动进行查询优化（filter push down Rule），在内联接中ON的联接条件和WHERE的过滤条件具有相同的优先级，具体的执行顺序可以由数据库的优化器根据性能消耗决定。

特别的，外连接是没有filter push down Rule的，自行模拟一下很容易理解。

### Flink SQL的JOIN

以Flink 1.13为例，[官方文档](https://nightlies.apache.org/flink/flink-docs-release-1.13/docs/dev/table/sql/queries/joins/)有详细说明

#### 双流JOIN和传统数据库JOIN的区别

传统数据库表的JOIN是两张静态表的数据联接，在流上面是 动态表(关于流与动态表的关系请查阅 《[Apachehe Flink 漫谈系列 - 流表对偶(duality)性)](http://zhuanlan.51cto.com/art/201810/585946.htm)》，双流JOIN的数据不断流入与传统数据库表的JOIN有如下3个核心区别：

-   左右两边的数据集合无穷 - 传统数据库左右两个表的数据集合是有限的，双流JOIN的数据会源源不断的流入;
-   JOIN的结果不断产生/更新 - 传统数据库表JOIN是一次执行产生最终结果后退出，双流JOIN会持续不断的产生新的结果。在 《[Apache Flink 漫谈系列 - 持续查询(Continuous Queries)](http://zhuanlan.51cto.com/art/201811/586368.htm)》篇也有相关介绍。
-   查询计算的双边驱动 - 双流JOIN由于左右两边的流的速度不一样，会导致左边数据到来的时候右边数据还没有到来，或者右边数据到来的时候左边数据没有到来，所以在实现中要将左右两边的流数据进行保存，以保证JOIN的语义。在Blink中会以State的方式进行数据的存储。State相关请查看《[Apache Flink 漫谈系列 - State](http://zhuanlan.51cto.com/art/201810/585018.htm)》篇。

### Lateral JOIN

如下图所示，左为user\_tb，右为order\_tb

| userId | city |  | orderId | userId |
| --- | --- | --- | --- | --- |
| u1 | BJ |  | 1 | u1 |
| u2 | BJ |  | 2 | u1 |
| u3 | SH |  | 3 | u3 |

##### Cross apply

如果我要查询每个订单的user\_tb.city信息，可以用INNER JOIN

```plaintext
SQL
SELECT
    u.userid, u.city, o.orderId
FROM user_tb u JOIN order_tb o 
    ON u.userId = o.userId
```

事实上对于这种查询还有一种方法，即是LATERAL，SQL中的实现为CROSS APPLY

```plaintext
SQL
SELECT
    u.userId, u.city, o.orderId
FROM 
user_tb u CROSS APPLY (
    SELECT 
        o.orderId, o.userId
    FROM order_tb o
    WHERE o.userId = u.userId
) AS o
```

CROSS APPLY 的意思是“交叉应用”，在查询时首先遍历左表，然后右表的每一条记录跟左表的当前记录进行匹配。匹配成功则将左表与右表的记录合并为一条记录输出；匹配失败则抛弃左表与右表的记录。（与 INNER JOIN 类似）

本质上是根据左表user\_tb的userId，去查询右表的Orders信息，就像一个For循环一样，外层是遍历左表user\_tb所有数据，内层是根据左表user\_tb的每一个userId去右表Orders中进行遍历查询，然后再将符合条件的左右表数据进行JOIN，**根据左表逐条数据动态生成右表进行JOIN**。

这里很自然的会延伸一个问题——LATERAL语法看着又烦，实现结果和INNNER JOIN好像也没有区别，为什么要引入这种语法？

一方面是性能方面（待补充，通过sql server测试），一方面是在功能方面INNER JOIN本身在ANSI-SQL中是不允许 JOIN 一个Function的，这也是SQL Server当时引入CROSS APPLY的根本原因。

##### Flink lateral join

Flink 利用 Calcite进行SQL的解析和优化，目前Calcite完全支持LATERAL语法，示例如下：

```plaintext
SQL
SELECT order_id, res
FROM Orders, LATERAL TABLE(table_func(order_id)) t(res)
```

[![img](01.png)](https://shenfengyin.github.io/2023/10/05/sql-join/01.png)

参考文档：

[https://www.51cto.com/article/587210.html](https://www.51cto.com/article/587210.html)

[https://nightlies.apache.org/flink/flink-docs-release-1.13/docs/dev/table/sql/queries/joins/](https://nightlies.apache.org/flink/flink-docs-release-1.13/docs/dev/table/sql/queries/joins/)
