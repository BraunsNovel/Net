document.addEventListener('DOMContentLoaded', async () => {
    const novelsGrid = document.getElementById('novels-grid');
    const latestList = document.getElementById('latest-chapters-list');

    try {
        // 1. Novelleri Yükle
        if (novelsGrid) {
            const novelsResponse = await fetch('/content/novels-index.json');
            if (!novelsResponse.ok) throw new Error('Novel verileri alınamadı');
            const novels = await novelsResponse.json();

            if (novels.length === 0) {
                novelsGrid.innerHTML = '<p class="empty-state">Henüz eklenmiş bir novel bulunmuyor.</p>';
            } else {
                novelsGrid.innerHTML = novels.map(novel => `
                    <article class="novel-card">
                        <div class="novel-cover">
                            <img src="${novel.cover || '/uploads/default-cover.jpg'}" alt="${novel.title} Kapak">
                            <span class="status-badge status-${novel.status.toLowerCase().replace(' ', '-')}">${novel.status}</span>
                        </div>
                        <div class="novel-info">
                            <h3 class="novel-title">${novel.title}</h3>
                            <p class="novel-author">Yazar: ${novel.author}</p>
                            <div class="novel-genres">
                                ${novel.genres.slice(0, 3).map(g => `<span class="genre-tag">${g}</span>`).join('')}
                            </div>
                            <a href="read.html?chapter=${novel.slug}-bolum-1" class="novel-link">İncele →</a>
                        </div>
                    </article>
                `).join('');
            }
        }

        // 2. Son Bölümleri Yükle
        if (latestList) {
            const chaptersResponse = await fetch('/content/chapters-index.json');
            if (!chaptersResponse.ok) throw new Error('Bölüm verileri alınamadı');
            let chapters = await chaptersResponse.json();

            chapters.sort((a, b) => new Date(b.date) - new Date(a.date));
            const latestChapters = chapters.slice(0, 10);

            if (latestChapters.length === 0) {
                latestList.innerHTML = '<p class="empty-state">Henüz eklenmiş bir bölüm bulunmuyor.</p>';
            } else {
                latestList.innerHTML = latestChapters.map(chapter => {
                    const dateObj = new Date(chapter.date);
                    const formattedDate = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
                    
                    return `
                    <li class="chapter-item">
                        <div class="chapter-main">
                            <a href="read.html?chapter=${chapter.slug}" class="chapter-title">${chapter.title}</a>
                            <span class="chapter-novel">${chapter.novelTitle}</span>
                        </div>
                        <time class="chapter-date">${formattedDate}</time>
                    </li>
                    `;
                }).join('');
            }
        }
    } catch (error) {
        console.error('Ana sayfa verileri yüklenirken hata:', error);
        if (novelsGrid) novelsGrid.innerHTML = '<p class="error-text">Veriler yüklenirken bir sorun oluştu. Lütfen sayfayı yenileyin.</p>';
        if (latestList) latestList.innerHTML = '<p class="error-text">Veriler yüklenirken bir sorun oluştu.</p>';
    }
});
