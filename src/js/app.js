document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  try {
    const [novelsRes, chaptersRes, searchRes, genresRes] = await Promise.all([
      fetch('/content/novels-index.json'),
      fetch('/content/chapters-index.json'),
      fetch('/content/search.json'),
      fetch('/content/genres.json')
    ]);

    const novels = await novelsRes.json();
    const chapters = await chaptersRes.json();
    const searchData = await searchRes.json();
    const genresMap = await genresRes.json();

    renderFeaturedNovels(novels);
    renderGenres(genresMap, novels);
    renderLatestChapters(chapters);
    renderAllNovels(novels);
    setupSearch(searchData);

  } catch (err) {
    console.error('Veri yüklenirken hata oluştu:', err);
  }
}

// 1. Öne Çıkarılan Romanlar
function renderFeaturedNovels(novels) {
  const container = document.getElementById('featured-novels');
  if (!container) return;

  const featured = novels.filter(n => n.featured);
  const listToRender = featured.length > 0 ? featured : novels.slice(0, 3);

  container.innerHTML = listToRender.map(novel => createNovelCard(novel)).join('');
}

// 2. Tür Filtreleme Çipleri
function renderGenres(genresMap, novels) {
  const container = document.getElementById('genres-list');
  if (!container) return;

  const genresHtml = Object.entries(genresMap).map(([genre, count]) => `
    <button class="genre-chip" data-genre="${genre}">
      ${genre} <span class="chip-count">(${count})</span>
    </button>
  `).join('');

  container.innerHTML = `<button class="genre-chip active" data-genre="all">Tümü</button>` + genresHtml;

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.genre-chip');
    if (!btn) return;

    document.querySelectorAll('.genre-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const selectedGenre = btn.dataset.genre;
    if (selectedGenre === 'all') {
      renderAllNovels(novels);
    } else {
      const filtered = novels.filter(n => n.genres && n.genres.includes(selectedGenre));
      renderAllNovels(filtered);
    }
  });
}

// 3. Son Yüklenen Bölümler (Temiz URL: /chapters/[slug])
function renderLatestChapters(chapters) {
  const container = document.getElementById('latest-chapters');
  if (!container) return;

  const recentChapters = chapters.slice(0, 10);
  container.innerHTML = recentChapters.map(ch => `
    <a href="/chapters/${ch.slug}" class="chapter-card">
      <div class="chapter-info">
        <span class="chapter-novel-title">${ch.novelTitle}</span>
        <span class="chapter-title">${ch.title}</span>
      </div>
      <time class="chapter-date">${new Date(ch.date).toLocaleDateString('tr-TR')}</time>
    </a>
  `).join('');
}

// 4. Tüm Romanlar Listesi (Temiz URL: /novels/[slug])
function renderAllNovels(novels) {
  const container = document.getElementById('novels-grid');
  if (!container) return;

  if (novels.length === 0) {
    container.innerHTML = `<p class="empty-msg">Bu kriterlere uygun roman bulunamadı.</p>`;
    return;
  }

  container.innerHTML = novels.map(novel => createNovelCard(novel)).join('');
}

function createNovelCard(novel) {
  return `
    <a href="/novels/${novel.slug}" class="novel-card">
      ${novel.cover ? `<img src="${novel.cover}" alt="${novel.title}" class="novel-card-cover" loading="lazy">` : '<div class="novel-card-placeholder">📖</div>'}
      <div class="novel-card-details">
        <h3 class="novel-card-title">${novel.title}</h3>
        ${novel.original_title ? `<span class="novel-card-orig">${novel.original_title}</span>` : ''}
        <div class="novel-card-tags">
          ${(novel.genres || []).map(g => `<span class="mini-tag">${g}</span>`).join('')}
        </div>
        <span class="novel-card-status">${novel.status}</span>
      </div>
    </a>
  `;
}

// 5. Işık Hızında Canlı Arama (search.json Üzerinden)
function setupSearch(searchData) {
  const input = document.getElementById('search-input');
  const dropdown = document.getElementById('search-results');
  if (!input || !dropdown) return;

  input.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();

    if (query.length < 2) {
      dropdown.classList.add('hidden');
      dropdown.innerHTML = '';
      return;
    }

    const results = searchData.filter(item => 
      item.title.toLowerCase().includes(query) ||
      (item.original_title && item.original_title.toLowerCase().includes(query)) ||
      item.author.toLowerCase().includes(query)
    );

    if (results.length === 0) {
      dropdown.innerHTML = `<div class="search-item-empty">Sonuç bulunamadı.</div>`;
    } else {
      dropdown.innerHTML = results.slice(0, 5).map(item => `
        <a href="/novels/${item.slug}" class="search-item">
          ${item.cover ? `<img src="${item.cover}" class="search-item-thumb">` : ''}
          <div class="search-item-meta">
            <span class="search-item-title">${item.title}</span>
            <span class="search-item-sub">${item.author}</span>
          </div>
        </a>
      `).join('');
    }

    dropdown.classList.remove('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}
