import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const [masterDir, oldArticleHtml, oldAssetsDir] = process.argv.slice(2);

if (!masterDir || !oldArticleHtml || !oldAssetsDir) {
  console.error(
    'Usage: node tools/recover-posts.mjs <master-static-dir> <old-article-html> <old-assets-dir>',
  );
  process.exit(1);
}

const projectDir = path.resolve(import.meta.dirname, '..');
const postsDir = path.join(projectDir, 'source', '_posts');
const recoveryHtmlDir = path.join(projectDir, 'recovery', 'original-html');
const additionalAssetsDir = path.join(
  projectDir,
  'recovery',
  'additional-assets',
);

const recoveredExternalImages = new Map([
  ['http://img.blog.csdn.net/20130508094533796', 'lsm-btree.jpg'],
  ['http://img.blog.csdn.net/20130508094524405', 'lsm-tree-overview.jpg'],
]);

const unavailableExternalImages = new Set([
  'https://fhfirehuo.github.io/Attacking-Java-Rookie/image/c2/lsmtree-11.png',
]);

const restoredDates = {
  'Embedding-word2vec': {
    date: '2023-12-03 20:00:00',
    updated: '2023-12-03 22:00:00',
  },
  LSM: {
    date: '2022-12-18 20:00:00',
    updated: '2022-12-18 22:15:00',
  },
  'flink-frame': {
    date: '2023-12-17 02:40:00',
    updated: '2023-12-17 03:00:00',
  },
  'git-command': {
    date: '2023-10-09 20:00:00',
    updated: '2023-10-09 22:00:00',
  },
  'hexo-butterfly': {
    date: '2023-10-04 15:30:00',
    updated: '2023-10-05 03:13:47',
  },
  'new-UUID': {
    date: '2023-10-05 20:00:00',
    updated: '2023-10-05 21:30:00',
  },
  'sql-join': {
    date: '2023-10-05 22:00:00',
    updated: '2023-10-05 23:00:00',
  },
  'hexo-building-blog': {
    date: '2023-10-04 12:00:22',
    updated: '2023-10-05 03:13:47',
  },
};

const posts = [
  'Embedding-word2vec',
  'LSM',
  'flink-frame',
  'git-command',
  'hexo-butterfly',
  'new-UUID',
  'sql-join',
].map((slug) => ({
  slug,
  branch: 'master',
  html: path.join(masterDir, '2024', '01', '15', slug, 'index.html'),
  assets: path.join(masterDir, '2024', '01', '15', slug),
  originalUrl: `https://shenfengyin.github.io/2024/01/15/${slug}/`,
  ...restoredDates[slug],
}));

posts.push({
  slug: 'hexo-building-blog',
  branch: 'old_main',
  html: path.resolve(oldArticleHtml),
  assets: path.resolve(oldAssetsDir),
  originalUrl: 'https://shenfengyin.github.io/2023/10/04/hexo-building-blog/',
  ...restoredDates['hexo-building-blog'],
});

const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  fence: '```',
  emDelimiter: '*',
  strongDelimiter: '**',
});
turndown.use(gfm);
turndown.keep(['center']);

function yamlString(value) {
  return JSON.stringify(value);
}

