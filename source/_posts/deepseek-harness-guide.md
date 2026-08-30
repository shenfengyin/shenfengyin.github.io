---
title: "LLM 与 AI 工作台：DeepSeek Harness 安装、API 购买与配置教程"
date: 2026-08-30
description: "用通俗的方式理解 LLM 与 AI 工作台的关系，并从零安装 DeepSeek Harness、配置 DeepSeek API、安装 Skill 和完成第一次任务。"
tags:
  - AI
  - LLM
  - DeepSeek
  - DeepSeek Harness
categories:
  - AI工具
---

很多人已经用过 DeepSeek、豆包、Kimi、通义千问：打开网页，输入问题，等它回答。

这类产品很像一位**坐在会议室里的聪明顾问**。它能理解问题、写方案、提建议，但通常不会直接打开你电脑里的项目文件、逐个检查材料、运行命令，再把结果保存回去。

AI 工作台解决的正是这个问题：**给大模型配上一台电脑和一套工具，让它从“会回答”升级为“能干活”。**

本文以开源的 **DeepSeek Harness（简称 DSH）** 为例，介绍：

- LLM 和 AI 工作台到底是什么关系；
- 如何在自己的电脑上安装 DSH；
- 如何购买 DeepSeek API 额度并创建 API Key；
- 如何把 DeepSeek API 配置到 DSH 中；
- 如何给 DSH 安装 PPT、学习和架构绘图 Skill；
- 第一次使用时应注意哪些权限和费用问题。

> 本文操作与页面名称核对于 2026 年 8 月 30 日。DeepSeek Harness 目前仍处于 Developer Preview（开发者预览）阶段，功能和安装方式可能快速变化。如果本文步骤与实际页面不一致，请以文末官方文档为准。

## 一、LLM 和 AI 工作台是什么关系？

先记住一句话：

> **LLM 是大脑，AI 工作台是“大脑 + 电脑 + 工具 + 工作流程”。**

### 1. LLM：负责理解和思考

LLM 是 Large Language Model 的缩写，中文叫“大语言模型”。DeepSeek、GPT、Claude、Qwen 等都属于 LLM。

它主要负责：

- 理解你的要求；
- 阅读和总结文字；
- 分析问题、拆解步骤；
- 生成文章、表格、代码或方案。

但只有“大脑”还不够。你让普通聊天模型“把这个文件夹里的 30 份材料整理成一份报告”，它可能会告诉你整理方法，却不一定能直接进入文件夹完成全部工作。

### 2. AI 工作台：负责把想法变成动作

AI 工作台也常被叫作 **Agent Harness、Agent 工作台、智能体工作台**。它为 LLM 补上了真正执行任务所需的能力：

| 组成部分 | 通俗理解 | 作用 |
| --- | --- | --- |
| LLM | 大脑 | 理解要求、判断下一步、生成内容 |
| 工作区 | 办公桌 | 告诉 AI 可以在哪个文件夹里工作 |
| 工具 | 双手和电脑 | 读写文件、搜索资料、运行命令、调用程序 |
| 上下文 | 工作记忆 | 记住当前材料、对话和任务进度 |
| 执行循环 | 办事流程 | 观察结果，再决定下一步，直到完成任务 |
| 权限控制 | 门禁和审批 | 危险操作先询问，人始终保留决定权 |

它们的工作关系可以简单理解为：

```text
你提出目标
    ↓
AI 工作台把目标和现有材料交给 LLM
    ↓
LLM 判断下一步：读文件、搜索、修改、运行命令……
    ↓
AI 工作台调用对应工具（必要时先请你批准）
    ↓
执行结果返回给 LLM，继续判断下一步
    ↓
任务完成，你检查和验收结果
```

所以，AI 工作台并不是一种更大的模型。它更像是一个**让模型能够持续做事的运行环境**。

### 3. API 在这里扮演什么角色？

DSH 是工作台，DeepSeek 模型是大脑，API 则是二者之间的“电话线”。

每当 DSH 请求模型理解材料、规划步骤或生成内容时，都会通过 API 把请求发送给 DeepSeek。DeepSeek 返回结果后，会按照实际处理的 Token 数量扣费。

