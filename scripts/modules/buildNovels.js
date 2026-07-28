import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { slugify } from '../utils/slugify.js';

export function buildNovels(novelsDir, distDir, novelsMap) {
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

    searchIndex.push({
      title: novelData.title,
      original_title: novelData.original_title,
      slug: novelData.slug,
      cover: novelData.cover,
      author: novelData.author,
      genres: novelData.genres
    });

    genres.forEach(g => {
      genresMap[g] = (genresMap[g] || 0) + 1;
    });

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

  fs.writeFileSync(path.join(contentDir, 'novels-index.json'), JSON.stringify(novels, null, 2));
  fs.writeFileSync(path.join(contentDir, 'search.json'), JSON.stringify(searchIndex, null, 2));
  fs.writeFileSync(path.join(contentDir, 'genres.json'), JSON.stringify(genresMap, null, 2));

  console.log(`✅ ${novels.length} roman için HTML, search.json ve genres.json üretildi.`);
  return novels;
}
