import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { marked } from 'marked';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const CONTENT_DIR = path.join(ROOT, 'content');
const DATA_DIR = path.join(ROOT, 'data');
const DIST_DIR = path.join(ROOT, 'dist');
const SRC_DIR = path.join(ROOT, 'src');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ========== Yardımcılar ==========
function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function readMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const raw = fs.readFileSync(path.join(dir, f), 'utf8');
      const { data, content } = matter(raw);
      return {
        slug: path.basename(f, '.md'),
        ...data,
        body: content,
        bodyHtml: marked.parse(content || '')
      };
    });
}

function countWords(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

// ========== Serileri İşle ==========
const seriesRaw = readMarkdownFiles(path.join(CONTENT_DIR, 'series'));
const seriesList = seriesRaw.map(s => ({
  slug: s.slug || slugify(s.title),
  title: s.title,
  altTitle: s.altTitle || '',
  author: s.author || 'Bilinmiyor',
  artist: s.artist || '',
  status: s.status || 'ongoing',
  updateSchedule: s.updateSchedule || '—',
  cover: s.cover || '',
  genres: Array.isArray(s.genres) ? s.genres : [],
  featured: !!s.featured,
  synopsis: s.synopsis || '',
  synopsisHtml: marked.parse(s.synopsis || ''),
  publishDate: s.publishDate || new Date().toISOString().slice(0, 10),
  language: s.language || 'tr',
  source: s.source || ''
}));

// ========== Bölümleri İşle ==========
const chaptersRaw = readMarkdownFiles(path.join(CONTENT_DIR, 'chapters'));
const chaptersList = chaptersRaw
  .map(c => ({
    slug: c.slug,
    series: c.series,
    title: c.title,
    chapterNumber: Number(c.chapterNumber) || 0,
    publishedAt: c.publishedAt || new Date().toISOString().slice(0, 10),
    editorNote: c.editorNote || '',
    wordCount: countWords(c.body),
    contentHtml: c.bodyHtml
  }))
  .sort((a, b) => {
    if (a.series !== b.series) return a.series.localeCompare(b.series);
    return a.chapterNumber - b.chapterNumber;
  });

// ========== Seri İstatistikleri ==========
const seriesStats = {};
chaptersList.forEach(ch => {
  if (!seriesStats[ch.series]) {
    seriesStats[ch.series] = {
      chapterCount: 0,
      totalWords: 0,
      firstPublish: ch.publishedAt,
      lastUpdate: ch.publishedAt
    };
  }
  const st = seriesStats[ch.series];
  st.chapterCount += 1;
  st.totalWords += ch.wordCount;
  if (ch.publishedAt < st.firstPublish) st.firstPublish = ch.publishedAt;
  if (ch.publishedAt > st.lastUpdate) st.lastUpdate = ch.publishedAt;
});

const seriesWithStats = seriesList.map(s => ({
  ...s,
  chapterCount: seriesStats[s.slug]?.chapterCount || 0,
  totalWords: seriesStats[s.slug]?.totalWords || 0,
  firstPublish: seriesStats[s.slug]?.firstPublish || null,
  lastUpdate: seriesStats[s.slug]?.lastUpdate || null
}));

// ========== JSON Yaz ==========
fs.writeFileSync(
  path.join(DATA_DIR, 'series.json'),
  JSON.stringify(seriesWithStats, null, 2)
);

fs.writeFileSync(
  path.join(DATA_DIR, 'chapters.json'),
  JSON.stringify(chaptersList, null, 2)
);

// ========== Sitemap Oluştur ==========
const siteUrl = process.env.SITE_URL || 'https://braunsnovel.netlify.app';
const today = new Date().toISOString().slice(0, 10);

let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${siteUrl}/</loc><lastmod>${today}</lastmod><priority>1.0</priority></url>
  <url><loc>${siteUrl}/#/series</loc><lastmod>${today}</lastmod><priority>0.9</priority></url>
  <url><loc>${siteUrl}/#/chapters</loc><lastmod>${today}</lastmod><priority>0.8</priority></url>
`;
seriesWithStats.forEach(s => {
  sitemap += `  <url><loc>${siteUrl}/#/series/${s.slug}</loc><lastmod>${s.lastUpdate || today}</lastmod><priority>0.7</priority></url>\n`;
});
chaptersList.forEach(c => {
  sitemap += `  <url><loc>${siteUrl}/#/read/${c.slug}</loc><lastmod>${c.publishedAt}</lastmod><priority>0.6</priority></url>\n`;
});
sitemap += `</urlset>`;

fs.writeFileSync(path.join(DATA_DIR, 'sitemap.xml'), sitemap);

// ========== RSS Feed ==========
let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Braun's Novel</title>
  <link>${siteUrl}</link>
  <description>Braun's Novel - Profesyonel Web Novel Okuma Platformu</description>
  <language>tr</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
`;
[...chaptersList].reverse().slice(0, 30).forEach(c => {
  const series = seriesWithStats.find(s => s.slug === c.series);
  const seriesTitle = series ? series.title : c.series;
  rss += `  <item>
    <title>${seriesTitle} - ${c.title}</title>
    <link>${siteUrl}/#/read/${c.slug}</link>
    <guid>${siteUrl}/#/read/${c.slug}</guid>
    <pubDate>${new Date(c.publishedAt).toUTCString()}</pubDate>
    <description>Yeni bölüm: ${c.title}</description>
  </item>\n`;
});
rss += `</channel></rss>`;

fs.writeFileSync(path.join(DATA_DIR, 'rss.xml'), rss);

// ========== Dist Klasörünü Oluştur ==========
if (fs.existsSync(DIST_DIR)) fs.rmSync(DIST_DIR, { recursive: true, force: true });
copyDir(SRC_DIR, DIST_DIR);
fs.mkdirSync(path.join(DIST_DIR, 'data'), { recursive: true });
fs.copyFileSync(path.join(DATA_DIR, 'series.json'), path.join(DIST_DIR, 'data', 'series.json'));
fs.copyFileSync(path.join(DATA_DIR, 'chapters.json'), path.join(DIST_DIR, 'data', 'chapters.json'));
fs.copyFileSync(path.join(DATA_DIR, 'sitemap.xml'), path.join(DIST_DIR, 'sitemap.xml'));
fs.copyFileSync(path.join(DATA_DIR, 'rss.xml'), path.join(DIST_DIR, 'rss.xml'));

console.log(`✅ Build tamamlandı:`);
console.log(`   • ${seriesWithStats.length} seri`);
console.log(`   • ${chaptersList.length} bölüm`);
console.log(`   • sitemap.xml oluşturuldu`);
console.log(`   • rss.xml oluşturuldu`);
console.log(`   • dist/ klasörü hazır`);
