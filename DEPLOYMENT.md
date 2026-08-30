# SHENFY BLOG 部署说明

本项目使用 Hexo 生成静态网站，并通过 GitHub Pages 发布。

- `source` 分支：保存 Hexo 源码、Markdown 文章、配置和恢复工具。
- `master` 分支：保存 Hexo 生成的静态文件，由 GitHub Pages 对外发布。
- 线上地址：<https://shenfengyin.github.io>

不要把 Hexo 源码直接覆盖到 `master`，也不要只部署静态文件而忘记备份 `source` 分支。

## 一、首次准备环境

项目要求使用 Node.js 22，版本记录在 `.nvmrc` 中。

```bash
cd /Users/fyshen/MyProjects/sfyblog
nvm use
npm ci
```

如果没有安装 `nvm`，请先确认当前 Node.js 版本：

```bash
node -v
npm -v
```

部署使用 SSH 地址连接 GitHub。首次部署前应确认 SSH 密钥可用：

```bash
ssh -T git@github.com
```

部署目标配置位于 `_config.yml`：

```yaml
deploy:
  type: git
  repo: git@github.com:shenfengyin/shenfengyin.github.io.git
  branch: master
```

## 二、新增或修改文章

文章统一放在 `source/_posts/` 中。可以手工创建 Markdown，也可以运行：

```bash
npx hexo new post "文章标题"
```

建议为文章明确填写 `date` 和 `updated`，避免 Hexo 把文件修改时间显示为更新日期：

```yaml
---
title: "文章标题"
date: "2023-12-24 20:30:00"
updated: "2023-12-24 20:30:00"
categories:
  - "Flink"
tags:
  - "Flink"
---
```

如果文章发布后没有内容更新，让 `updated` 与 `date` 保持一致。真正修改文章内容后，再按实际情况调整 `updated`。

## 三、本地构建与检查

每次部署前执行：

```bash
npm run clean
npm run build
npm run verify
```

其中：

- `clean` 清除 Hexo 数据库和旧的 `public/` 文件；
- `build` 重新生成完整静态网站；
- `verify` 检查恢复文章和本地图片是否完整。

本地预览：

```bash
npm run server
```

浏览器打开 <http://localhost:4000>。确认文章标题、日期、目录、代码块、图片和链接后，按 `Ctrl+C` 停止服务。

## 四、备份 Hexo 源码

先把源码提交到 `source` 分支，确保以后可以继续维护博客：

```bash
git switch source
git status
git add .
git commit -m "Update blog source"
git push -u origin source
```

提交前应检查 `git status`，不要提交 API Key、密码、个人凭据、`.env` 或 IDE 临时配置。

后续更新可使用：

```bash
git add .
git commit -m "Add new blog post"
git push origin source
```

## 五、发布到 GitHub Pages

源码构建和备份完成后运行：

```bash
npm run deploy
```

该命令会执行 `hexo clean && hexo deploy`，将生成结果提交并推送到远端 `master` 分支。它不会把 Markdown 源码发布到 `master`。

部署成功后可检查远端分支：

```bash
git ls-remote --heads origin master source
```

然后访问：

```text
https://shenfengyin.github.io
```

GitHub Pages 通常需要几十秒到几分钟更新。如果首页还是旧内容，可以等待一会儿后强制刷新浏览器。

## 六、日常发布流程

以后每次发布按以下顺序执行：

1. 在 `source/_posts/` 新增或修改文章。
2. 设置正确的 `date` 和 `updated`。
3. 运行 `npm run clean`、`npm run build` 和 `npm run verify`。
4. 本地预览并检查页面。
5. 提交并推送 `source` 分支。
6. 运行 `npm run deploy` 发布 `master` 分支。
7. 打开线上文章确认发布结果。

## 七、常见问题

### `Permission denied (publickey)`

GitHub SSH 密钥没有配置成功。运行 `ssh -T git@github.com` 检查连接，并确认公钥已经添加到 GitHub 账户。

### 端口 4000 被占用

说明已有 Hexo 预览服务正在运行。关闭原终端中的服务，或者使用其他端口：

```bash
npx hexo server -p 4001
```

### 页面出现错误的“更新于”日期

检查文章 Front Matter 是否使用了正确字段名 `updated`，不能写成 `update`。没有 `updated` 时，Hexo 可能使用文件修改时间。

### 部署成功但线上没有立即变化

先用 `git ls-remote --heads origin master` 确认远端提交已经变化，再等待 GitHub Pages 构建和 CDN 缓存刷新。
