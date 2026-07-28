const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

// Çıktı klasörünü oluştur
const outputDir = path.join(__dirname, '../dist/data');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 1. Novelleri İşle
const novelsDir = path.join(__dirname, '../content/novels');
const novels = [];

if (fs.existsSync(novelsDir)) {
  const files = fs.readdirSync(novelsDir).filter(f => f.endsWith('.md'));
  files.forEach(file => {
    const filePath = path.join(novelsDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);
    
    novels.push({
      slug: file.replace('.md', ''),
      title: data.title,
      original_title: data.original_title || '',
      author: data.author,
      translator: data.translator,
      cover: data.cover,
      genres: data.genres || [],
      status: data.status,
      description: marked.parse(content), // Markdown açıklamayı HTML'e çevir
    });
  });
}

// 2. Bölümleri İşle ve Novellere Bağla
const chaptersDir = path.join(__dirname, '../content/chapters');
const chaptersByNovel = {};

if (fs.existsSync(chaptersDir)) {
  const files = fs.readdirSync(chaptersDir).filter(f => f.endsWith('.md'));
  files.forEach(file => {
    const filePath = path.join(chaptersDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);
    
    const novelSlug = data.novel_slug;
    if (!chaptersByNovel[novelSlug]) {
      chaptersByNovel[novelSlug] = [];
    }

    chaptersByNovel[novelSlug].push({
      slug: file.replace('.md', ''),
      chapter_number: data.chapter_number,
      title: data.title,
      date: data.date,
      translator_note: data.translator_note ? marked.parse(data.translator_note) : '',
      content: marked.parse(content), // Bölüm içeriğini HTML'e çevir
    });
  });
}

// Bölümleri numarasına göre sırala (Küçükten büyüğe)
for (const novelSlug in chaptersByNovel) {
  chaptersByNovel[novelSlug].sort((a, b) => a.chapter_number - b.chapter_number);
}

// 3. JSON Dosyalarını Yaz
fs.writeFileSync(
  path.join(outputDir, 'novels.json'),
  JSON.stringify(novels, null, 2)
);

fs.writeFileSync(
  path.join(outputDir, 'chapters.json'),
  JSON.stringify(chaptersByNovel, null, 2)
);

console.log('✅ Build tamamlandı! Veriler dist/data/ klasörüne yazıldı.');
