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

const chaptersDir = path.join(__dirname, '../content/chapters');
const novelsDir = path.join(__dirname, '../content/novels');
const srcDir = path.join(__dirname, '../src');
const adminDir = path.join(__dirname, '../admin');
const staticDir = path.join(__dirname, '../static');
const distDir = path.join(__dirname, '../dist');

if (fs.existsSync(distDir)) fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

const novelsMap = {};

// 1. NOVELLERİ DERLE, SEO HTML VE İNDEKS JSON'LARI ÜRET
function buildNovels() {
  if (!fs.existsSync(novelsDir)) return [];

  const files = fs.readdirSync(novelsDir).filter(f => f.endsWith('.md'));
  const searchIndex = [];
  const genresMap = {};

  const novels = files.map(file => {
    const { data: meta, content } = matter(fs.readFileSync(path.join(novelsDir, file), 'utf-8'));
    const cleanSlug = slugify(meta.slug || file.replace('.md', ''));
    const genres = Array.isArray(meta.genres) ? meta.genres : ['Genel'];

    novelsMap[cleanSlug] = meta.title || 'İsimsiz Roman';

    const novelData = {
      title: meta.title || 'İsimsiz Roman',
      original_title: meta.original_title || '',
      slug: cleanSlug,
      author: meta.author || 'Anonim',
      translator: meta.translator || 'An Ri',
      cover: meta.cover || '',
      cover_bg: meta.cover_bg || '#1e1e24',
      release_year: meta.release_year || null,
      status: meta.status || 'Devam Ediyor',
      genres: genres,
      featured: Boolean(meta.featured),
      seo_description: meta.seo_description || meta.title + ' web novel serisini Türkçe oku.',
      seo_keywords: meta.seo_keywords || 'web novel, oku, light novel',
      descriptionHtml: marked.parse(content)
    };

    // Arama İndeksine Ekle (Sadece hafif veriler)
    searchIndex.push({
      title: novelData.title,
      original_title: novelData.original_title,
      slug: novelData.slug,
      cover: novelData.cover,
      author: novelData.author,
      genres: novelData.genres
    });

    // Tür Haritasını Güncelle
    genres.forEach(g => {
      genresMap[g] = (genresMap[g] || 0) + 1;
    });

    // SEO Uyumlu Statik Novel HTML Sayfası
    const novelHtmlDir = path.join(distDir, 'novels', cleanSlug);
    fs.mkdirSync(novelHtmlDir, { recursive: true });

    const htmlContent = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${novelData.title} - Web Novel Oku</title>
  <meta name="description" content="${novelData.seo_description}">
  <meta name="keywords" content="${novelData.seo_keywords}">
  <meta property="og:title" content="${novelData.title}">
  <meta property="og:description" content="${novelData.seo_description}">
  <meta property="og:image" content="${novelData.cover}">
  <link rel="stylesheet" href="/css/style.css">
</head>
<body style="--accent-color: ${novelData.cover_bg}">
  <main class="container">
    <a href="/" class="back-link">← Ana Sayfa</a>
    <article class="novel-detail">
      <div class="novel-header">
        ${novelData.cover ? `<img src="${novelData.cover}" alt="${novelData.title}" class="novel-cover">` : ''}
        <div class="novel-meta">
          <h1>${novelData.title}</h1>
          ${novelData.original_title ? `<h2 class="orig-title">${novelData.original_title}</h2>` : ''}
          <p><strong>Yazar:</strong> ${novelData.author} | <strong>Çevirmen:</strong> ${novelData.translator}</p>
          <p><strong>Durum:</strong> ${novelData.status} ${novelData.release_year ? `(${novelData.release_year})` : ''}</p>
          <div class="genres">${novelData.genres.map(g => `<span class="tag">${g}</span>`).join(' ')}</div>
        </div>
      </div>
      <div class="novel-description">${novelData.descriptionHtml}</div>
    </article>
  </main>
</body>
</html>`;

    fs.writeFileSync(path.join(novelHtmlDir, 'index.html'), htmlContent);
    return novelData;
  });

  const contentDir = path.join(distDir, 'content');
  fs.mkdirSync(contentDir, { recursive: true });

  // İndeks Dosyalarını Kaydet
  fs.writeFileSync(path.join(contentDir, 'novels-index.json'), JSON.stringify(novels, null, 2));
  fs.writeFileSync(path.join(contentDir, 'search.json'), JSON.stringify(searchIndex, null, 2));
  fs.writeFileSync(path.join(contentDir, 'genres.json'), JSON.stringify(genresMap, null, 2));

  console.log(`✅ ${novels.length} roman için HTML, search.json ve genres.json üretildi.`);
  return novels;
}

// 2. BÖLÜMLERİ DERLE & STATİK HTML ÜRET
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
      translator_note: meta.translator_note ? marked.parse(meta.translator_note) : '',
      contentHtml: marked.parse(content)
    };
  }).sort((a, b) => a.order - b.order);

  chapters.forEach((ch, index) => {
    const prevChapter = chapters[index - 1];
    const nextChapter = chapters[index + 1];

    const chapterHtmlDir = path.join(distDir, 'chapters', ch.slug);
    fs.mkdirSync(chapterHtmlDir, { recursive: true });

    const htmlContent = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${ch.novelTitle} - ${ch.title}</title>
  <meta name="description" content="${ch.novelTitle} serisinin ${ch.title} bölümünü Türkçe oku.">
  <link rel="stylesheet" href="/css/reader.css">
</head>
<body class="reader-body">
  <header class="reader-header">
    <a href="/novels/${ch.novelSlug}">← ${ch.novelTitle}</a>
  </header>
  <main class="reader-content">
    <h1>${ch.title}</h1>
    ${ch.translator_note ? `<div class="translator-note"><strong>Çevirmen Notu:</strong> ${ch.translator_note}</div>` : ''}
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
  console.log(`✅ ${chapters.length} bölüm için HTML sayfaları üretildi.`);
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
console.log('🎉 2. Aşama (SEO & Akıllı İndeksler) Tamamlandı!');
