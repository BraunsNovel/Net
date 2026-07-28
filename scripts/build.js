import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { marked } from 'marked';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Türkçe Uyumlu Slugify Fonksiyonu (URL Çökmelerini Önler)
function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9\-]/g, '');
}

// Dizinler
const chaptersDir = path.join(__dirname, '../content/chapters');
const novelsDir = path.join(__dirname, '../content/novels');
const srcUploadsDir = path.join(__dirname, '../src/uploads');
const adminDir = path.join(__dirname, '../admin');

const outputDir = path.join(__dirname, '../dist/content');
const outputChaptersDir = path.join(__dirname, '../dist/content/chapters');
const distAdminDir = path.join(__dirname, '../dist/admin');

// Çıktı klasörlerini hazırla
if (!fs.existsSync(srcUploadsDir)) fs.mkdirSync(srcUploadsDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
if (!fs.existsSync(outputChaptersDir)) fs.mkdirSync(outputChaptersDir, { recursive: true });

// Novel verilerini oku (Bölümlere novel adı eşleştirmek için)
let novelsData = {};
if (fs.existsSync(novelsDir)) {
  const novelFiles = fs.readdirSync(novelsDir).filter(f => f.endsWith('.md'));
  novelFiles.forEach(file => {
    const { data: meta } = matter(fs.readFileSync(path.join(novelsDir, file), 'utf-8'));
    const rawSlug = meta.slug || file.replace('.md', '');
    novelsData[slugify(rawSlug)] = meta.title || 'İsimsiz Novel';
  });
}

// 1. NOVELLERİ DERLE
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

// 2. BÖLÜMLERİ DERLE
function buildChapters() {
  if (!fs.existsSync(chaptersDir)) {
    fs.writeFileSync(path.join(outputDir, 'chapters-index.json'), JSON.stringify([], null, 2));
    return;
  }
  const files = fs.readdirSync(chaptersDir).filter(f => f.endsWith('.md'));
  const chapters = files.map(file => {
    const { data: meta, content: rawContent } = matter(fs.readFileSync(path.join(chaptersDir, file), 'utf-8'));
    
    // Esnek Slug Kontrolü (hem novel_slug hem novelSlug desteği)
    const rawNovelSlug = meta.novel_slug || meta.novelSlug || '';
    const cleanNovelSlug = slugify(rawNovelSlug);

    return {
      title: meta.title || 'İsimsiz Bölüm',
      slug: slugify(meta.slug || file.replace('.md', '')),
      novelSlug: cleanNovelSlug,
      novelTitle: novelsData[cleanNovelSlug] || 'Web Novel',
      order: parseInt(meta.chapter_number || meta.order) || 0,
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
    summaries.push({ 
      title: ch.title, 
      slug: ch.slug, 
      novelSlug: ch.novelSlug, 
      novelTitle: ch.novelTitle, 
      order: ch.order, 
      date: ch.date 
    });
  });
  fs.writeFileSync(path.join(outputDir, 'chapters-index.json'), JSON.stringify(summaries, null, 2));
  console.log(`✅ ${chapters.length} bölüm derlendi.`);
}

// 3. STATİK DOSYALARI (SRC VE ADMIN) DIST İÇİNE KOPYALA
function copyStaticFiles() {
  const src = path.join(__dirname, '../src');
  const dist = path.join(__dirname, '../dist');
  
  // SRC -> DIST
  if (fs.existsSync(src)) {
    fs.cpSync(src, dist, { recursive: true });
    console.log('✅ src klasörü dist içine kopyalandı.');
  }

  // ADMIN -> DIST/ADMIN (Decap CMS'in çalışması için şart!)
  if (fs.existsSync(adminDir)) {
    fs.cpSync(adminDir, distAdminDir, { recursive: true });
    console.log('✅ admin klasörü dist/admin içine kopyalandı.');
  }
}

buildNovels();
buildChapters();
copyStaticFiles();
console.log('🎉 Build tamamlandı!');
