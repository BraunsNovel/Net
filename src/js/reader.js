// URL'den bölüm slug'ını al (örn: ?chapter=novel-adi-bolum-1)
const urlParams = new URLSearchParams(window.location.search);
const chapterSlug = urlParams.get('chapter');

// DOM Elementleri
const chapterTitleEl = document.getElementById('chapterTitle');
const novelTitleEl = document.getElementById('novelTitle');
const translatorNoteEl = document.getElementById('translatorNote');
const chapterContentEl = document.getElementById('chapterContent');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressBar = document.getElementById('progressBar');

// 1. Bölüm Verisini Yükle
async function loadChapter() {
    if (!chapterSlug) {
        chapterContentEl.innerHTML = '<p>Bölüm bulunamadı.</p>';
        return;
    }

    try {
        // Build.js tarafından oluşturulan JSON yolunu kullanıyoruz
        const response = await fetch(`/content/chapters/${chapterSlug}.json`);
        if (!response.ok) throw new Error('Bölüm yüklenemedi');
        
        const data = await response.json();

        // Başlıkları güncelle
        document.title = `${data.title} - ${data.novelTitle}`;
        chapterTitleEl.textContent = data.title;
        novelTitleEl.textContent = data.novelTitle;

        // Çevirmen notu varsa göster
        if (data.translator_note) {
            translatorNoteEl.innerHTML = `<strong>Çevirmen Notu:</strong><br>${data.translator_note}`;
            translatorNoteEl.classList.remove('hidden');
        }

        // İçeriği yerleştir
        chapterContentEl.innerHTML = data.contentHtml;

        // Önceki/Sonraki butonlarını ayarla
        if (data.prevSlug) {
            prevBtn.href = `read.html?chapter=${data.prevSlug}`;
            prevBtn.classList.remove('disabled');
        }
        if (data.nextSlug) {
            nextBtn.href = `read.html?chapter=${data.nextSlug}`;
            nextBtn.classList.remove('disabled');
        }

        // Sayfa yüklendiğinde kaydırma pozisyonunu geri yükle
        restoreScrollPosition();

    } catch (error) {
        console.error(error);
        chapterContentEl.innerHTML = '<p>Bu bölüm yüklenirken bir hata oluştu.</p>';
    }
}

// 2. Okuma İlerleme Çubuğu
window.addEventListener('scroll', () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    progressBar.style.width = scrolled + "%";
    
    // Kaydırma pozisyonunu kaydet (Her 500ms'de bir yapmak daha performanslıdır, ama basitlik için burada)
    localStorage.setItem(`scroll_${chapterSlug}`, winScroll);
});

function restoreScrollPosition() {
    const savedScroll = localStorage.getItem(`scroll_${chapterSlug}`);
    if (savedScroll) {
        window.scrollTo(0, parseInt(savedScroll));
    }
}

// 3. Ayarlar Paneli ve LocalStorage Yönetimi
const settingsToggle = document.getElementById('settingsToggle');
const settingsPanel = document.getElementById('settingsPanel');

settingsToggle.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
});

// Dışarı tıklandığında paneli kapat
document.addEventListener('click', (e) => {
    if (!settingsPanel.contains(e.target) && e.target !== settingsToggle) {
        settingsPanel.classList.add('hidden');
    }
});

// Tema Değiştirme
const themeBtns = document.querySelectorAll('.theme-btn');
themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        document.body.className = document.body.className.replace(/theme-\w+/, theme);
        themeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        localStorage.setItem('reader_theme', theme);
    });
});

// Font Değiştirme
const fontBtns = document.querySelectorAll('.font-btn');
fontBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const font = btn.dataset.font;
        document.body.className = document.body.className.replace(/font-\w+/, font);
        fontBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        localStorage.setItem('reader_font', font);
    });
});

// Yazı Boyutu Değiştirme
let currentFontSize = parseInt(localStorage.getItem('reader_font_size')) || 18;
const fontSizeDisplay = document.getElementById('fontSizeDisplay');
fontSizeDisplay.textContent = currentFontSize;
chapterContentEl.style.fontSize = `${currentFontSize}px`;

document.getElementById('increaseFont').addEventListener('click', () => {
    if (currentFontSize < 24) {
        currentFontSize += 2;
        applyFontSize();
    }
});

document.getElementById('decreaseFont').addEventListener('click', () => {
    if (currentFontSize > 14) {
        currentFontSize -= 2;
        applyFontSize();
    }
});

function applyFontSize() {
    chapterContentEl.style.fontSize = `${currentFontSize}px`;
    fontSizeDisplay.textContent = currentFontSize;
    localStorage.setItem('reader_font_size', currentFontSize);
}

// Sayfa yüklendiğinde kayıtlı ayarları uygula
function loadSettings() {
    const savedTheme = localStorage.getItem('reader_theme') || 'theme-light';
    const savedFont = localStorage.getItem('reader_font') || 'font-sans';
    
    document.body.classList.add(savedTheme, savedFont);
    
    // Butonların aktif sınıfını güncelle
    document.querySelector(`[data-theme="${savedTheme}"]`)?.classList.add('active');
    document.querySelector(`[data-font="${savedFont}"]`)?.classList.add('active');
}

// 4. Klavye Desteği (Sağ/Sol Ok Tuşları)
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' && !nextBtn.classList.contains('disabled')) {
        window.location.href = nextBtn.href;
    } else if (e.key === 'ArrowLeft' && !prevBtn.classList.contains('disabled')) {
        window.location.href = prevBtn.href;
    }
});

// Başlat
loadSettings();
loadChapter();
