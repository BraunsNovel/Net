import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { marked } from 'marked';

// ESM modülünde __dirname tanımı
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Yollar (Girdi ve Çıktı Dizinleri)
const chaptersDir = path.join(__dirname, '../content/chapters');
const novelsDir = path.join(__dirname, '../content/novels');

const outputDir = path.join(__dirname, '../src/content');
const outputChaptersDir = path.join(__dirname, '../src/content/chapters');

// Çıktı klasörlerini otomatik oluştur (Yoksa hata almamak için)
if (!fs.existsSync(outputChaptersDir)) {
  fs.mkdirSync(outputChaptersDir, { recursive: true });
}

// ==========================================
// 1. BÖLÜMLERİ DERLEME FONKSİYONU
// ==========================================
function buildChapters() {
  if (!fs.existsSync(chaptersDir)) {
    console.log('\x1b[33m[Build Bilgi]\x1b[0m "content/chapters" dizini bulunamadı. Boş liste üretiliyor.');
    fs.writeFileSync(path.join(outputDir, 'chapters-index.json'), JSON.stringify([], null, 2));
    return;
  }

  const files = fs.readdirSync(chaptersDir);
  const chapters = [];

  // Markdown dosyalarını oku ve ayrıştır
  files.forEach(file => {
    if (!file.endsWith('.md')) return;

    const filePath = path.join(chaptersDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // gray-matter ile YAML başlıklarını, marked ile içerik HTML'ini al
    const { data: meta, content } = matter(fileContent);
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

  // Bölümleri 'order' değerine göre sırala
  chapters.sort((a, b) => a.order - b.order);

  const chapterSummaryList = [];

  // Her bölümün tekli JSON'unu ve genel özet listesini oluştur
  chapters.forEach((ch, index) => {
    const prevChapter = chapters[index - 1];
    const nextChapter = chapters[index + 1];

    const finalChapterJson = {
      ...ch,
      prevSlug: prevChapter ? prevChapter.slug : null,
      nextSlug: nextChapter ? nextChapter.slug : null
    };

    // Bölüme özel detay JSON dosyası (read.html okur)
    const outputPath = path.join(outputChaptersDir, `${ch.slug}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(finalChapterJson, null, 2));

    // Ana sayfa için özet veri
    chapterSummaryList.push({
      title: ch.title,
      slug: ch.slug,
      novelSlug: ch.novelSlug,
      order: ch.order,
      date: ch.date
    });
  });

  // Tüm bölümlerin indeks listesini kaydet (index.html ve app.js okur)
  fs.writeFileSync(
    path.join(outputDir, 'chapters-index.json'),
    JSON.stringify(chapterSummaryList, null, 2)
  );

  console.log(`\x1b[32m[Build Başarılı]\x1b[0m ${chapters.length} bölüm ve "chapters-index.json" üretildi.`);
}

// ==========================================
// 2. ROMAN BİLGİLERİNİ DERLEME FONKSİYONU
// ==========================================
function buildNovels() {
  if (!fs.existsSync(novelsDir)) {
    console.log('\x1b[33m[Build Bilgi]\x1b[0m "content/novels" dizini bulunamadı. Boş liste üretiliyor.');
    fs.writeFileSync(path.join(outputDir, 'novels-index.json'), JSON.stringify([], null, 2));
    return;
  }

  const files = fs.readdirSync(novelsDir);
  const novels = [];

  files.forEach(file => {
    if (!file.endsWith('.md')) return;

    const filePath = path.join(novelsDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data: meta, content } = matter(fileContent);

    novels.push({
      title: meta.title || 'İsimsiz Roman',
      slug: meta.slug || file.replace('.md', ''),
      cover: meta.cover || '',
      author: meta.author || 'An Ri',
      status: meta.status || 'Devam Ediyor',
      description: meta.description || content.trim(),
      tags: meta.tags || []
    });
  });

  // Roman listesini kaydet
  fs.writeFileSync(
    path.join(outputDir, 'novels-index.json'),
    JSON.stringify(novels, null, 2)
  );

  console.log(`\x1b[32m[Build Başarılı]\x1b[0m ${novels.length} roman ve "novels-index.json" üretildi.`);
}

// DERLEMEYİ ÇALIŞTIR
buildChapters();
buildNovels();
