# SHENFY BLOG

这是从 `shenfengyin.github.io` 已部署的静态页面恢复出的 Hexo 源码工程。

## 本地使用

```bash
npm ci
npm run build
npm run server
```

本地预览地址为 <http://localhost:4000>。

新建文章：

```bash
npx hexo new post "文章标题"
```

## 内容与部署分离

- 当前仓库应保存 Hexo 源码，包括 `source/`、配置文件和依赖清单。
- `npm run deploy` 只把生成后的 `public/` 发布到远端 `master` 分支。
- 建议将当前源码分支命名为 `source` 并推送到远端，避免以后再次丢失源码。

首次推送源码前，请先确认远端 `master` 仍是 GitHub Pages 的发布分支。不要把源码分支强推到 `master`。
