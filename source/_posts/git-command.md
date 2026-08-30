---
title: "Git命令介绍"
date: "2023-10-09 20:00:00"
updated: "2023-10-09 22:00:00"
categories:
  - "dev tools"
tags:
  - "Git"
  - "开发工具"
recovery_source: "https://shenfengyin.github.io/2024/01/15/git-command/"
recovery_branch: "master"
---
本文介绍了git的一些原理和命令，通过目录和树结构可以充分的理解相关命令。

## git常用命令

如果当前分支为: cur-branch

常用的不介绍了：

```plaintext
PLAINTEXT
git pull
git add .
git commit -m "message1"
git push
```

### git merge

git merge master #把master分支的更新合并到cur-branch  
git merge origin/master #把远程的master分支的更新合并到cur-branch

### git rebase

git rebase的作用是将找到当前分支和目标分支最近的节点，然后把修改记录重新rebase到目标分支的最新提交节点上。

举个常用的例子：  
当我们在自己的分支sfy/branchA上开发时，想要提MR的时候，需要保证当前分支是基于最新master的（因为你开发的时候，可能已经落后了master很多个提交）。  
因此需要进行rebase：

-   git fetch
-   git rebase origin/master #如果不加的话默认来自于改分支的父分支，可以git reflog show查看

git rebase -i 还可以修改commit历史。

### git stash

git stash命令用于保存当前工作目录的临时状态，包括暂存区和已修改但未暂存的文件。  
它会将这些修改保存在一个临时区域（即“堆栈”）中，让你能够回到一个干净的工作目录，可以进行其他操作。  
等到你完成其他任务后，可以再回到之前的状态，继续之前的开发。

使用git stash可以将当前的修改保存起来。这样你可以切换到其他分支并开始另一个任务，而无需提交或放弃你当前的修改。

以下是git stash命令的用法和一些常见的选项：

```plaintext
PLAINTEXT
1. * git stash save "message" 这将保存当前的工作目录状态到一个新的stash，并添加一条可选的消息来描述这个stash的内容。
2. git stash list 查看当前保存的所有stash列表，每个stash都有一个唯一的标识符和对应的描述信息。
3. git stash show [stash@{k} or k] 查看某个特定stash的变更内容。默认情况下，会显示最新的stash。
4. git stash apply [stash] 将某个stash的变更应用到当前工作目录。这个stash不会从stash列表中移除。如果不指定stash，默认会应用最新的stash。
5. * git stash pop [stash] 与git stash apply类似，但在应用完stash后会将该stash从stash列表中删除。
6. git stash drop [stash] 删除某个stash，从stash列表中移除。如果不指定stash，默认会删除最新的stash。
(下面不常用)
7. git stash clear 删除所有的stash，慎用，它会清除所有保存的stash记录。
8. git stash branch <branch_name> [stash] 创建一个新分支并将某个stash中的变更应用到新分支上。这样可以在一个干净的环境中继续开发。
9. git stash -p 交互式地选择要保存的修改，即对每个修改进行确认。
10. git stash -u 或 git stash --include-untracked 保存除了未跟踪的文件（Untracked files）外的所有修改。
11. git stash --keep-index 或 git stash --no-keep-index 默认情况下，git stash会保存所有已暂存的修改，使用--keep-index选项可以只保存未暂存的修改。
12. git stash --all 保存所有的修改，包括暂存区和未暂存的修改，以及未跟踪的文件。
```

### git HEAD

