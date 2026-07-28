const fs = require('fs');
const path = require('path');

// Yollar
const chaptersDir = path.join(__dirname, '../content/chapters');
const novelsDir = path.join(__dirname, '../content/novels');
const outputDir = path.join(__dirname, '../src/content');

// Klasörleri Oluştur (Yoksa)
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
const outputChaptersDir = path.join(outputDir, 'chapters');
if (!fs.existsSync(outputChaptersDir)) fs.mkdirSync(outputChaptersDir, { recursive: true });

// Basit Markdown -> HTML Dönüştürücü
function parseMarkdown(mdText) {
  return mdText
    .split('\n\n')
    .map(p => p.trim() ? `<p>${p.replace(/\n/g, '<br>')}</p>` : '')
    .join('');
}

// Front-Matter (YAML metadata) Parse İşlemi
function parseFrontMatter(fileContent) {
  const match = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: fileContent };

  const metaLines = match[1].split('\n');
  const meta = {};
  metaLines.forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      meta[key.trim()] = valueParts.join(':').trim().replace(/^['"]|['"]$/g, '');
    }
  });

  return { meta, body: match[2] };
}

// 1. Bölümleri Derle
function buildChapters() {
  if (!fs.existsSync(chaptersDir)) return [];

  const files = fs.readdirSync(chaptersDir);
  const chapters = [];

  files.forEach(file => {
    if (!file.endsWith('.md')) return;
    const rawContent = fs.readFileSync(path.join(chaptersDir, file), 'utf-8');
    const { meta, body } = parseFrontMatter(rawContent);

    const chapterData = {
      title: meta.title || 'İsimsiz Bölüm',
      slug: meta.slug || file.replace('.md', ''),
      novelSlug: meta.novelSlug || '',
      order: parseInt(meta.order) || 1,
      date: meta.date || new Date().toISOString(),
      contentHtml: parseMarkdown(body)
    };

    chapters.push(chapterData);
  });

  // Bölümleri sıraya diz
  chapters.sort((a, b) => a.order - b.order);

  // Her bölüm için prev/next bağlantılarını hesapla ve JSON olarak kaydet
  chapters.forEach((ch, index) => {
    const prevChapter = chapters[index - 1];
    const nextChapter = chapters[index + 1];

    const finalJson = {
      ...ch,
      prevSlug: prevChapter ? prevChapter.slug : null,
      nextSlug: nextChapter ? nextChapter.slug : null
    };

    fs.writeFileSync(
      path.join(outputChaptersDir, `${ch.slug}.json`),
      JSON.stringify(finalJson, null, 2)
    );
  });

  console.log(`[Build] ${chapters.length} bölüm derlendi.`);
  return chapters;
}

// Derlemeyi Çalıştır
buildChapters();
