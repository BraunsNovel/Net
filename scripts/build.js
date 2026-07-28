import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { marked } from 'marked';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. TÜRKÇE UYUMLU SLUGIFY (URL Çökmelerini Önler)
function slugify(text) {
  if (!text) return '';
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9\-]/g, '');
}

// 2. GÖRSEL KLASÖRÜNÜ GARANTİ ET (Kırık Resimleri Önler)
const srcUploadsDir = path.join(__dirname, '../src/uploads');
if (!fs.existsSync(srcUploadsDir)) fs.mkdirSync(srcUploadsDir, { recursive: true });

// Dizinler
const chaptersDir = path.join(__dirname, '../content/chapters');
const novelsDir = path.join(__dirname, '../content/novels');
const outputDir = path.join(__dirname, '../dist/content');
const outputChaptersDir = path.join(__dirname, '../dist/content/chapters');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
if (!fs.existsSync(outputChaptersDir)) fs.mkdirSync(outputChaptersDir, { recursive: true });

// Novel verilerini önce oku (Bölümlere başlık eşleştirmek için)
let novelsData = {};
if (fs.existsSync(novelsDir)) {
  const novelFiles = fs.readdirSync(novelsDir).filter(f => f.endsWith('.md'));
  novelFiles.forEach(file => {
    const { data: meta } = matter(fs.readFileSync(path.join(novelsDir, file), 'utf-8'));
    const rawSlug = meta.slug || file.replace('.md', '');
    novelsData[slugify(rawSlug)] = meta.title || 'İsimsiz Novel';
  });
}

// NOVELLERİ DERLE (Ana Sayfa İçin novels-index.json Üretir)
function buildNovels() {
  if (!fs.existsSync(novelsDir)) {
    fs.writeFileSync(path.join(outputDir, 'novels-index.json'), JSON.stringify([], null, 2));
    return;
  }
  const files = fs.readdirSync(novelsDir).filter(f => f.endsWith('.md'));
  const novels = files.map(file => {
    const { data: meta, content } = matter(fs.readFileSync(path.join(novelsDir, file), 'utf-8'));
    return {
      title: meta.title || 'İsimsiz Roman',
      slug: slugify(meta.slug || file.replace('.md', '')),
      original_title: meta.original_title || '',
      author: meta.author || 'Anonim',
      translator: meta.translator || 'Braun',
      cover: meta.cover || '',
      genres: meta.genres || [],
      status: meta.status || 'Devam Ediyor',
      description: marked.parse(content)
    };
  });
  fs.writeFileSync(path.join(outputDir, 'novels-index.json'), JSON.stringify(novels, null, 2));
  console.log(`✅ ${novels.length} novel derlendi.`);
}

// BÖLÜMLERİ DERLE (Ana Sayfa İçin chapters-index.json Üretir)
function buildChapters() {
  if (!fs.existsSync(chaptersDir)) {
    fs.writeFileSync(path.join(outputDir, 'chapters-index.json'), JSON.stringify([], null, 2));
    return;
  }
  const files = fs.readdirSync(chaptersDir).filter(f => f.endsWith('.md'));
  const chapters = files.map(file => {
    const { data: meta, content: rawContent } = matter(fs.readFileSync(path.join(chaptersDir, file), 'utf-8'));
    return {
      title: meta.title || 'İsimsiz Bölüm',
      slug: slugify(meta.slug || file.replace('.md', '')),
      novelSlug: slugify(meta.novel_slug || ''),
      novelTitle: novelsData[slugify(meta.novel_slug || '')] || 'Web Novel',
      order: parseInt(meta.chapter_number) || 0,
      date: meta.date || new Date().toISOString(),
      translator_note: meta.translator_note ? marked.parse(meta.translator_note) : '',
      contentHtml: marked.parse(meta.body || rawContent)
    };
  }).sort((a, b) => a.order - b.order);

  const summaries = [];
  chapters.forEach((ch, i) => {
    const finalJson = {
      ...ch,
      prevSlug: chapters[i - 1] ? chapters[i - 1].slug : null,
      nextSlug: chapters[i + 1] ? chapters[i + 1].slug : null
    };
    fs.writeFileSync(path.join(outputChaptersDir, `${ch.slug}.json`), JSON.stringify(finalJson, null, 2));
    summaries.push({ title: ch.title, slug: ch.slug, novelSlug: ch.novelSlug, novelTitle: ch.novelTitle, order: ch.order, date: ch.date });
  });
  fs.writeFileSync(path.join(outputDir, 'chapters-index.json'), JSON.stringify(summaries, null, 2));
  console.log(`✅ ${chapters.length} bölüm derlendi.`);
}

// SRC'Yİ DIST'E KOPYALA (Tasarım ve Görsellerin Yayınlanması İçin)
function copySrc() {
  const src = path.join(__dirname, '../src');
  const dist = path.join(__dirname, '../dist');
  if (fs.existsSync(src)) {
    fs.cpSync(src, dist, { recursive: true });
    console.log('✅ src klasörü dist içine kopyalandı.');
  }
}

buildNovels();
buildChapters();
copySrc();
console.log('🎉 Build tamamlandı!');
