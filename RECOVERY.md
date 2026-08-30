# 恢复记录

恢复日期：2026-08-28

## 数据来源

- `master`：`fe9b162a04f951a769fa091b5d4524bf6048b8a7`
- `old_main`：`e37e2ce5bc838afa3285b7fd20349856fd691cc9`

两个远端分支都只包含 Hexo 生成的静态文件，没有原始 Markdown、Hexo 配置或主题源码。

## 恢复范围

- 从 `master` 恢复 7 篇文章及其本地图片。
- 从 `old_main` 恢复 1 篇旧文章及其本地图片。
- 根据生成页面重建站点标题、作者、导航、社交链接和 Butterfly 主题配置。
- 修正旧页面中拼错的站点域名 `shenfenyin.github.io` 为实际域名 `shenfengyin.github.io`。

## 已知限制

- HTML 转回 Markdown 后，排版语法不一定与原稿逐字符一致，但正文结构、链接、代码块、表格和图片会尽量保留。
- 草稿、未发布文章、源文件注释和没有进入部署产物的资源无法从 GitHub Pages 仓库恢复。
- 主题配置是根据页面行为重建的，不保证与丢失的 `_config.butterfly.yml` 完全一致。
- `LSM` 文章中的两张 CSDN 外链图已恢复为本地资源；原作者仓库已不存在的 `lsmtree-11.png` 破图引用已从正文移除，原始引用仍保存在 `recovery/original-html/LSM.html`。
- 文章发布日期已根据正文中的旧链接和图片时间恢复到 2022–2023 年；没有日期证据的 `LSM` 按内容顺序设为 2022-12-18。

## 重跑恢复脚本

```bash
npm run recover -- <master-static-dir> <old-article-html> <old-assets-dir>
```

恢复脚本位于 `tools/recover-posts.mjs`，会覆盖 `source/_posts/` 中同名文章，请在重跑前提交自己的后续修改。
