const urlParams = new URLSearchParams(window.location.search);
const chapterSlug = urlParams.get('chapter'); // 'slug' yerine 'chapter' kullanıyoruz

const chapterTitleEl = document.getElementById('chapter-title') || document.getElementById('chapterTitle');
const novelTitleEl = document.getElementById('novel-title') || document.getElementById('novelTitle');
const translatorNoteEl = document.getElementById('translator-note') || document.getElementById('translatorNote');
const contentArea = document.getElementById('chapter-content') || document.getElementById('chapterContent');
const prevBtn = document.getElementById('prev-chapter-btn') || document.getElementById('prevBtn');
const nextBtn = document.getElementById('next-chapter-btn') || document.getElementById('nextBtn');
const progressBar = document.getElementById('progressBar');

async function loadChapter() {
    if (!chapterSlug) {
        if(contentArea) contentArea.innerHTML = '<p>Bölüm bulunamadı. Lütfen ana sayfadan bir bölüm seçin.</p>';
        return;
    }

    try {
        const response = await fetch(`/content/chapters/${chapterSlug}.json`);
        if (!response.ok) throw new Error('Bölüm yüklenemedi');
        
        const data = await response.json();

        if (document.title) document.title = `${data.title} - ${data.novelTitle}`;
        if (chapterTitleEl) chapterTitleEl.textContent = data.title;
        if (novelTitleEl) novelTitleEl.textContent = data.novelTitle;

        if (translatorNoteEl && data.translator_note) {
            translatorNoteEl.innerHTML = `<strong>Çevirmen Notu:</strong><br>${data.translator_note}`;
            translatorNoteEl.classList.remove('hidden');
        }

        if (contentArea) contentArea.innerHTML = data.contentHtml;

        if (prevBtn && data.prevSlug) {
            prevBtn.href = `read.html?chapter=${data.prevSlug}`;
            prevBtn.classList.remove('disabled');
        }
        if (nextBtn && data.nextSlug) {
            nextBtn.href = `read.html?chapter=${data.nextSlug}`;
            nextBtn.classList.remove('disabled');
        }

        restoreScrollPosition();

    } catch (error) {
        console.error(error);
        if (contentArea) contentArea.innerHTML = '<p>Bu bölüm yüklenirken bir hata oluştu.</p>';
    }
}

// İlerleme Çubuğu ve Kaydırma Kaydı
window.addEventListener('scroll', () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    if (progressBar) progressBar.style.width = scrolled + "%";
    
    localStorage.setItem(`scroll_${chapterSlug}`, winScroll);
});

function restoreScrollPosition() {
    const savedScroll = localStorage.getItem(`scroll_${chapterSlug}`);
    if (savedScroll) {
        window.scrollTo(0, parseInt(savedScroll));
    }
}

// Ayarlar (Tema, Font, Boyut)
function loadSettings() {
    const savedTheme = localStorage.getItem('reader_theme') || 'theme-light';
    const savedFont = localStorage.getItem('reader_font') || 'font-sans';
    const savedSize = localStorage.getItem('reader_font_size') || 18;

    document.body.classList.add(savedTheme, savedFont);
    if (contentArea) contentArea.style.fontSize = `${savedSize}px`;

    // Buton aktifliklerini güncelle (Eğer ayar paneli varsa)
    document.querySelector(`[data-theme="${savedTheme}"]`)?.classList.add('active');
    document.querySelector(`[data-font="${savedFont}"]`)?.classList.add('active');
}

// Klavye Desteği
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' && nextBtn && !nextBtn.classList.contains('disabled')) {
        window.location.href = nextBtn.href;
    } else if (e.key === 'ArrowLeft' && prevBtn && !prevBtn.classList.contains('disabled')) {
        window.location.href = prevBtn.href;
    }
});

// Başlat
loadSettings();
loadChapter();
