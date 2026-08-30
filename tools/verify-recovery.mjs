import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import * as cheerio from 'cheerio';

const projectDir = path.resolve(import.meta.dirname, '..');
const postsDir = path.join(projectDir, 'source', '_posts');
const originalHtmlDir = path.join(projectDir, 'recovery', 'original-html');
const publicDir = path.join(projectDir, 'public');

const posts = [
  ['Embedding-word2vec', '2023/12/03/Embedding-word2vec'],
  ['LSM', '2022/12/18/LSM'],
  ['flink-frame', '2023/12/17/flink-frame'],
  ['git-command', '2023/10/09/git-command'],
  ['hexo-butterfly', '2023/10/04/hexo-butterfly'],
  ['new-UUID', '2023/10/05/new-UUID'],
  ['sql-join', '2023/10/05/sql-join'],
  ['hexo-building-blog', '2023/10/04/hexo-building-blog'],
];

const similarityThresholds = new Map([
  // Formula markup was intentionally normalized and now renders through MathJax.
  ['Embedding-word2vec', 0.93],
]);

function articleText(filename) {
  const $ = cheerio.load(fs.readFileSync(filename, 'utf8'));
  const article = $('#article-container').first();
  article.find('.gutter, a.headerlink').remove();
  return article
    .text()
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

function bigramDice(left, right) {
  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return 0;

  const counts = new Map();
  for (let index = 0; index < left.length - 1; index += 1) {
    const bigram = left.slice(index, index + 2);
    counts.set(bigram, (counts.get(bigram) || 0) + 1);
  }

  let intersection = 0;
  for (let index = 0; index < right.length - 1; index += 1) {
    const bigram = right.slice(index, index + 2);
    const count = counts.get(bigram) || 0;
    if (count > 0) {
      intersection += 1;
      counts.set(bigram, count - 1);
    }
  }

  return (2 * intersection) / (left.length + right.length - 2);
}

function localImageReferences(markdown) {
  const references = [];
  const imagePattern = /!\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  for (const match of markdown.matchAll(imagePattern)) {
    const reference = match[1];
    if (!/^(?:[a-z]+:|\/|#)/i.test(reference)) references.push(reference);
  }
  return references;
}

const missing = [];
const validationErrors = [];
const results = [];

for (const [slug, outputPath] of posts) {
  const markdownFile = path.join(postsDir, `${slug}.md`);
  const originalFile = path.join(originalHtmlDir, `${slug}.html`);
  const generatedFile = path.join(publicDir, outputPath, 'index.html');

  for (const filename of [markdownFile, originalFile, generatedFile]) {
    if (!fs.existsSync(filename)) missing.push(path.relative(projectDir, filename));
  }
  if (missing.length) continue;

  const markdown = fs.readFileSync(markdownFile, 'utf8');
  const imageReferences = localImageReferences(markdown);
  for (const reference of imageReferences) {
    const imageFile = path.join(postsDir, slug, decodeURIComponent(reference));
    if (!fs.existsSync(imageFile)) missing.push(path.relative(projectDir, imageFile));
  }

  const originalText = articleText(originalFile);
  const generatedText = articleText(generatedFile);
  const generatedHtml = fs.readFileSync(generatedFile, 'utf8');
  if (slug === 'Embedding-word2vec') {
    const requiredMath = [
      'window.MathJax',
      'tex-mml-chtml.min.js',
      '$p(w_{t+1} \\mid w_t)$',
      '$$\\prod_{t&#x3D;1}^{T-1}',
    ];
    for (const snippet of requiredMath) {
      if (!generatedHtml.includes(snippet)) {
        validationErrors.push(
          slug + ': missing generated math marker ' + snippet,
        );
      }
    }
  }

  results.push({
    slug,
    images: imageReferences.length,
    originalChars: originalText.length,
    generatedChars: generatedText.length,
    similarity: bigramDice(originalText, generatedText).toFixed(4),
  });
}

console.table(results);

const lowSimilarity = results.filter((result) => {
  const threshold = similarityThresholds.get(result.slug) || 0.98;
  return Number(result.similarity) < threshold;
});
if (missing.length || validationErrors.length || lowSimilarity.length) {
  if (missing.length) console.error('Missing files:', missing);
  if (validationErrors.length) console.error('Validation errors:', validationErrors);
  if (lowSimilarity.length) console.error('Low similarity:', lowSimilarity);
  process.exit(1);
}

console.log(
  'Verified ' + results.length
    + ' posts with no missing local image assets and valid math markers.',
);
