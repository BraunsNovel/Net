(function() {
  'use strict';

  // ========== STATE ==========
  const state = {
    series: [],
    chapters: [],
    loading: true
  };

  const STATIC_GENRES = [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
    'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'Slice of Life',
    'Supernatural', 'Psychological', 'Historical', 'Martial Arts',
    'Isekai', 'System', 'Regression', 'Reincarnation', 'School Life',
    'Tragedy', 'Mecha', 'Harem', 'Ecchi', 'Seinen', 'Shounen'
  ];
  const STATUS_LABELS = {
    ongoing: 'Devam Ediyor',
    completed: 'Tamamlandı',
    hiatus: 'Beklemede',
    dropped: 'Bırakıldı'
  };

  // ========== VERİ YÜKLEME ==========
  async function loadData() {
    try {
      const [seriesRes, chaptersRes] = await Promise.all([
        fetch('data/series.json'),
        fetch('data/chapters.json')
      ]);
      state.series = await seriesRes.json();
      state.chapters = await chaptersRes.json();
      state.loading = false;
    } catch (err) {
      console.error('Veri yükleme hatası:', err);
      state.loading = false;
    }
  }

  // ========== YARDIMCILAR ==========
  function $(sel, ctx = document) { return ctx.querySelector(sel); }
  function $$(sel, ctx = document) { return Array.from(ctx.querySelectorAll(sel)); }

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v !== null && v !== undefined) node.setAttribute(k, v);
    });
    children.flat().forEach(c => {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'short', year: 'numeric'
      });
    } catch { return '—'; }
  }

  function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  // ========== ROUTER ==========
  function parseHash() {
    const hash = location.hash.slice(1) || '/';
    const [path, query] = hash.split('?');
    const params = {};
    if (query) {
      query.split('&').forEach(p => {
        const [k, v] = p.split('=');
        params[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }
    return { path, params };
  }

  async function router() {
    const { path, params } = parseHash();
    const app = $('#app');
    if (!app) return;

    if (state.loading) {
      app.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p style="margin-top:16px;">Yükleniyor...</p></div>';
      return;
    }

    window.scrollTo({ top: 0, behavior: 'instant' });

    if (path === '/' || path === '') return renderHome(app);
    if (path === '/series') return renderSeriesList(app, params);
    if (path === '/chapters') return renderChaptersList(app);
    if (path.startsWith('/series/')) return renderSeriesDetail(app, path.split('/')[2]);
    if (path.startsWith('/read/')) return renderReader(app, path.split('/')[2]);

    render404(app);
  }

  // ========== ANA SAYFA ==========
  function renderHome(app) {
    app.innerHTML = '';

    // Hero (Öne Çıkan)
    const featured = state.series.find(s => s.featured);
    if (featured) app.appendChild(renderHeroFeatured(featured));

    // Devam Et
    const continueSection = renderContinueSection();
    if (continueSection) app.appendChild(continueSection);

    // Yeni Bölümler
    const recentChapters = [...state.chapters]
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, 10);
    app.appendChild(el('section', { class: 'section' },
      el('div', { class: 'section-header' },
        el('h2', { class: 'section-title' }, '📖 Yeni Bölümler'),
        el('a', { class: 'section-link', href: '#/chapters' }, 'Tümünü Gör →')
      ),
      el('ul', { class: 'chapter-list' },
        ...recentChapters.map(ch => el('li', {}, renderChapterListItem(ch)))
      )
    ));

    // Son Güncellenen Seriler
    const recentSeries = [...state.series]
      .sort((a, b) => (b.lastUpdate || '').localeCompare(a.lastUpdate || ''))
      .slice(0, 12);
    app.appendChild(el('section', { class: 'section' },
      el('div', { class: 'section-header' },
        el('h2', { class: 'section-title' }, '📚 Son Güncellenen Seriler'),
        el('a', { class: 'section-link', href: '#/series' }, 'Tümünü Gör →')
      ),
      el('div', { class: 'series-grid' },
        ...recentSeries.map(s => renderSeriesCard(s))
      )
    ));
  }

  function renderHeroFeatured(series) {
    const firstChapter = state.chapters.find(c => c.series === series.slug);
    return el('section', { class: 'hero-featured' },
      el('div', { class: 'hero-featured-cover' },
        el('img', { src: series.cover, alt: series.title, loading: 'eager' })
      ),
      el('div', { class: 'hero-featured-info' },
        el('div', { class: 'hero-featured-badge' }, '⭐ Öne Çıkan'),
        el('h2', { class: 'hero-featured-title' }, series.title),
        el('div', { class: 'hero-featured-meta' },
          el('span', {}, `📖 ${series.chapterCount} Bölüm`),
          el('span', {}, `✍️ ${series.author}`),
          el('span', {}, STATUS_LABELS[series.status] || series.status)
        ),
        el('p', { class: 'hero-featured-desc' }, series.synopsis),
        el('div', { class: 'hero-featured-cta' },
          el('a', { class: 'btn-cta btn-cta-primary', href: `#/series/${series.slug}` }, '▶ Detayları Gör'),
          firstChapter ? el('a', { class: 'btn-cta btn-cta-secondary', href: `#/read/${firstChapter.slug}` }, 'Okumaya Başla') : null
        )
      )
    );
  }

  function renderContinueSection() {
    const items = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('brauns_continue_')) {
        try { items.push(JSON.parse(localStorage.getItem(key))); } catch {}
      }
    }
    if (!items.length) return null;
    items.sort((a, b) => b.timestamp - a.timestamp);
    const item = items[0];
    return el('section', { class: 'section' },
      el('div', { class: 'section-header' },
        el('h2', { class: 'section-title' }, '🔖 Kaldığın Yerden Devam Et')
      ),
      el('a', { class: 'continue-card', href: item.url },
        item.cover ? el('img', { class: 'continue-cover', src: item.cover, alt: '' }) : null,
        el('div', { class: 'continue-info' },
          el('div', { class: 'continue-label' }, 'KALDIĞIN YER'),
          el('div', { class: 'continue-series' }, item.seriesTitle || item.series),
          el('div', { class: 'continue-chapter' }, item.chapterTitle)
        )
      )
    );
  }

  function renderSeriesCard(series) {
    return el('a', { class: 'series-card', href: `#/series/${series.slug}` },
      el('div', { class: 'series-cover' },
        el('img', { src: series.cover, alt: series.title, loading: 'lazy', decoding: 'async' })
      ),
      el('div', { class: 'series-info' },
        el('h3', { class: 'series-title' }, series.title),
        el('div', { class: 'series-meta' },
          el('span', { class: `status-badge ${series.status}` }, STATUS_LABELS[series.status] || series.status),
          el('span', {}, `${series.chapterCount} Bölüm`)
        )
      )
    );
  }

  function renderChapterListItem(chapter) {
    const series = state.series.find(s => s.slug === chapter.series);
    const seriesTitle = series ? series.title : chapter.series;
    return el('a', { class: 'chapter-list-item', href: `#/read/${chapter.slug}` },
      el('div', { class: 'chapter-list-main' },
        el('span', { class: 'chapter-list-title' }, chapter.title),
        el('span', { class: 'chapter-list-dot' }, '•'),
        el('span', { class: 'chapter-list-series' }, seriesTitle)
      ),
      el('span', { class: 'chapter-list-date' }, formatDate(chapter.publishedAt))
    );
  }

  // ========== SERİ LİSTESİ ==========
  function renderSeriesList(app, params) {
    let filtered = [...state.series];
    if (params.genre) filtered = filtered.filter(s => s.genres.includes(params.genre));
    if (params.status) filtered = filtered.filter(s => s.status === params.status);

    app.innerHTML = '';
    const title = params.genre
      ? `Tür: ${params.genre}`
      : params.status
      ? `Durum: ${STATUS_LABELS[params.status]}`
      : 'Tüm Seriler';

    app.appendChild(el('div', { class: 'section-header' },
      el('h2', { class: 'section-title' }, title),
      el('span', { style: 'color:var(--text-muted); font-size:0.875rem;' }, `${filtered.length} seri`)
    ));

    if (!filtered.length) {
      app.appendChild(el('div', { class: 'empty-state' },
        el('div', { class: 'empty-state-icon' }, '📚'),
        el('p', { class: 'empty-state-text' }, 'Bu filtreye uygun seri bulunamadı.'),
        el('a', { class: 'btn-cta btn-cta-primary', href: '#/series' }, 'Tüm Serileri Gör')
      ));
      return;
    }

    app.appendChild(el('div', { class: 'series-grid' },
      ...filtered.map(s => renderSeriesCard(s))
    ));
  }

  // ========== BÖLÜM LİSTESİ ==========
  function renderChaptersList(app) {
    const sorted = [...state.chapters].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    app.innerHTML = '';
    app.appendChild(el('div', { class: 'section-header' },
      el('h2', { class: 'section-title' }, '📖 Tüm Bölümler'),
      el('span', { style: 'color:var(--text-muted); font-size:0.875rem;' }, `${sorted.length} bölüm`)
    ));
    app.appendChild(el('ul', { class: 'chapter-list' },
      ...sorted.map(ch => renderChapterListItem(ch))
    ));
  }

  // ========== SERİ DETAY ==========
  function renderSeriesDetail(app, slug) {
    const series = state.series.find(s => s.slug === slug);
    if (!series) return render404(app);

    const chapters = state.chapters
      .filter(c => c.series === slug)
      .sort((a, b) => a.chapterNumber - b.chapterNumber);

    const readTime = series.totalWords ? Math.ceil(series.totalWords / 200) : 0;

    app.innerHTML = '';
    const detail = el('article', { class: 'series-detail' },
      el('div', { class: 'series-hero' },
        el('div', { class: 'series-hero-cover' },
          el('img', { src: series.cover, alt: series.title, loading: 'eager' })
        ),
        el('div', { class: 'series-hero-info' },
          el('h1', { class: 'series-hero-title' }, series.title),
          series.altTitle ? el('div', { class: 'series-alt-title' }, series.altTitle) : null,
          el('div', { class: 'series-meta-row' },
            el('div', { class: 'meta-chip' },
              el('span', { class: 'meta-chip-label' }, 'Yazar'),
              el('span', { class: 'meta-chip-value' }, series.author)
            ),
            series.artist ? el('div', { class: 'meta-chip' },
              el('span', { class: 'meta-chip-label' }, 'Çizer'),
              el('span', { class: 'meta-chip-value' }, series.artist)
            ) : null,
            el('div', { class: 'meta-chip' },
              el('span', { class: 'meta-chip-label' }, 'Durum'),
              el('span', { class: 'meta-chip-value' },
                el('span', { class: `status-dot ${series.status}` }),
                STATUS_LABELS[series.status] || series.status
              )
            ),
            el('div', { class: 'meta-chip' },
              el('span', { class: 'meta-chip-label' }, 'Güncelleme'),
              el('span', { class: 'meta-chip-value' }, series.updateSchedule || '—')
            )
          ),
          el('div', { class: 'series-hero-genres' },
            ...series.genres.map(g => el('span', { class: 'genre-pill' }, g))
          ),
          el('div', { class: 'series-stats' },
            el('div', { class: 'stat-card' },
              el('div', { class: 'stat-value' }, String(series.chapterCount)),
              el('div', { class: 'stat-label' }, 'Bölüm')
            ),
            el('div', { class: 'stat-card' },
              el('div', { class: 'stat-value' }, formatNumber(series.totalWords)),
              el('div', { class: 'stat-label' }, 'Kelime')
            ),
            el('div', { class: 'stat-card' },
              el('div', { class: 'stat-value' }, readTime ? String(readTime) : '—'),
              el('div', { class: 'stat-label' }, 'Dk Okuma')
            ),
            el('div', { class: 'stat-card' },
              el('div', { class: 'stat-value' }, formatDate(series.firstPublish)),
              el('div', { class: 'stat-label' }, 'İlk Yayın')
            ),
            el('div', { class: 'stat-card' },
              el('div', { class: 'stat-value' }, formatDate(series.lastUpdate)),
              el('div', { class: 'stat-label' }, 'Son Güncelleme')
            )
          ),
          el('div', { class: 'series-hero-cta' },
            chapters[0] ? el('a', { class: 'btn-cta btn-cta-primary', href: `#/read/${chapters[0].slug}` }, '▶ İlk Bölümden Başla') : null,
            chapters[chapters.length - 1] ? el('a', { class: 'btn-cta btn-cta-secondary', href: `#/read/${chapters[chapters.length - 1].slug}` }, 'Son Bölüm') : null
          )
        )
      ),
      el('div', { class: 'series-synopsis' },
        el('div', { class: 'series-section-label' }, 'Özet'),
        el('div', { class: 'series-synopsis-content', html: series.synopsisHtml })
      ),
      el('div', { class: 'series-chapters' },
        el('div', { class: 'series-section-label' }, 'Bölümler'),
        chapters.length
          ? el('ul', { class: 'chapter-list-v2' },
              ...chapters.slice().reverse().map((ch, i) =>
                el('li', {},
                  el('a', { class: 'chapter-row', href: `#/read/${ch.slug}` },
                    el('span', { class: 'chapter-number' }, `Bölüm ${ch.chapterNumber}`),
                    el('span', { class: 'chapter-row-title' },
                      ch.title,
                      i === 0 ? el('span', { class: 'badge-new' }, 'YENİ') : null
                    ),
                    el('span', { class: 'chapter-row-date' }, formatDate(ch.publishedAt))
                  )
                )
              )
            )
          : el('p', { style: 'color:var(--text-muted); text-align:center; padding:24px;' }, 'Henüz bölüm eklenmemiş.')
      ),
      el('section', { class: 'reader-comments-section' },
        el('h3', { class: 'comments-title' }, '💬 Yorumlar'),
        el('div', { id: 'disqus_thread' })
      )
    );
    app.appendChild(detail);

    loadDisqus(`series-${series.slug}`, series.title, `#/series/${series.slug}`);
  }

  // ========== OKUYUCU ==========
  function renderReader(app, slug) {
    const chapter = state.chapters.find(c => c.slug === slug);
    if (!chapter) return render404(app);

    const series = state.series.find(s => s.slug === chapter.series);
    if (!series) return render404(app);

    const allChapters = state.chapters
      .filter(c => c.series === chapter.series)
      .sort((a, b) => a.chapterNumber - b.chapterNumber);

    const currentIndex = allChapters.findIndex(c => c.slug === slug);
    const prev = currentIndex > 0 ? allChapters[currentIndex - 1] : null;
    const next = currentIndex < allChapters.length - 1 ? allChapters[currentIndex + 1] : null;
    const readTime = Math.ceil(chapter.wordCount / 200);

    saveContinueReading(series, chapter);

    app.innerHTML = '';
    const reader = el('article', { class: 'novel-reader' },
      el('header', { class: 'reader-header' },
        el('nav', { class: 'reader-breadcrumb' },
          el('a', { href: '#/' }, 'Ana Sayfa'),
          el('span', {}, '/'),
          el('a', { href: '#/series' }, 'Seriler'),
          el('span', {}, '/'),
          el('a', { href: `#/series/${series.slug}` }, series.title),
          el('span', {}, '/'),
          el('span', {}, chapter.title)
        ),
        el('h1', { class: 'reader-title' }, chapter.title),
        el('div', { class: 'reader-meta' },
          el('span', { class: 'reader-meta-item' }, `⏱️ ${readTime} dk`),
          el('span', { class: 'reader-meta-item' }, `📖 Bölüm ${chapter.chapterNumber}`),
          el('span', { class: 'reader-meta-item' }, `📅 ${formatDate(chapter.publishedAt)}`)
        )
      ),
      chapter.editorNote ? el('div', { class: 'editor-note' },
        el('strong', {}, '📌 Editör Notu'),
        el('span', {}, chapter.editorNote)
      ) : null,
      el('div', { class: 'reader-controls' },
        el('div', { class: 'control-group' },
          el('button', { class: 'control-btn', id: 'fontDecrease', type: 'button', title: 'Küçült' }, 'A-'),
          el('button', { class: 'control-btn', id: 'fontIncrease', type: 'button', title: 'Büyüt' }, 'A+'),
          el('select', { class: 'select', id: 'fontFamily' },
            el('option', { value: 'Merriweather' }, 'Merriweather'),
            el('option', { value: 'Inter' }, 'Inter'),
            el('option', { value: 'Georgia' }, 'Georgia')
          ),
          el('button', { class: 'control-btn', id: 'resetFont', type: 'button', title: 'Sıfırla' }, '↻')
        ),
        el('div', { class: 'control-group' },
          el('select', { class: 'select', id: 'lineHeight' },
            el('option', { value: '1.6' }, '1.6x'),
            el('option', { value: '1.9', selected: 'selected' }, '1.9x'),
            el('option', { value: '2.2' }, '2.2x')
          )
        )
      ),
      el('div', { class: 'novel-content', id: 'novelContent', html: chapter.contentHtml }),
      el('nav', { class: 'chapter-nav' },
        prev
          ? el('a', { class: 'chapter-nav-btn', href: `#/read/${prev.slug}` }, '← Önceki')
          : el('span', { class: 'chapter-nav-btn disabled' }, '← İlk Bölüm'),
        el('div', { class: 'chapter-dropdown-wrap' },
          el('input', { class: 'chapter-search-input', id: 'chapterJump', list: 'chapterDatalist', placeholder: 'Bölüm ara veya atla...' }),
          el('datalist', { id: 'chapterDatalist' },
            ...allChapters.map(c => el('option', { value: `#/read/${c.slug}` }, `Bölüm ${c.chapterNumber}: ${c.title}`))
          )
        ),
        next
          ? el('a', { class: 'chapter-nav-btn', href: `#/read/${next.slug}` }, 'Sonraki →')
          : el('span', { class: 'chapter-nav-btn disabled' }, 'Son Bölüm →')
      ),
      el('div', { style: 'text-align:center; margin-top:32px;' },
        el('a', { class: 'btn-cta btn-cta-secondary', href: `#/series/${series.slug}` }, '← Seriye Dön')
      ),
      el('section', { class: 'reader-comments-section' },
        el('h3', { class: 'comments-title' }, '💬 Yorumlar'),
        el('div', { id: 'disqus_thread' })
      )
    );
    app.appendChild(reader);

    initReaderControls();

    const jump = $('#chapterJump');
    if (jump) {
      jump.addEventListener('change', () => {
        if (jump.value) location.hash = jump.value;
      });
    }

    loadDisqus(`chapter-${chapter.slug}`, `${series.title} - ${chapter.title}`, `#/read/${chapter.slug}`);

    if (window.gtag) {
      window.gtag('event', 'read_chapter', {
        series: series.title,
        chapter: chapter.title,
        chapter_number: chapter.chapterNumber
      });
    }
  }

  function initReaderControls() {
    const content = $('#novelContent');
    if (!content) return;

    let fontSize = parseInt(localStorage.getItem('brauns-font-size'), 10) || 18;
    const applyFont = () => {
      content.style.fontSize = fontSize + 'px';
      localStorage.setItem('brauns-font-size', fontSize);
    };
    applyFont();

    const fontInc = $('#fontIncrease');
    const fontDec = $('#fontDecrease');
    const fontReset = $('#resetFont');
    const fontFamily = $('#fontFamily');
    const lineHeight = $('#lineHeight');

    if (fontInc) fontInc.addEventListener('click', () => { fontSize = Math.min(28, fontSize + 1); applyFont(); });
    if (fontDec) fontDec.addEventListener('click', () => { fontSize = Math.max(12, fontSize - 1); applyFont(); });

    if (fontFamily) {
      const saved = localStorage.getItem('brauns-font-family');
      if (saved) { content.style.fontFamily = saved; fontFamily.value = saved; }
      fontFamily.addEventListener('change', e => {
        content.style.fontFamily = e.target.value;
        localStorage.setItem('brauns-font-family', e.target.value);
      });
    }
    if (lineHeight) {
      const saved = localStorage.getItem('brauns-line-height');
      if (saved) { content.style.lineHeight = saved; lineHeight.value = saved; }
      lineHeight.addEventListener('change', e => {
        content.style.lineHeight = e.target.value;
        localStorage.setItem('brauns-line-height', e.target.value);
      });
    }
    if (fontReset) fontReset.addEventListener('click', () => {
      fontSize = 18;
      applyFont();
      content.style.fontFamily = 'Merriweather';
      content.style.lineHeight = '1.9';
      localStorage.removeItem('brauns-font-size');
      localStorage.removeItem('brauns-font-family');
      localStorage.removeItem('brauns-line-height');
      if (fontFamily) fontFamily.value = 'Merriweather';
      if (lineHeight) lineHeight.value = '1.9';
    });
  }

  function saveContinueReading(series, chapter) {
    localStorage.setItem('brauns_continue_' + series.slug, JSON.stringify({
      url: `#/read/${chapter.slug}`,
      chapterTitle: chapter.title,
      seriesTitle: series.title,
      series: series.slug,
      cover: series.cover,
      timestamp: Date.now()
    }));
  }

  // ========== 404 ==========
  function render404(app) {
    app.innerHTML = '';
    app.appendChild(el('div', { class: 'empty-state' },
      el('div', { class: 'empty-state-icon' }, '🔍'),
      el('p', { class: 'empty-state-text' }, 'Sayfa bulunamadı'),
      el('a', { class: 'btn-cta btn-cta-primary', href: '#/' }, '← Ana Sayfaya Dön')
    ));
  }

  // ========== DİSQUS ==========
  function loadDisqus(identifier, title, url) {
    if (!window.DISQUS_SHORTNAME) return;
    if (window.DISQUS) {
      window.DISQUS.reset({
        reload: true,
        config: function() {
          this.page.identifier = identifier;
          this.page.title = title;
          this.page.url = location.origin + location.pathname + '#' + url;
        }
      });
    } else {
      const d = document, s = d.createElement('script');
      s.src = `https://${window.DISQUS_SHORTNAME}.disqus.com/embed.js`;
      s.setAttribute('data-timestamp', +new Date());
      (d.head || d.body).appendChild(s);
    }
  }

  // ========== TEMA ==========
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('brauns-theme', next);
  }

  // ========== ARAMA ==========
  function initSearch() {
    const modal = $('#searchModal');
    const input = $('#searchInput');
    const results = $('#searchResults');
    let activeIndex = -1;

    function open() {
      modal.classList.add('active');
      setTimeout(() => input.focus(), 100);
    }
    function close() {
      modal.classList.remove('active');
      input.value = '';
      results.innerHTML = '';
      activeIndex = -1;
    }

    function render(q) {
      if (!q) { results.innerHTML = ''; return; }
      const lower = q.toLowerCase();
      const matchedSeries = state.series.filter(s =>
        s.title.toLowerCase().includes(lower) ||
        (s.altTitle || '').toLowerCase().includes(lower) ||
        s.author.toLowerCase().includes(lower) ||
        s.genres.some(g => g.toLowerCase().includes(lower))
      ).slice(0, 5);
      const matchedChapters = state.chapters.filter(c =>
        c.title.toLowerCase().includes(lower)
      ).slice(0, 5);

      results.innerHTML = '';
      matchedSeries.forEach(s => {
        const item = el('div', { class: 'search-result-item' },
          el('img', { class: 'search-result-cover', src: s.cover, alt: '' }),
          el('div', { class: 'search-result-info' },
            el('div', { class: 'search-result-title' }, s.title),
            el('div', { class: 'search-result-meta' }, `Seri · ${s.author} · ${s.chapterCount} bölüm`)
          )
        );
        item.addEventListener('click', () => {
          location.hash = `#/series/${s.slug}`;
          close();
        });
        results.appendChild(item);
      });
      matchedChapters.forEach(c => {
        const series = state.series.find(s => s.slug === c.series);
        const item = el('div', { class: 'search-result-item' },
          el('div', { class: 'search-result-info' },
            el('div', { class: 'search-result-title' }, c.title),
            el('div', { class: 'search-result-meta' }, `${series ? series.title : c.series} · Bölüm ${c.chapterNumber}`)
          )
        );
        item.addEventListener('click', () => {
          location.hash = `#/read/${c.slug}`;
          close();
        });
        results.appendChild(item);
      });
      if (!matchedSeries.length && !matchedChapters.length) {
        results.innerHTML = '<div style="text-align:center; padding:24px; color:var(--text-muted);">Sonuç bulunamadı</div>';
      }
      activeIndex = -1;
    }

    input.addEventListener('input', e => render(e.target.value));
    input.addEventListener('keydown', e => {
      const items = $$('.search-result-item', results);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(items.length - 1, activeIndex + 1);
        items.forEach((it, i) => it.classList.toggle('active', i === activeIndex));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(0, activeIndex - 1);
        items.forEach((it, i) => it.classList.toggle('active', i === activeIndex));
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        items[activeIndex].click();
      }
    });

    $('#searchToggle').addEventListener('click', open);
    $('#mobileSearchBtn').addEventListener('click', () => { closeMobileMenu(); open(); });
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); open(); }
    });
  }

  // ========== FİLTRE ==========
  function initFilter() {
    const modal = $('#filterModal');
    const genreTags = $('#genreTags');
    const statusTags = $('#statusTags');

    STATIC_GENRES.forEach(g => {
      genreTags.appendChild(el('span', { class: 'filter-tag', 'data-value': g, 'data-type': 'genre' }, g));
    });

    function toggle(e) {
      const tag = e.target.closest('.filter-tag');
      if (!tag) return;
      const type = tag.dataset.type || (tag.parentElement.id === 'statusTags' ? 'status' : 'genre');
      const parent = type === 'status' ? statusTags : genreTags;
      $$('.filter-tag', parent).forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
    }
    genreTags.addEventListener('click', toggle);
    statusTags.addEventListener('click', toggle);

    $('#filterToggle').addEventListener('click', () => modal.classList.add('active'));
    $('#mobileFilterBtn').addEventListener('click', () => { closeMobileMenu(); modal.classList.add('active'); });
    $('#filterClose').addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });

    $('#applyFilter').addEventListener('click', () => {
      const genre = $('.filter-tag.active', genreTags);
      const status = $('.filter-tag.active', statusTags);
      const params = new URLSearchParams();
      if (genre) params.set('genre', genre.dataset.value);
      if (status) params.set('status', status.dataset.value);
      const qs = params.toString();
      location.hash = qs ? `#/series?${qs}` : '#/series';
      modal.classList.remove('active');
    });
  }

  // ========== MOBİL MENÜ ==========
  function openMobileMenu() {
    $('#mobileNavDrawer').classList.add('active');
    $('#drawerBackdrop').classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closeMobileMenu() {
    $('#mobileNavDrawer').classList.remove('active');
    $('#drawerBackdrop').classList.remove('active');
    document.body.style.overflow = '';
  }

  // ========== OKUMA İLERLEMESİ ==========
  function initScroll() {
    const progressBar = $('#readingProgress');
    const backToTop = $('#backToTop');
    window.addEventListener('scroll', () => {
      const content = $('#novelContent');
      if (content) {
        const rect = content.getBoundingClientRect();
        const top = Math.max(0, -rect.top);
        const height = Math.max(1, rect.height - window.innerHeight + 200);
        progressBar.style.width = Math.min(100, Math.round((top / height) * 100)) + '%';
      }
      backToTop.classList.toggle('visible', window.scrollY > 600);
    }, { passive: true });
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // ========== BAŞLAT ==========
  async function init() {
    await loadData();

    $('#themeToggle').addEventListener('click', toggleTheme);
    $('#mobileThemeBtn').addEventListener('click', () => { toggleTheme(); closeMobileMenu(); });
    $('#mobileMenuToggle').addEventListener('click', openMobileMenu);
    $('#mobileMenuClose').addEventListener('click', closeMobileMenu);
    $('#drawerBackdrop').addEventListener('click', closeMobileMenu);

    initSearch();
    initFilter();
    initScroll();

    window.addEventListener('hashchange', router);
    router();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