function localDate($, selector, prefix) {
  const title = $(selector).first().attr('title') || '';
  const fromTitle = title.replace(prefix, '').trim();
  if (fromTitle) return fromTitle;

  const datetime = $(selector).first().attr('datetime');
  if (!datetime) return '';
  return datetime.replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

function normalizeCodeBlocks($, article) {
  article.find('figure.highlight').each((_, figure) => {
    const element = $(figure);
    const language = (element.attr('class') || '')
      .split(/\s+/)
      .find((name) => name !== 'highlight') || '';
    const lines = element
      .find('td.code .line')
      .map((__, line) => $(line).text())
      .get();

    const code = lines.join('\n').replace(/\n+$/, '');
    const replacement = $('<pre>').append(
      $('<code>')
        .addClass(language ? `language-${language}` : '')
        .text(code),
    );
    element.replaceWith(replacement);
  });
}

function normalizeArticle($, article, slug) {
  article.find('a.headerlink').remove();
  normalizeCodeBlocks($, article);

  article.find('img').each((_, image) => {
    const element = $(image);
    const src = element.attr('src') || '';
    if (unavailableExternalImages.has(src)) {
      element.remove();
      return;
    }

    const articleAssetPrefix = new RegExp(
      `^/\\d{4}/\\d{2}/\\d{2}/${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`,
    );
    element.attr(
      'src',
      recoveredExternalImages.get(src) || src.replace(articleAssetPrefix, ''),
    );
    element.removeAttr('onerror').removeAttr('class').removeAttr('loading');
  });

  article.find('a').each((_, link) => {
    $(link)
      .removeAttr('target')
      .removeAttr('rel')
      .removeAttr('data-pjax-state');
  });
}

function cleanMarkdown(markdown) {
  return markdown
    .replace(/\\\\\n/g, '  \n')
    .replace(
      '**RULE（请看这篇博客——\\**\\*\\*CALCITE\\*\\**\\*：SQL OPTIMIZE，待补充）**',
      '**RULE（请看这篇博客——CALCITE：SQL OPTIMIZE，待补充）**',
    );
}

function copyAssets(sourceDir, destinationDir, reset = true) {
  if (!fs.existsSync(sourceDir)) return;
  if (reset) fs.rmSync(destinationDir, { recursive: true, force: true });
  fs.mkdirSync(destinationDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (!entry.isFile() || !/\.(?:gif|jpe?g|png|svg|webp)$/i.test(entry.name)) {
      continue;
    }
    fs.copyFileSync(
      path.join(sourceDir, entry.name),
      path.join(destinationDir, entry.name),
    );
  }
}

function recoverPost(post) {
  const html = fs.readFileSync(post.html, 'utf8');
  const $ = cheerio.load(html, { decodeEntities: false });
  const article = $('#article-container').first();
  if (!article.length) {
    throw new Error(`Article container not found in ${post.html}`);
  }

  const title = $('.post-title').first().text().trim()
    || $('meta[property="og:title"]').attr('content')
    || post.slug;
  const date = post.date || localDate($, '.post-meta-date-created', '发表于');
  const updated = post.updated || localDate($, '.post-meta-date-updated', '更新于');
  const categories = $('.post-meta-categories a.post-meta-categories')
    .map((_, category) => $(category).text().trim())
    .get()
    .filter(Boolean);
  const tags = $('.post-meta__tag-list a.post-meta__tags')
    .map((_, tag) => $(tag).text().trim())
    .get()
    .filter(Boolean);

  normalizeArticle($, article, post.slug);
  const markdown = cleanMarkdown(
    turndown.turndown(article.html() || '').trim(),
  );

  const frontMatter = [
    '---',
    `title: ${yamlString(title)}`,
    `date: ${yamlString(date)}`,
    ...(updated ? [`updated: ${yamlString(updated)}`] : []),
    ...(categories.length
      ? ['categories:', ...categories.map((item) => `  - ${yamlString(item)}`)]
      : []),
    ...(tags.length
      ? ['tags:', ...tags.map((item) => `  - ${yamlString(item)}`)]
      : []),
    `recovery_source: ${yamlString(post.originalUrl)}`,
    `recovery_branch: ${yamlString(post.branch)}`,
    '---',
    '',
  ].join('\n');

  fs.mkdirSync(postsDir, { recursive: true });
  fs.writeFileSync(
    path.join(postsDir, `${post.slug}.md`),
    `${frontMatter}${markdown}\n`,
  );
  const postAssetsDir = path.join(postsDir, post.slug);
  copyAssets(post.assets, postAssetsDir);
  copyAssets(path.join(additionalAssetsDir, post.slug), postAssetsDir, false);

  fs.mkdirSync(recoveryHtmlDir, { recursive: true });
  fs.copyFileSync(post.html, path.join(recoveryHtmlDir, `${post.slug}.html`));

  return {
    slug: post.slug,
    title,
    categories,
    tags,
    markdownBytes: Buffer.byteLength(markdown),
  };
}

const results = posts.map(recoverPost);
console.table(results);
