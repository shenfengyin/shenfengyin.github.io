---
title: "使用hexo搭建离线博客"
date: "2023-10-04 15:30:00"
updated: "2023-10-05 03:13:47"
published: false
tags:
  - "博客搭建"
  - "hexo"
recovery_source: "https://shenfengyin.github.io/2024/01/15/hexo-butterfly/"
recovery_branch: "master"
---
使用hexo搭建离线博客

## 环境搭建

### 介绍

静态博客：  
编写文档格式文件（如.md文件），通过生成工具编译成最终的hml、css、js等静态文件，  
然后部署在静态Server服务器上或Web托管至数据仓库（如：Github），本博客搭建采用的的就是这种方法——  
**基于hexo框架生成静态网页，然后托管至Github**

优点：

-   简单高效——Hexo 是一个基于Node.js的快速、简洁且高效的静态博客框架，具有丰富的主题、插件系统，部署简单、成本低廉、运行优化非常高效。
-   安全性好——Hexo 框架的博客网站没有网站后台，不存在后台安全漏洞的问题。
-   无需服务器——输入.github.io就可以直接访问，同时支持pc端、手机端，无需额外购买服务器和域名（当然也可以部署在服务器上）

### 本地配置

提前安装好Hexo、git、WebStorm、node.js  
fy搭建的时候用的是mac，windows的话也建议用虚拟机搭建环境，上述安装步骤如下

#### git安装、github创建新仓库

```plaintext
仓库名必须为<username>.github.io`
`eg: fy这里用的是shenfengyin.github.io
```

