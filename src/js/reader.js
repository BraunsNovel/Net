document.addEventListener('DOMContentLoaded', () => {
  // DOM Elemanları
  const body = document.body;
  const contentArea = document.getElementById('chapter-content');
  const novelTitleEl = document.getElementById('novel-title');
  const chapterTitleEl = document.getElementById('chapter-title');
  const prevBtn = document.getElementById('prev-chapter-btn');
  const nextBtn = document.getElementById('next-chapter-btn');
  const fontFamilyBtn = document.getElementById('font-family-toggle');
  
  // Varsayılan Ayarlar ve LocalStorage Yüklemesi
  let fontSize = parseInt(localStorage.getItem('reader_font_size')) || 18;
  let currentTheme = localStorage.getItem('reader_theme') || 'theme-dark';
  let fontFamily = localStorage.getItem('reader_font_family') || 'serif';

  // Ayarları Uygula
  applyTheme(currentTheme);
  applyFontSize(fontSize);
  applyFontFamily(fontFamily);

  // --- TEMA VE AYAR YÖNETİMİ ---
  function applyTheme(themeName) {
    body.classList.remove('theme-dark', 'theme-light', 'theme-sepia');
    body.classList.add(themeName);
    localStorage.setItem('reader_theme', themeName);
  }

  function applyFontSize(size) {
    fontSize = Math.min(Math.max(size, 14), 26); // Min 14px, Max 26px
    contentArea.style.fontSize = `${fontSize}px`;
    localStorage.setItem('reader_font_size', fontSize);
  }

  function applyFontFamily(family) {
    if (family === 'serif') {
      contentArea.classList.remove('font-sans');
      contentArea.classList.add('font-serif');
      fontFamilyBtn.innerText = 'Serif';
    } else {
      contentArea.classList.remove('font-serif');
      contentArea.classList.add('font-sans');
      fontFamilyBtn.innerText = 'Sans';
    }
    fontFamily = family;
    localStorage.setItem('reader_font_family', family);
  }

  // Dinleyiciler
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', (e) => applyTheme(e.target.dataset.theme));
  });

  document.getElementById('font-increase').addEventListener('click', () => applyFontSize(fontSize + 1));
  document.getElementById('font-decrease').addEventListener('click', () => applyFontSize(fontSize - 1));
  fontFamilyBtn.addEventListener('click', () => applyFontFamily(fontFamily === 'serif' ? 'sans' : 'serif'));

  // --- İÇERİK YÜKLEME SİMÜLASYONU VE PARSER ---
  const urlParams = new URLSearchParams(window.location.search);
  const chapterSlug = urlParams.get('slug') || 'bolum-1';

  loadChapterData(chapterSlug);

  async function loadChapterData(slug) {
    try {
      // CMS verisine veya JSON çıktısına istek atılır
      // Not: Build adımı sonrasında üretilen içerik dizininden çekilir
      const response = await fetch(`/content/chapters/${slug}.json`);
      if (!response.ok) throw new Error('Bölüm bulunamadı.');
      
      const data = await response.json();

      document.title = `${data.title} | ${data.novelTitle}`;
      novelTitleEl.innerText = data.novelTitle || 'Web Novel';
      chapterTitleEl.innerText = data.title;
      contentArea.innerHTML = data.contentHtml;

      // Gezinti Butonları
      if (data.prevSlug) {
        prevBtn.href = `read.html?slug=${data.prevSlug}`;
        prevBtn.classList.remove('disabled');
      }
      if (data.nextSlug) {
        nextBtn.href = `read.html?slug=${data.nextSlug}`;
        nextBtn.classList.remove('disabled');
      }

      // Okuma Konumunu Hatırla
      restoreScrollPosition(slug);
      window.addEventListener('scroll', () => saveScrollPosition(slug));

    } catch (err) {
      contentArea.innerHTML = `<p class="error-text">Bölüm içeriği yüklenirken bir hata oluştu veya henüz yayınlanmadı.</p>`;
    }
  }

  function saveScrollPosition(slug) {
    const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
    localStorage.setItem(`scroll_${slug}`, scrollPercent);
  }

  function restoreScrollPosition(slug) {
    const savedPercent = localStorage.getItem(`scroll_${slug}`);
    if (savedPercent) {
      const targetScroll = parseFloat(savedPercent) * (document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
  }
});
