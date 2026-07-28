import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { marked } from 'marked';

// ESM modülünde __dirname tanımı
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Yollar (Input ve Output)
const chaptersDir = path.join(__dirname, '../content/chapters');
const outputDir = path.join(__dirname, '../src/content/chapters');

// Çıktı klasörünü oluştur
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function buildChapters() {
  if (!fs.existsSync(chaptersDir)) {
    console.log('[Build] Henüz "content/chapters" dizini veya bölüm dosyası yok.');
    return;
  }

  const files = fs.readdirSync(chaptersDir);
  const chapters = [];

  // 1. Tüm Markdown dosyalarını oku ve gray-matter / marked ile işle
  files.forEach(file => {
    if (!file.endsWith('.md')) return;

    const filePath = path.join(chaptersDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // gray-matter ile YAML metadata ve içerik ayrıştırma
    const { data: meta, content } = matter(fileContent);

    // marked ile Markdown -> HTML dönüşümü
    const htmlContent = marked.parse(content);

    chapters.push({
      title: meta.title || 'İsimsiz Bölüm',
      slug: meta.slug || file.replace('.md', ''),
      novelSlug: meta.novelSlug || '',
      order: parseInt(meta.order) || 1,
      date: meta.date || new Date().toISOString(),
      contentHtml: htmlContent
    });
  });

  // 2. Bölümleri sıraya diz (order değerine göre)
  chapters.sort((a, b) => a.order - b.order);

  // 3. Her bölüm için prev/next bağlantılarını hesaplayıp JSON üret
  chapters.forEach((ch, index) => {
    const prevChapter = chapters[index - 1];
    const nextChapter = chapters[index + 1];

    const finalJson = {
      ...ch,
      prevSlug: prevChapter ? prevChapter.slug : null,
      nextSlug: nextChapter ? nextChapter.slug : null
    };

    const outputPath = path.join(outputDir, `${ch.slug}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(finalJson, null, 2));
  });

  console.log(`\x1b[32m[Build Başarılı]\x1b[0m ${chapters.length} bölüm JSON formatına derlendi.`);
}

buildChapters();