因此需要分清三件事：

- **安装 DSH**：把 AI 工作台装到电脑上；
- **充值 DeepSeek API**：给模型调用账户准备余额；
- **创建 API Key**：生成一把只有程序能使用的“数字钥匙”。

充值和创建 Key 是两个独立步骤。只充值不创建 Key，DSH 无法连接模型；只创建 Key 但没有可用余额，调用也可能失败。

## 二、安装 DeepSeek Harness（DSH）

DSH 是 DeepSeek 官方开源的 Agent Harness，采用“一切皆插件”的架构。它可以在获得许可后读取和编辑工作区文件、运行命令、维护任务计划并调用模型。

### 第 1 步：安装 Node.js

DSH 当前通过 npm 运行，因此电脑上需要先安装 Node.js。

最简单的方法是打开 [Node.js 官网](https://nodejs.org/zh-cn)，下载并安装标有 **LTS** 的长期支持版本。

Windows 10/11 用户也可以右键打开 PowerShell，执行：

```powershell
winget install OpenJS.NodeJS.LTS
```

安装完成后，**关闭并重新打开终端**，依次输入下面两条命令：

```bash
node -v
npm -v
```

如果两条命令都能显示版本号，说明环境已经准备好。

> Windows 用户可以使用 PowerShell 或 Windows Terminal；macOS 用户可以使用“终端”。

### 第 2 步：准备一个专用工作文件夹

第一次使用时，建议新建一个只放测试材料的文件夹。不要一开始就把整个用户目录、系统盘或包含敏感资料的目录交给 AI。

例如：

```bash
mkdir dsh-demo
cd dsh-demo
```

随后可以把几份不敏感的测试文档放进这个文件夹。

### 第 3 步：启动 DSH

在刚才的文件夹中运行官方推荐命令：

```bash
npx @deepseek-ai/dsh web
```

第一次执行时，`npx` 会下载所需程序，因此可能需要等待一会儿。启动成功后，DSH 默认会打开浏览器，并显示：

```text
http://127.0.0.1:3080
```

如果没有自动打开，可以复制这个地址到浏览器。

如果不希望自动打开浏览器，可以使用：

```bash
npx @deepseek-ai/dsh web --no-open
```

> 运行 DSH 的终端窗口需要保持开启。关闭窗口或按下 `Ctrl + C`，本地服务就会停止。

### 第 4 步：选择工作区

进入 DSH 后，点击 **Choose workspace**，添加并选择刚才的 `dsh-demo` 文件夹。

这里有一个容易误解的细节：DSH 会把启动命令所在目录作为默认文件位置，但全新的 Web UI **仍然需要你手动选择工作区**，否则不能开始任务。

工作区可以理解为给 AI 画出的办公范围。选择哪个文件夹，它就主要在哪个文件夹内读取和处理材料。

## 三、购买 DeepSeek API 额度

### 先分清：聊天会员和 API 不是一回事

DeepSeek 网页版或 App 对话，与 DeepSeek 开放平台 API 是两套使用方式。DSH 调用的是 **开放平台 API**，消耗的是开放平台余额。

换句话说：即使你能在 DeepSeek 网页版正常聊天，也不代表 API 账户里一定有可用额度。

### 第 1 步：登录 DeepSeek 开放平台

打开 [DeepSeek 开放平台](https://platform.deepseek.com/)，使用手机号、邮箱或页面提供的其他方式登录。

未注册的用户按照页面提示完成注册。部分充值方式可能要求手机号验证或实名认证，请以平台当时提示为准。

### 第 2 步：充值

登录后，在左侧菜单进入 **充值**：

1. 选择充值金额；
2. 选择页面提供的支付方式；
3. 核对当前账号和金额；
4. 由你本人确认并完成支付；
5. 支付后回到平台检查余额是否到账。

建议第一次只充值满足测试需要的小额资金，确认 DSH 可以正常调用后，再根据实际用量追加。

> 充值金额仅用于调用 API 服务。API 按实际 Token 用量扣费，不是“买一次永久使用”，也不是网页版会员。模型价格会调整，并且可能区分输入、输出、缓存命中以及峰谷时段，请随时查看[官方模型与价格页面](https://api-docs.deepseek.com/zh-cn/quick_start/pricing)。

### 第 3 步：查看余额、用量和账单

开放平台中几个常用菜单的作用如下：

- **用量信息**：查看累计用量、消费金额、模型用量和 API Key 用量；
- **账单**：查看充值记录、赠送额度及相关账单；
- **充值**：追加 API 余额；
- **API keys**：创建和管理程序访问密钥。

建议刚开始使用时，每天看一次“用量信息”，了解不同任务大概会产生多少费用。

## 四、创建 DeepSeek API Key

充值完成后，进入开放平台左侧的 **API keys** 页面。

1. 点击 **创建 API key**；
2. 给它起一个容易识别的名称，例如 `dsh-my-computer`；
3. 点击创建；
4. 立即复制并妥善保存生成的 Key。

API Key 的格式通常类似：

```text
sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

这里最重要的规则是：**API Key 通常只在创建时完整显示一次。** 关闭窗口后如果找不到原 Key，最稳妥的做法是删除旧 Key，再创建一个新的。

请不要把真实 Key：

- 发到微信群、邮件或聊天记录中；
- 放进博客文章、PPT 或演示截图；
- 写入公开的 GitHub 仓库；
- 直接写进要分享给别人的脚本；
- 交给来历不明的网站或插件。

API Key 就像一张会从你账户扣费的门禁卡。别人拿到后产生的调用费用，也可能由你的账户承担。

## 五、在 DSH 中配置 DeepSeek API

回到已经打开的 DSH 页面：

1. 打开 **Settings**；
2. 进入 **Models**；
3. 找到 **DeepSeek** 卡片；
4. 将刚才创建的 API Key 填入输入框；
5. 点击保存；
6. 回到任务页面，在模型选择器中选择可用的 DeepSeek 模型。

保存后，新配置会在下一次请求时生效，通常不需要重启 DSH。

官方文档说明，密钥会保存在 DSH 本地的凭据文件中：

```text
$DSH_HOME/.credentials.yaml
```

设置文件中只保留凭据引用，页面保存后返回的也是脱敏信息，不会再次显示完整密钥。初学者直接通过 **Settings → Models** 配置即可，不建议手工修改凭据文件。

### 为什么这里不需要填写 Base URL？

DSH 内置的 DeepSeek 提供商已经知道官方接口地址，因此通常只需要填写 API Key。

只有在使用公司网关、自建服务或其他兼容接口时，才需要通过 **Add a custom provider** 自定义地址。DeepSeek 当前官方 OpenAI 兼容接口的 Base URL 是：

```text
https://api.deepseek.com
```

普通用户不要为了“优化速度”随意改成陌生的中转地址，因为这相当于把你的请求内容和 API Key 交给第三方。

## 六、完成第一次任务

第一次不要直接拿重要项目测试。可以在工作区放入两三份普通材料，然后输入：

```text
请先阅读当前工作区中的所有文件，不要修改原文件。
列出文件清单，分别用一句话说明内容，再把共同信息整理成 summary.md。
执行前先告诉我你的计划；涉及删除、覆盖或运行命令时，必须先征得我的同意。
```

观察 DSH 是否能够：

1. 找到工作区文件；
2. 给出清晰计划；
3. 在需要时请求权限；
4. 生成 `summary.md`；
5. 说明自己做了什么。

最后一定要亲自打开文件检查结果。AI 工作台可以提高效率，但它可能误解材料、遗漏条件或生成错误内容。**AI 负责执行，人负责目标、权限和验收。**

## 七、给 DSH 安装三个实用 Skill

模型决定“聪不聪明”，Skill 决定“做事有没有章法”。

Skill 不是一个新的大模型，而是一套写给 AI 的专业工作说明。它通常由一个必需的 `SKILL.md` 和若干可选脚本、模板、示例组成。安装后，AI 遇到对应任务时，就能按照这套流程工作。

这里推荐三个适合办公场景的 Skill：

| Skill | 能做什么 | GitHub 地址 | 仓库中的 Skill 目录 |
| --- | --- | --- | --- |
| PPT Master | 从主题或材料生成、重构和美化可编辑 PPTX | [hugohe3/ppt-master](https://github.com/hugohe3/ppt-master) | `skills/ppt-master` |
| Teach | 把一个学习目标拆成短课程、练习和学习记录 | [mattpocock/skills](https://github.com/mattpocock/skills) | `skills/productivity/teach` |
| Archify | 生成架构图、流程图、时序图、数据流图和状态图 | [tt-a1i/archify](https://github.com/tt-a1i/archify) | `archify` |

> Skill 内不仅有文字要求，也可能包含会被执行的脚本。安装前应查看仓库来源、许可证、`SKILL.md` 和脚本内容。不要安装来源不明的 Skill，也不要因为 Skill 要求授权就直接同意高风险操作。

### 方法一：手动安装到 DSH

DSH 会自动扫描项目根目录下的：

```text
<项目根目录>/.dsh/skills
```

每个 Skill 都应是一个独立目录，并且目录第一层就能看到 `SKILL.md`。正确结构如下：

```text
你的项目/
└── .dsh/
    └── skills/
        ├── ppt-master/
        │   ├── SKILL.md
        │   └── ...
        ├── teach/
        │   ├── SKILL.md
        │   └── ...
        └── archify/
            ├── SKILL.md
            └── ...
```

具体操作：

1. 在 GitHub 打开上表中的仓库，点击 **Code → Download ZIP**；
2. 解压下载文件；
3. 在自己的项目根目录中新建 `.dsh/skills`；
4. 按照上表的“仓库中的 Skill 目录”，把**整个目录**复制到 `.dsh/skills`；
5. 分别将目标目录命名为 `ppt-master`、`teach` 和 `archify`；
6. 检查三个目标目录的第一层是否都有 `SKILL.md`。

以 Teach 为例，要复制的是仓库里的 `skills/productivity/teach` **整个文件夹**，不能只复制其中的 `SKILL.md`，否则它引用的格式文件和其他资源会丢失。

DSH 还支持用户级 Skill 目录，但初学者更适合先使用项目级 `.dsh/skills`：它只对当前项目生效，范围清晰，出了问题也容易移除。

安装后，回到 DSH 新建一个会话，直接说：

```text
请列出当前工作区可用的 Skill，并分别用一句话说明 ppt-master、teach 和 archify 的用途。
```

如果没有识别到，先检查目录层级和 `SKILL.md` 文件名，再重启一次 DSH。

### 方法二：让 AI 工作台帮你安装

这正是 AI 工作台比普通聊天模型更方便的地方：你不必自己下载、解压和寻找目录，可以让它调用 Git、检查文件并复制到正确位置。

在一个已经可以正常工作的 DSH 会话中，发送下面这段话：

```text
请为当前项目安装以下三个 Skill：

1. PPT Master
   仓库：https://github.com/hugohe3/ppt-master
   Skill 目录：skills/ppt-master

2. Teach
   仓库：https://github.com/mattpocock/skills
   Skill 目录：skills/productivity/teach

3. Archify
   仓库：https://github.com/tt-a1i/archify
   Skill 目录：archify

安装要求：
- 安装到当前项目的 .dsh/skills 目录，不要安装到系统目录；
- 下载前先检查目标目录，已有同名 Skill 时不要覆盖，先向我说明；
- 只复制上面指定的 Skill 目录，保留其中的脚本、模板和资源；
- 安装过程中不要运行 Skill 自带脚本，不要修改项目其他文件；
- 安装完成后检查三个目录第一层是否都有 SKILL.md；
- 最后列出实际写入的目录和检查结果。
```

AI 可能会请求联网、运行 `git` 命令和写入 `.dsh/skills` 的权限。这些操作与安装目标一致时可以批准；如果它准备删除文件、覆盖已有目录、写入工作区之外或执行刚下载的脚本，应先拒绝并要求它解释原因。

无论使用哪种方法，**“安装成功”都不能只看 AI 的口头回复**。最后要亲自检查目录，并用一个小任务验证。例如：

```text
请使用 archify，把“用户提出目标 → AI 制定计划 → 调用工具 → 人工审批 → 输出结果”画成一张工作流程图。
```

## 八、权限和费用：新手先守住这两条线

### 1. 权限线

建议遵循“最小权限”原则：

- 只选择完成任务所需的工作区；
- 重要文件先备份或使用版本管理；
- 删除、覆盖、联网发送、安装软件等操作要仔细确认；
- 不把单位敏感信息、个人信息或未公开材料发送给未经批准的外部模型；
- 在单位环境中使用前，先遵守本单位的数据安全和保密要求。

不要把“一直点同意”当作长期使用方式。权限提示的作用，就是让你在关键动作前重新确认风险。

### 2. 费用线

控制 API 费用可以从四件小事开始：

- 第一次只充小额；
- 定期查看“用量信息”；
- 不要反复把无关的大文件交给模型；
- Key 泄露或出现异常调用时，立即在“API keys”中删除对应 Key。

开放平台费用通常按照“Token 数量 × 对应价格”扣除，并优先使用赠送余额。具体价格可能变化，因此本文不写死单价，以[官方价格页面](https://api-docs.deepseek.com/zh-cn/quick_start/pricing)为准。

## 九、常见问题

### 1. 提示 `npx: command not found` 或“无法识别 npx”

通常是 Node.js 没有正确安装，或者安装后没有重新打开终端。重新安装 Node.js LTS，并用 `node -v`、`npm -v` 检查。

### 2. DSH 启动了，但网页打不开

先确认运行命令的终端没有被关闭，再查看终端打印的实际访问地址。默认地址是 `http://127.0.0.1:3080`，它只能从运行 DSH 的这台电脑访问。

### 3. 页面不能输入任务

检查是否已经点击 **Choose workspace** 并选择工作区。全新的 Web UI 在没有工作区时会禁用任务输入。

### 4. 提示 `MISSING_CREDENTIAL`

说明模型凭据没有配置成功。回到 **Settings → Models**，重新保存 DeepSeek API Key。

### 5. 提示 401、Authentication Failed 或密钥无效

检查 Key 是否复制完整、是否已经被删除，输入框前后是否多了空格。不要把示例中的 `sk-xxxxxxxx` 当成真实 Key。

### 6. 提示余额不足

登录 DeepSeek 开放平台查看“用量信息”和余额。确认当前 Key 属于已经充值的同一个开放平台账号。

### 7. AI 想执行的操作超出预期

拒绝该次授权，重新描述工作范围。例如明确要求“只读不改”“先给计划”“禁止删除”“不要访问工作区之外的目录”。

### 8. Skill 安装后没有出现

先检查目录是否为 `<项目根目录>/.dsh/skills/<skill-name>/SKILL.md`。DSH 不会递归搜索任意深度的 `SKILL.md`，因此多套了一层解压目录也会导致识别失败。确认目录正确后，新建会话或重启 DSH 再试。

## 十、最后总结

把整套关系再压缩成四句话：

1. **LLM 是大脑**，负责理解、推理和生成；
2. **DSH 是 AI 工作台**，负责提供文件、工具、流程和权限；
3. **API 是连接通道**，每次调用会按实际用量计费；
4. **你是负责人**，负责给目标、定边界、批权限和做验收。

当大模型只能聊天时，它更像一个顾问；当它进入 AI 工作台、拿到合适工具并在明确权限内行动时，它才真正成为能够协助完成工作的“数字同事”。

## 官方资料

- [DeepSeek Harness GitHub 仓库](https://github.com/deepseek-ai/deepseek-harness)
- [DeepSeek Harness 官方文档](https://deepseek-harness.github.io/deepseek-harness/)
- [DSH Web UI 快速开始](https://deepseek-harness.github.io/deepseek-harness/en/guide/quickstart)
- [DSH 模型配置说明](https://deepseek-harness.github.io/deepseek-harness/en/guide/providers)
- [DSH Skill 子系统说明](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/skills)
- [DeepSeek 开放平台](https://platform.deepseek.com/)
- [DeepSeek API 文档](https://api-docs.deepseek.com/zh-cn/)
- [DeepSeek 模型与价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing)
- [PPT Master](https://github.com/hugohe3/ppt-master)
- [Teach](https://github.com/mattpocock/skills/tree/main/skills/productivity/teach)
- [Archify](https://github.com/tt-a1i/archify)

