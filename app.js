(function () {
    const products = window.PRODUCTS || [];

    // =========================================================
    // KATEGORIE — edytuj tutaj nazwy i kolejność
    // Format: { klucz_z_danych: 'Wyświetlana nazwa' }
    // Żeby dodać nową: dopisz linię, klucz musi zgadzać się z polem "cat" w products.js
    // Żeby zmienić nazwę: edytuj tekst po prawej stronie
    // Żeby ukryć kategorię: usuń lub zakomentuj linię (//)
    // =========================================================
    const CATEGORY_LABELS = {
        all:        'all',
        footwear:   'footwear',
        hoodies:    'hoodies',
        tops:       'tops',
        bottoms:    'bottoms',
        outerwear:  'outerwear',
        jewelry:    'jewelry',
        misc:       'other',
    };
    // =========================================================

    const PAGE_SIZE = 20;

    let usdToPln = 4.0;
    let activeCategory = 'all';
    let searchQuery = '';
    let sortMode = 'newest';
    let filteredList = [];
    let loadedCount = 0;
    let observer = null;

    // --- Categories ---

    const existingCats = Object.keys(CATEGORY_LABELS).filter(
        cat => cat === 'all' || products.some(p => p.cat === cat)
    );
    const categoriesEl = document.getElementById('categories');

    existingCats.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'cat-btn' + (cat === 'all' ? ' active' : '');
        btn.textContent = CATEGORY_LABELS[cat];
        btn.dataset.cat = cat;
        btn.addEventListener('click', () => {
            activeCategory = cat;
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            render();
        });
        categoriesEl.appendChild(btn);
    });

    // --- Search ---

    document.getElementById('search').addEventListener('input', e => {
        searchQuery = e.target.value.toLowerCase();
        render();
    });

    // --- Sort ---

    document.getElementById('sort').addEventListener('change', e => {
        sortMode = e.target.value;
        render();
    });

    // --- Card factory ---

    function createCard(p) {
        const card = document.createElement('a');
        card.className = 'card';
        card.href = p.url || '#';
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        const pricePln = Math.round(p.price * usdToPln);
        card.innerHTML = `
            <div class="card-img">
                <img src="${p.img}" alt="${p.name}" loading="lazy">
            </div>
            <div class="card-info">
                <span class="card-name">${p.name}</span>
                <span class="card-price">${pricePln} pln</span>
            </div>
        `;
        return card;
    }

    // --- Load next batch ---

    function loadMore() {
        const grid = document.getElementById('grid');
        const batch = filteredList.slice(loadedCount, loadedCount + PAGE_SIZE);
        batch.forEach(p => grid.appendChild(createCard(p)));
        loadedCount += batch.length;

        if (loadedCount >= filteredList.length) {
            if (observer) observer.disconnect();
            const sentinel = document.getElementById('sentinel');
            if (sentinel) sentinel.remove();
        }
    }

    // --- Render (reset + first batch) ---

    function render() {
        filteredList = products.filter(p => {
            const matchCat = activeCategory === 'all' || p.cat === activeCategory;
            const matchSearch = !searchQuery ||
                p.name.toLowerCase().includes(searchQuery) ||
                (p.brand && p.brand.toLowerCase().includes(searchQuery));
            return matchCat && matchSearch;
        });

        if (sortMode === 'newest') filteredList.sort((a, b) => b.id - a.id);
        else if (sortMode === 'oldest') filteredList.sort((a, b) => a.id - b.id);
        else if (sortMode === 'az') filteredList.sort((a, b) => a.name.localeCompare(b.name));
        else if (sortMode === 'za') filteredList.sort((a, b) => b.name.localeCompare(a.name));

        const grid = document.getElementById('grid');
        grid.innerHTML = '';
        loadedCount = 0;

        if (filteredList.length === 0) {
            grid.innerHTML = '<p class="no-results">No products found.</p>';
            return;
        }

        loadMore();

        if (loadedCount < filteredList.length) {
            if (observer) observer.disconnect();

            let sentinel = document.getElementById('sentinel');
            if (!sentinel) {
                sentinel = document.createElement('div');
                sentinel.id = 'sentinel';
                grid.parentElement.appendChild(sentinel);
            }

            observer = new IntersectionObserver(entries => {
                if (entries[0].isIntersecting) loadMore();
            }, { rootMargin: '200px' });

            observer.observe(sentinel);
        }
    }

    fetch('https://api.frankfurter.app/latest?from=USD&to=PLN')
        .then(r => r.json())
        .then(data => {
            if (data.rates && data.rates.PLN) {
                usdToPln = data.rates.PLN;
                render();
            } else {
                render();
            }
        })
        .catch(() => render());
})();