[![01|left](image1.png)](https://shenfengyin.github.io/2023/10/04/hexo-building-blog/image1.png)

#### hexo安装

```plaintext
PLAINTEXT
npm install -g hexo-cli 
mkdir sfy_blog
cd sfy_blog
hexo init
ls
```

介绍下此时hexo的文件结构：

-   public 最终所见网页的所有内容
-   node\_modules 插件以及hexo所需node.js模块
-   \_config.yml 站点配置文件，设定一些公开信息等
-   package.json 应用程序信息，配置hexo运行所需js包
-   scaffolds 模板文件夹，新建文章，会默认包含对应模板内容
-   themes 存放主题文件，hexo根据主题生成静态网页（速度贼快）
-   source 用于存放用户资源（除 posts 文件夹，其余命名方式为 “ + 文件名”的文件被忽略）

#### 使用WebStorm，部署到github

在WebStorm中打开sfy-blog ，打开终端并输入命令  
`hexo s`  
得到hexo-building-blog

[![img](02.png)](https://shenfengyin.github.io/2023/10/04/hexo-building-blog/02.png)

进入 [http://localhost:4000/](http://localhost:4000/) 得到博客网站雏型。

#### 主题butterfly介绍

上述hexo生成的只是一个不太完善的网站框架，需要再次填充。  
首先需要理解一下**框架**和**主题**的关系。  
把hexo比做成一个待装修房间的话，butterfly这样的主题就类似于“简约风装修主题”，通过它才能真正填充完善我们的博客网站。  
其他主题也很不错，这里fy用butterfly作为博客主题，大家可以去hexo官网上搜索合适的themes。

#### 主题butterfly安装

当前博客项目目录下，安装butterfly  
`git clone -b master https://gitee.com/immyw/hexo-theme-butterfly.git themes/butterfly`  
安装相关插件  
`npm install hexo-renderer-pug hexo-renderer-stylus --save`  
配置文件应用butterfly  
网站根目录下找到\_config.yml文件，修改主题为butterfly，  
并且把butterfly文件夹下的\_config.yml拷贝到项目第一级目录下，改名为\_config.butterfly.yml，如下

[![img](03.png)](https://shenfengyin.github.io/2023/10/04/hexo-building-blog/03.png)  
后续修改就在\_config.butterfly.yml上进行。

#### 最终部署上github

把本地项目push到仓库.github.io中最后就部署成功了！  
（Settings-Pages有域名解析，可不管)

```plaintext
PLAINTEXT
hexo clean //执行此命令后继续下一条
hexo g //生成博客目录
hexo s //本地预览
hexo d //部署上github
```

到此，就可以直接浏览器输入.github.io直接浏览了。

#### 后续完善

此时到这里，网站基本搭好了，后续务必看这官方文档说明（有中文版）  
特别的，注意页面配置和文章页配置，有时间的话，fy会出一期说明，但是参考文档会更详细：  

-   hexo doc：[https://hexo.io/zh-cn/docs/](https://hexo.io/zh-cn/docs/)
-   butterfly doc：[https://butterfly.js.org/posts/dc584b87/](https://butterfly.js.org/posts/dc584b87/)
-   ref blog: [https://www.fomal.cc/posts/3451f874.html](https://www.fomal.cc/posts/3451f874.html)

**后续内容建议阅读butterfly官方文档和一些参考博客👆👆👆**

## Front-matter

-   Page Front-matter 用于页面配置
-   Post Front-matter 用于文章页配置

### Page Front-matter

| 字段 | 字段说明 |
| --- | --- |
| title | 【必需】页面标题 |
| date | 【必需】页面创建日期 |
| type | 【必需】标籤、分类和友情链接三个页面需要配置 |
| updated | 【可选】页面更新日期 |
| description | 【可选】页面描述 |
| keywords | 【可选】页面关键字 |
| comments | 【可选】显示页面评论模块(默认 true) |
| top\_img | 【可选】页面顶部图片 |
| mathjax | 【可选】显示mathjax(当设置mathjax的per\_page: false时，才需要配置，默认 false) |
| kates | 【可选】显示katex(当设置katex的per\_page: false时，才需要配置，默认 false) |
| aside | 【可选】显示侧边栏 (默认 true) |
| aplayer | 【可选】在需要的页面加载aplayer的js和css,请参考文章下面的音乐 配置 |
| highlight\_shrink | 【可选】配置代码框是否展开(true/false)(默认为设置中highlight\_shrink的配置) |

### Post Front-matter

| title | 【必需】文章标题 |
| --- | --- |
| date | 【必需】文章创建日期 |
| updated | 【可选】文章更新日期 |
| tags | 【可选】文章标籤 |
| categories | 【可选】文章分类 |
| keywords | 【可选】文章关键字 |
| description | 【可选】文章描述 |
| top\_img | 【可选】文章顶部图片 |
| cover | 【可选】文章缩略图(如果没有设置top\_img,文章页顶部将显示缩略图，可设为false/图片地址/留空) |
| comments | 【可选】显示文章评论模块(默认 true) |
| toc | 【可选】显示文章TOC(默认为设置中toc的enable配置) |
| toc\_number | 【可选】显示toc\_number(默认为设置中toc的number配置) |
| toc\_style\_simple | 【可选】显示 toc 简洁模式 |
| copyright | 【可选】显示文章版权模块(默认为设置中post\_copyright的enable配置) |
| copyright\_author | 【可选】文章版权模块的文章作者 |
| copyright\_author\_href | 【可选】文章版权模块的文章作者链接 |
| copyright\_url | 【可选】文章版权模块的文章连结链接 |
| copyright\_info | 【可选】文章版权模块的版权声明文字 |
| mathjax | 【可选】显示mathjax(当设置mathjax的per\_page: false时，才需要配置，默认 false) |
| katex | 【可选】显示katex(当设置katex的per\_page: false时，才需要配置，默认 false) |
| aplayer | 【可选】在需要的页面加载aplayer的js和css,请参考文章下面的音乐 配置 |
| highlight\_shrink | 【可选】配置代码框是否展开(true/false)(默认为设置中highlight\_shrink的配置) |
| aside | 【可选】显示侧边栏 (默认 true) |

## hexo Writing

[https://hexo.io/zh-cn/docs/writing](https://hexo.io/zh-cn/docs/writing)

你可以执行下列命令来创建一篇新文章或者新的页面。

`hexo new [layout] <title>`  
可以在命令中指定文章的布局（layout），默认为 post，可以通过修改 \_config.yml 中的 default\_layout 参数来指定默认布局。

### 布局（Layout）

Hexo 有三种默认布局：post、page 和 draft。在创建这三种不同类型的文件时，它们将会被保存到不同的路径；  
而自定义的其他布局和 post 相同，都将储存到 source/\_posts 文件夹。

| 布局 | 路径 |
| --- | --- |
| post | source/\_posts |
| page | source |
| draft | source/\_drafts |
| draft，这种布局在建立时会被保存到 source/\_drafts 文件夹， |  |
| 可通过 publish 命令将草稿移动到 source/\_posts 文件夹，该命令的使用方式与 new 十分类似， |  |
| 也可在命令中指定 layout 来指定布局。 |  |

`hexo publish [layout] <title>`  
草稿默认不会显示在页面中，可在执行时加上 –draft 参数，  
或是在 \_config.yml 中把 render\_drafts 参数设为 true 来预览草稿。

### 文件名称

Hexo 默认以标题做为文件名称，但您可编辑 new\_post\_name 参数来改变默认的文件名称，举例来说，设为 :year-:month-:day-:title.md 可让您更方便的通过日期来管理文章。你可以使用以下占位符：

| 变量 | 描述 |
| --- | --- |
| :title | 标题（小写，空格将会被替换为短杠） |
| :year | 建立的年份，比如， 2015 |
| :month | 建立的月份（有前导零），比如， 04 |
| :i\_month | 建立的月份（无前导零），比如， 4 |
| :day | 建立的日期（有前导零），比如， 07 |
| :i\_day | 建立的日期（无前导零），比如， 7 |

### 其他

1.  如果是图片加载不出来，推荐将post\_asset\_folder属性置为true，在新建博客hexo n “xxx”的时候会在根目录下创建一个同名的文件夹，将需要插入的图片放到这个目录。
