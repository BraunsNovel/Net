import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { marked } from 'marked';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Girdi ve Çıktı Dizinleri (Netlify uyumlu: dist klasörüne yazıyoruz)
const chaptersDir = path.join(__dirname, '../content/chapters');
const novelsDir = path.join(__dirname, '../content/novels');
const outputDir = path.join(__dirname, '../dist/content');
const outputChaptersDir = path.join(__dirname, '../dist/content/chapters');

// Çıktı klasörlerini oluştur
if (!fs.existsSync(outputChaptersDir)) {
  fs.mkdirSync(outputChaptersDir, { recursive: true });
}

// Tüm novelleri önce yükle (Bölümlere novel başlığını ekleyebilmek için)
let novelsData = {};
if (fs.existsSync(novelsDir)) {
  const novelFiles = fs.readdirSync(novelsDir).filter(f => f.endsWith('.md'));
  novelFiles.forEach(file => {
    const filePath = path.join(novelsDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data: meta } = matter(fileContent);
    const slug = file.replace('.md', '');
    novelsData[slug] = meta.title || 'İsimsiz Novel';
  });
}

// Bölümleri Derle
function buildChapters() {
  if (!fs.existsSync(chaptersDir)) {
    console.log('⚠️ "content/chapters" dizini bulunamadı.');
    fs.writeFileSync(path.join(outputDir, 'chapters-index.json'), JSON.stringify([], null, 2));
    return;
  }

  const files = fs.readdirSync(chaptersDir).filter(f => f.endsWith('.md'));
  const chapters = [];

  files.forEach(file => {
    const filePath = path.join(chaptersDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data: meta, content: rawContent } = matter(fileContent);

    // CMS'den gelen alan adları: novel_slug, chapter_number, body
    const novelSlug = meta.novel_slug || '';
    const chapterNumber = parseInt(meta.chapter_number) || 0;
    
    chapters.push({
      title: meta.title || 'İsimsiz Bölüm',
      slug: file.replace('.md', ''),
      novelSlug: novelSlug,
      novelTitle: novelsData[novelSlug] || 'Web Novel', // Reader.js için kritik!
      order: chapterNumber,
      date: meta.date || new Date().toISOString(),
      translator_note: meta.translator_note ? marked.parse(meta.translator_note) : '',
      contentHtml: marked.parse(meta.body || rawContent) // CMS 'body' kullanır
    });
  });

  // Bölümleri numaraya göre sırala
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

    // Her bölüm için ayrı JSON (reader.js okur)
    const outputPath = path.join(outputChaptersDir, `${ch.slug}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(finalChapterJson, null, 2));

    // Ana liste için özet
    chapterSummaryList.push({
      title: ch.title,
      slug: ch.slug,
      novelSlug: ch.novelSlug,
      novelTitle: ch.novelTitle,
      order: ch.order,
      date: ch.date
    });
  });

  fs.writeFileSync(
    path.join(outputDir, 'chapters-index.json'),
    JSON.stringify(chapterSummaryList, null, 2)
  );
  console.log(`✅ ${chapters.length} bölüm başarıyla derlendi.`);
}

// Novelleri Derle
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
    const slug = file.replace('.md', '');

    novels.push({
      title: meta.title || 'İsimsiz Roman',
      slug: slug,
      original_title: meta.original_title || '',
      author: meta.author || 'An Ri',
      translator: meta.translator || 'Braun',
      cover: meta.cover || '',
      genres: meta.genres || [],
      status: meta.status || 'Devam Ediyor',
      description: marked.parse(content)
    });
  });

  fs.writeFileSync(
    path.join(outputDir, 'novels-index.json'),
    JSON.stringify(novels, null, 2)
  );
  console.log(`✅ ${novels.length} novel başarıyla derlendi.`);
}

buildChapters();
buildNovels();
