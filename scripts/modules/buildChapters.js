import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { slugify } from '../utils/slugify.js';

export function buildChapters(chaptersDir, distDir, novelsMap) {
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
