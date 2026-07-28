import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { marked } from 'marked';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🛡️ YENİ: Türkçe karakterleri destekleyen Slugify fonksiyonu
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Boşlukları tire (-) yap
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\-]/g, '');   // Sadece harf, rakam ve tire kalsın
}

// 🛡️ YENİ: src/uploads klasörünün varlığını garanti et
const srcUploadsDir = path.join(__dirname, '../src/uploads');
if (!fs.existsSync(srcUploadsDir)) {
  fs.mkdirSync(srcUploadsDir, { recursive: true });
}

const chaptersDir = path.join(__dirname, '../content/chapters');
const novelsDir = path.join(__dirname, '../content/novels');
const outputDir = path.join(__dirname, '../dist/content');
const outputChaptersDir = path.join(__dirname, '../dist/content/chapters');

if (!fs.existsSync(outputChaptersDir)) {
  fs.mkdirSync(outputChaptersDir, { recursive: true });
}

// 1. NOVELLERİ DERLE
function buildNovels() {
  if (!fs.existsSync(novelsDir)) {
    console.log('⚠️ "content/novels" dizini bulunamadı.');
    fs.writeFileSync(path.join(outputDir, 'novels-index.json'), JSON.stringify([], null, 2));
    return;
  }

  const files = fs.readdirSync(novelsDir).filter(f => f.endsWith('.md'));
  const novels = [];

  files.forEach(file => {
    const filePath = path.join(novelsDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data: meta, content } = matter(fileContent);
    
    // 🛡️ DÜZELTME: Slug'ı temizle (Frontmatter'da varsa onu, yoksa dosya adını al ve temizle)
    const rawSlug = meta.slug || file.replace('.md', '');
    const cleanSlug = slugify(rawSlug);

    novels.push({
      title: meta.title || 'İsimsiz Roman',
      slug: cleanSlug, // Temizlenmiş slug kullanılıyor
      original_title: meta.original_title || '',
      author: meta.author || 'An Ri',
      translator: meta.translator || 'Braun',
      cover: meta.cover || '',
      genres: meta.genres || [],
      status: meta.status || 'Devam Ediyor',
      description: marked.parse(content)
    });
  });

  fs.writeFileSync(path.join(outputDir, 'novels-index.json'), JSON.stringify(novels, null, 2));
  console.log(`✅ ${novels.length} novel başarıyla derlendi.`);
}

// 2. BÖLÜMLERİ DERLE
function buildChapters() {
  if (!fs.existsSync(chaptersDir)) {
    console.log('⚠️ "content/chapters" dizini bulunamadı.');
    fs.writeFileSync(path.join(outputDir, 'chapters-index.json'), JSON.stringify([], null, 2));
    return;
  }

  // Novel verilerini önce yükle (başlık eşleştirmesi için)
  let novelsData = {};
  if (fs.existsSync(novelsDir)) {
    const novelFiles = fs.readdirSync(novelsDir).filter(f => f.endsWith('.md'));
    novelFiles.forEach(file => {
      const filePath = path.join(novelsDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const { data: meta } = matter(fileContent);
      const rawSlug = meta.slug || file.replace('.md', '');
      novelsData[slugify(rawSlug)] = meta.title || 'İsimsiz Novel';
    });
  }

  const files = fs.readdirSync(chaptersDir).filter(f => f.endsWith('.md'));
  const chapters = [];

  files.forEach(file => {
    const filePath = path.join(chaptersDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data: meta, content: rawContent } = matter(fileContent);

    const novelSlug = slugify(meta.novel_slug || '');
    const chapterNumber = parseInt(meta.chapter_number) || 0;
    
    // 🛡️ DÜZELTME: Bölüm slug'ını da temizle
    const rawChapterSlug = meta.slug || file.replace('.md', '');
    const cleanChapterSlug = slugify(rawChapterSlug);

    chapters.push({
      title: meta.title || 'İsimsiz Bölüm',
      slug: cleanChapterSlug, // Temizlenmiş slug
      novelSlug: novelSlug,
      novelTitle: novelsData[novelSlug] || 'Web Novel',
      order: chapterNumber,
      date: meta.date || new Date().toISOString(),
      translator_note: meta.translator_note ? marked.parse(meta.translator_note) : '',
      contentHtml: marked.parse(meta.body || rawContent)
    });
  });

  chapters.sort((a, b) => a.order - b.order);
  const chapterSummaryList = [];

  chapters.forEach((ch, index) => {
    const prevChapter = chapters[index - 1];
    const nextChapter = chapters[index + 1];

    const finalChapterJson = {
      ...ch,
      prevSlug: prevChapter ? prevChapter.slug : null,
      nextSlug: nextChapter ? nextChapter.slug : null
    };

    const outputPath = path.join(outputChaptersDir, `${ch.slug}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(finalChapterJson, null, 2));

    chapterSummaryList.push({
      title: ch.title,
      slug: ch.slug,
      novelSlug: ch.novelSlug,
      novelTitle: ch.novelTitle,
      order: ch.order,
      date: ch.date
    });
  });

  fs.writeFileSync(path.join(outputDir, 'chapters-index.json'), JSON.stringify(chapterSummaryList, null, 2));
  console.log(`✅ ${chapters.length} bölüm başarıyla derlendi.`);
}

// 3. SRC KLASÖRÜNÜ DIST'E KOPYALA
function copySrcToDist() {
  const srcDir = path.join(__dirname, '../src');
  const distDir = path.join(__dirname, '../dist');
  
  if (fs.existsSync(srcDir)) {
    fs.cpSync(srcDir, distDir, { recursive: true });
    console.log('✅ src klasöründeki tasarım dosyaları dist klasörüne kopyalandı.');
  }
}

// Çalıştır
buildNovels();
buildChapters();
copySrcToDist();
console.log('🎉 Build işlemi tamamlandı! dist klasörü yayına hazır.');