这个命令不常用，但是可以帮助自己理解版本控制的原理，笔者就放进来了。[参考文章](https://www.zsythink.net/archives/3412/)

先总结一下，HEAD指向当前分支，最终指向当前提交：

**HEAD指针 ——–> 分支指针 ——–> 最新提交**

[![img.png](img02.png)](https://shenfengyin.github.io/2023/10/09/git-command/img02.png)

参照上面的图，可能不直观，但是结合下面的命令就很直观了

```plaintext
PLAINTEXT
$ cat .git/HEAD 
ref: refs/heads/sfy/study_a #HEAD指向分支sfy/study_a
$ cat .git/refs/heads/sfy/study_a
dfsafdafef6e4f28esfdfjlaf9 #分支sfy/study_a指向最后一次提交的哈希码
###
这里的话可以通过git log [sfy/study_a] ([-n] [numble])   
来进行查看最近numb次提交的哈希码和message
```

所以说，通常情况下，HEAD指针总是指向了当前分支的最新提交（通过分支指针间接的指向）

#### detached HEAD 分离头

讨论一下有关HEAD的git命令，上面我们知道了，通常情况下，HEAD指针总是指向了当前分支的最新提交。那不通常的情况呢？

凡是不指向当前分支（从而指向最新提交），都是“分离头”

这里笔者直接用[参考文章](https://www.zsythink.net/archives/3412/)举的例子。

让HEAD指针指向某个提交，而不是指向某个分支指针，即可达到“分离头”，git checkout <哈希码>

```plaintext
PLAINTEXT
/d/workspace/git/test_repo1 (test)
$ git checkout cbd3348
Note: checking out 'cbd3348'.

You are in 'detached HEAD' state. You can look around, make experimental
changes and commit them, and you can discard any commits you make in this
state without impacting any branches by performing another checkout.

If you want to create a new branch to retain commits you create, you may
do so (now or later) by using -b with the checkout command again. Example:

git checkout -b <new-branch-name>

HEAD is now at cbd3348 add 2 in m1

/d/workspace/git/test_repo1 ((cbd3348...))
$
```

[![img.png](img03.png)](https://shenfengyin.github.io/2023/10/09/git-command/img03.png)

此时黄色标注即是HEAD位置，在此状态下进行add、commit，可以得到

[![img.png](img04.png)](https://shenfengyin.github.io/2023/10/09/git-command/img04.png)

可以看出来此时提交正常生成节点，但是本质上当前分支为匿名分支。

当前有两个选择，丢弃分支，或者为匿名分支命名

-   丢弃分支：直接checkout到其他分支，git checkout ，直接丢弃分支

[![img.png](img05.png)](https://shenfengyin.github.io/2023/10/09/git-command/img05.png)

-   保存成分支：
    -   在当前状态下：git checkout -b
    -   git branch newtest dca15df （这里的dca15df是当前最新提交的哈希码）

回过头来看，其实本质上“分离头”的作用就是提供一个方法进行一次项目的探索和实验，这种状态下可以轻松决定是否继续，而不需要额外操作分支。

### git reset

通过使用 –hard 选项，该命令还会更新你的工作目录和暂存区，使它们与重置的目标提交完全一致。这意味着任何未提交的更改都将被丢弃，工作目录将变为与远程 “master” 分支相同的状态。

请注意，执行此命令之前应该谨慎，并确保你理解其影响。重置操作是不可逆的，并且会丢失所有未提交的更改。因此，在执行此命令之前，最好先进行必要的备份或确认。

git reset 命令用于回退版本，可以指定退回某一次提交的版本；用于将当前分支的HEAD指针指向指定的提交，从而改变当前分支的位置

`git reset [--soft | --mixed | --hard] [HEAD]`  
1  
知识前提：git重要的三个工作区域：  
工作区(Working Directory）：写代码的目录。就是项目代码存放的目录（git add 之前的目录）。  
暂存区（index/stage）：工作区与版本库之间的缓冲地带。用 git add 把文件添加进去，实际上就是把文件修改添加到暂存区，查看记录 git status  
仓库区：git commit 提交到本地分支的，查看记录 git log

–mixed为默认的，可以不用带该参数  
用于重置暂存区的文件，此时历史记录与上一次的提交(commit)保持一致，工作区文件内容保持不变（有上次修改的内容）。移动 HEAD 指针，改变暂存区内容，但不会改变工作区  
原有文件内容的变更 ：修改内容还在，变成未add的状态  
目录结构的变更（增加或者删除文件）：  
新增文件： 还存在，变成未add的状态(目录结构中文件变成红色，需要执行命令git add . 再执行git commit )  
删除文件：目录结构中还是没有，可以直接执行git commit

–soft用于回退到某个版本  
仅仅移动当前 Head 指针，不会改变工作区和暂存区的内容  
原有文件内容的变更 ：修改内容还在，变成已add的状态（未commit）  
目录结构的变更（增加或者删除文件）：  
新增文件：还存在，变成已add的状态(目录结构中文件变成绿色，可以再次执行git commit )；  
删除文件：目录结构中还是没有，可以直接执行git commit

–hard 参数撤销工作区中所有未提交的修改内容，  
将暂存区与工作区都回到上一次版本，并删除之前的所有信息提交，当前 HEAD 指针、工作区和暂存区内容全部改变  
原有文件内容的变更 ：修改内容丢失（修改的代码不会变成未add的状态）  
目录结构的变更（增加或者删除文件）：新增文件丢失、删除的文件相当于没删  
使用场景

–mixed

1 使用完 reset –mixed 后，执行 git add 将这些改变过的文件內容加入 暂存区（index）中，再执行 git commit 将 Index 暂存区中的內容提交至仓库（ Repository ）中，这样一样可以达到合并 commit 节点的效果  
2 也可以用于发现add错误了，可以执行git reset HEAD来重置暂存区（index）的文件

–soft

1 使用完reset –soft后，commit\_id之后提交的内容会被放入暂存区（index）中，此时已经add了，可以直接执行commit，将commit\_id之后的提交作为一个commit来统一进行提交，减少不必要的log记录

–hard

1 使用 git reset –hard HEAD（HEAD也可以是某个commit\_id) 来强制恢复 git 管理的文件夹的內容及状态；此时目标节点(commit\_id)后的所有提交都会被删除

**举例常用：git reset –hard origin/master**

git reset –hard origin/master 的目的是将当前分支的指针（例如，假设当前分支为”brancha”）移动到与 origin/master 指向的提交相同的位置。这将使当前分支和远程的 “master” 分支指向相同的提交，实现两个分支的同步。

在这里要注意，要提前git fetch，否则你使用git log的可以看出来，可能不是远端的最新提交。

至于为什么，了解下面git fetch和git pull的原理就彻底明白了。

### git fetch

[参考博客](https://blog.csdn.net/weixin_41975655/article/details/82887273?spm=1001.2101.3001.6661.1&utm_medium=distribute.pc_relevant_t0.none-task-blog-2~default~CTRLIST~Rate-1-82887273-blog-74938111.235%5Ev38%5Epc_relevant_sort_base2&depth_1-utm_source=distribute.pc_relevant_t0.none-task-blog-2~default~CTRLIST~Rate-1-82887273-blog-74938111.235%5Ev38%5Epc_relevant_sort_base2&utm_relevant_index=1)

首先假设我们本地仓库的 master 分支上 commit ID =1 ，orign/mastter中的commit ID =1 ;  
这时候远程仓库有人更新了github origin库中master分支上的代码，新的代码版本号commit ID =2 ,  
那么在github上 orign/master的commitID=2，然后我们要更新代码（看下图）。

[![img.png](img06.png)](https://shenfengyin.github.io/2023/10/09/git-command/img06.png)

1.  git fetch  
    使用git fetch更新代码，本地的库中master的commitID不变，还是等于1。但是与git上面关联的那个orign/master的commit ID变成了2。这时候我们本地相当于存储了两个代码的版本号，我们还要通过merge去合并这两个不同的代码版本，如果这两个版本都修改了同一处的代码，这时候merge就会出现冲突，然后我们解决冲突之后就生成了一个新的代码版本。  
    这时候本地的代码版本可能就变成了commit ID=3，即生成了一个新的代码版本。

[![img.png](img07.png)](https://shenfengyin.github.io/2023/10/09/git-command/img07.png)

相当于fetch的时候本地的master没有变化，但是与远程仓关联的那个版本号被更新了，我们接下来就是在本地合并这两个版本号的代码。  
\\2. git pull  
是用git pull更新代码的话就比较简单暴力了，看下图。

[![img.png](img08.png)](https://shenfengyin.github.io/2023/10/09/git-command/img08.png)

使用git pull的会将本地的代码更新至远程仓库里面最新的代码版本

由此可见，git pull看起来像git fetch+get merge，但是根据commit ID来看的话，他们实际的实现原理是不一样的。

这也是为什么推荐使用git fetch，因为git pull可能会导致更新直接覆盖一些未提交的修改。

## 工作区和暂存区

来自[菜鸟教程](https://www.runoob.com/git/git-workspace-index-repo.html)

-   工作区：就是你在电脑里能看到的目录。
-   暂存区：英文叫 stage 或 index。一般存放在 .git 目录下的 index 文件（.git/index）中，所以我们把暂存区有时也叫作索引（index）。
-   版本库：工作区有一个隐藏目录 .git，这个不算工作区，而是 Git 的版本库。

[![img.png](img01.png)](https://shenfengyin.github.io/2023/10/09/git-command/img01.png)

### 暂存区的作用

git暂存区（也称为索引）在Git中起着重要的作用。它充当了一个中间区域，用于存储即将提交到版本控制系统的文件更改。具体来说，暂存区有以下几个用途：

1.  分离工作区和仓库：暂存区将工作区（即你当前的文件目录）和Git仓库之间进行了分离。它允许你在提交更改之前对文件进行选择性地暂存，这样你可以控制哪些更改会被包含在下一次提交中。
2.  提交更改的准备：通过将文件添加到暂存区，你可以将文件的更改逐个或批量地准备好以进行提交。这样可以帮助你构建具有逻辑性和一致性的提交历史记录。
3.  与其他分支进行比较：暂存区还允许你将当前分支的最新提交与其他分支进行比较。通过将其他分支切换到工作区，你可以查看和比较暂存区中的更改，以帮助你做出决策。

一个具体的例子是，假设你正在开发一个软件项目，并且你的代码托管在Git仓库中。当你对几个文件进行了修改后，你可以使用git add命令将这些文件添加到暂存区。这样，这些文件的更改将被暂存起来，但并未直接提交到仓库。然后，你可以继续进行其他修改，并将它们逐个或批量地添加到暂存区。最后，当你准备好提交这些更改时，你可以使用git commit命令将暂存区中的内容作为一个完整的提交保存到仓库中。

通过使用暂存区，你可以灵活地控制和管理你的文件更改，并构建一个有序和可追溯的提交历史记录。

### 注意事项

切换分支时，工作区、暂存区的内容都会保留（to be commited，staged）。  
所以如果不幸在错误分支上进行编辑，只要没提交，有时候还是可以直接切换分支的（但是可能出现冲突问题，所以建议用下面方法）

1.  使用 git stash 命令将当前分支上的未提交修改保存到一个临时区域（stash）。这样可以清空工作区，使其保持干净状态。
2.  切换到目标分支。
3.  如果需要，可以使用 git stash pop 命令将之前保存的修改还原到目标分支上。
