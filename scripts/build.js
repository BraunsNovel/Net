import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { marked } from 'marked';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/\-\-+/g, '-');
}

// Dizin Yolları
const chaptersDir = path.join(__dirname, '../content/chapters');
const novelsDir = path.join(__dirname, '../content/novels');
const srcDir = path.join(__dirname, '../src');
const adminDir = path.join(__dirname, '../admin');
const staticDir = path.join(__dirname, '../static');
const distDir = path.join(__dirname, '../dist');

// Temizlik & Klasör Oluşturma
if (fs.existsSync(distDir)) fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

const novelsMap = {};

// 1. NOVELLERİ DERLE & STATİK HTML ÜRET
function buildNovels() {
  if (!fs.existsSync(novelsDir)) return [];

  const files = fs.readdirSync(novelsDir).filter(f => f.endsWith('.md'));
  const novels = files.map(file => {
    const { data: meta, content } = matter(fs.readFileSync(path.join(novelsDir, file), 'utf-8'));
    const cleanSlug = slugify(meta.slug || file.replace('.md', ''));
    novelsMap[cleanSlug] = meta.title || 'İsimsiz Roman';

    const novelData = {
      title: meta.title || 'İsimsiz Roman',
      slug: cleanSlug,
      author: meta.author || 'An Ri',
      cover: meta.cover || '',
      status: meta.status || 'Devam Ediyor',
      descriptionHtml: marked.parse(content)
    };

    // Statik Novel Sayfası Üret (SEO İçin)
    const novelHtmlDir = path.join(distDir, 'novels', cleanSlug);
    fs.mkdirSync(novelHtmlDir, { recursive: true });

    const htmlContent = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${novelData.title} - Oku</title>
  <meta name="description" content="${meta.description || novelData.title + ' oku.'}">
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <main class="container">
    <a href="/" class="back-link">← Ana Sayfa</a>
    <article class="novel-detail">
      <h1>${novelData.title}</h1>
      <p><strong>Yazar:</strong> ${novelData.author} | <strong>Durum:</strong> ${novelData.status}</p>
      <div class="novel-description">${novelData.descriptionHtml}</div>
    </article>
  </main>
</body>
</html>`;

    fs.writeFileSync(path.join(novelHtmlDir, 'index.html'), htmlContent);
    return novelData;
  });

  fs.mkdirSync(path.join(distDir, 'content'), { recursive: true });
  fs.writeFileSync(path.join(distDir, 'content/novels-index.json'), JSON.stringify(novels, null, 2));
  console.log(`✅ ${novels.length} roman için statik HTML ve JSON üretildi.`);
  return novels;
}

// 2. BÖLÜMLERİ DERLE & STATİK HTML ÜRET (GERÇEK OKUMA SAYFALARI)
function buildChapters() {
  if (!fs.existsSync(chaptersDir)) return;

  const files = fs.readdirSync(chaptersDir).filter(f => f.endsWith('.md'));
  const chapters = files.map(file => {
    const { data: meta, content } = matter(fs.readFileSync(path.join(chaptersDir, file), 'utf-8'));
    const cleanNovelSlug = slugify(meta.novelSlug || meta.novel_slug || '');
    const cleanChapterSlug = slugify(meta.slug || file.replace('.md', ''));

    return {
      title: meta.title || 'İsimsiz Bölüm',
      slug: cleanChapterSlug,
      novelSlug: cleanNovelSlug,
      novelTitle: novelsMap[cleanNovelSlug] || 'Web Novel',
      order: parseInt(meta.order || meta.chapter_number) || 1,
      date: meta.date || new Date().toISOString(),
      contentHtml: marked.parse(content)
    };
  }).sort((a, b) => a.order - b.order);

  chapters.forEach((ch, index) => {
    const prevChapter = chapters[index - 1];
    const nextChapter = chapters[index + 1];

    // Statik Bölüm Sayfası Üret (SEO Uyumlu HTML)
    const chapterHtmlDir = path.join(distDir, 'chapters', ch.slug);
    fs.mkdirSync(chapterHtmlDir, { recursive: true });

    const htmlContent = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${ch.novelTitle} - ${ch.title}</title>
  <link rel="stylesheet" href="/css/reader.css">
</head>
<body class="reader-body">
  <header class="reader-header">
    <a href="/novels/${ch.novelSlug}">← ${ch.novelTitle}</a>
  </header>
  <main class="reader-content">
    <h1>${ch.title}</h1>
    <div class="chapter-text">${ch.contentHtml}</div>
    <nav class="chapter-nav">
      ${prevChapter ? `<a href="/chapters/${prevChapter.slug}">← Önceki Bölüm</a>` : ''}
      ${nextChapter ? `<a href="/chapters/${nextChapter.slug}">Sonraki Bölüm →</a>` : ''}
    </nav>
  </main>
</body>
</html>`;

    fs.writeFileSync(path.join(chapterHtmlDir, 'index.html'), htmlContent);
  });

  fs.writeFileSync(path.join(distDir, 'content/chapters-index.json'), JSON.stringify(chapters, null, 2));
  console.log(`✅ ${chapters.length} bölüm için statik HTML okuma sayfaları üretildi.`);
}

// 3. STATİK DOSYALARI KOPYALA
function copyAssets() {
  if (fs.existsSync(srcDir)) fs.cpSync(srcDir, distDir, { recursive: true });
  if (fs.existsSync(adminDir)) fs.cpSync(adminDir, path.join(distDir, 'admin'), { recursive: true });
  if (fs.existsSync(staticDir)) fs.cpSync(staticDir, distDir, { recursive: true });
  console.log('✅ Statik dosyalar kopyalandı.');
}

buildNovels();
buildChapters();
copyAssets();
console.log('🎉 SSG Derlemesi Tamamlandı!');
