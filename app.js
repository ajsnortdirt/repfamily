(function () {
    'use strict';

    const products = window.PRODUCTS || [];

    // =========================================================
    // KATEGORIE — edytuj tutaj nazwy i kolejność
    // Format: { klucz_z_danych: 'Wyświetlana nazwa' }
    // Żeby dodać nową: dopisz linię, klucz musi zgadzać się z polem "cat" w products.js
    // Żeby zmienić nazwę: edytuj tekst po prawej stronie
    // Żeby ukryć kategorię: usuń lub zakomentuj linię (//)
    // =========================================================
    const CATEGORY_LABELS = {
        all:          'all',
        shoes:        'shoes',
        hoodies:      'hoodies',
        tshirts:      't-shirts',
        pants:        'pants',
        shorts:       'shorts',
        jackets:      'jackets',
        accessories:  'accessories',
        watches:      'watches',
    };
    // =========================================================

    const PAGE_SIZE = 20;
    const SEARCH_DEBOUNCE_MS = 150;
    const FX_CACHE_KEY = 'usd_pln_rate_v1';
    const FX_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

    let usdToPln = 4.0;
    let activeCategory = 'all';
    let searchQuery = '';
    let sortMode = 'newest';
    let filteredList = [];
    let loadedCount = 0;
    let observer = null;
    let searchTimer = 0;
    let renderToken = 0;
    let lastRenderKey = '';
    let searchIndexBuilt = false;

    const len = products.length;

    function buildSearchIndex() {
        if (searchIndexBuilt) return;
        for (let i = 0; i < len; i++) {
            const p = products[i];
            p._search = (p.name + ' ' + (p.brand || '')).toLowerCase();
        }
        searchIndexBuilt = true;
    }

    const grid = document.getElementById('grid');
    const categoriesEl = document.getElementById('categories');
    const searchEl = document.getElementById('search');
    const sortEl = document.getElementById('sort');
    const searchClearBtn = document.getElementById('search-clear');
    const controlsTop = document.querySelector('.controls');

    const existingCatSet = new Set();
    for (let i = 0; i < len; i++) existingCatSet.add(products[i].cat);

    const catFragment = document.createDocumentFragment();
    Object.keys(CATEGORY_LABELS).forEach(cat => {
        if (cat !== 'all' && !existingCatSet.has(cat)) return;
        const btn = document.createElement('button');
        const isActive = cat === 'all';
        btn.type = 'button';
        btn.className = 'cat-btn' + (isActive ? ' active' : '');
        btn.textContent = CATEGORY_LABELS[cat];
        btn.dataset.cat = cat;
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        catFragment.appendChild(btn);
    });
    categoriesEl.appendChild(catFragment);

    function scrollToContent() {
        if (window.scrollY > 100 && grid.getBoundingClientRect().top < 0) {
            window.scrollTo({ top: controlsTop ? controlsTop.offsetTop - 8 : 0, behavior: 'smooth' });
        }
    }

    function setActiveCategory(cat) {
        if (cat === activeCategory) return;
        activeCategory = cat;
        const buttons = categoriesEl.children;
        for (let i = 0; i < buttons.length; i++) {
            const b = buttons[i];
            const isActive = b.dataset.cat === cat;
            b.classList.toggle('active', isActive);
            b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        }
        render();
        scrollToContent();
    }

    categoriesEl.addEventListener('click', e => {
        const btn = e.target.closest('.cat-btn');
        if (!btn || !categoriesEl.contains(btn)) return;
        setActiveCategory(btn.dataset.cat);
    });

    function updateClearVisibility() {
        if (searchEl.value) {
            searchClearBtn.removeAttribute('hidden');
        } else {
            searchClearBtn.setAttribute('hidden', '');
        }
    }

    searchEl.addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        updateClearVisibility();
        if (q === searchQuery) return;
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            searchQuery = q;
            render();
        }, SEARCH_DEBOUNCE_MS);
    });

    searchEl.addEventListener('keydown', e => {
        if (e.key === 'Escape' && searchEl.value) {
            e.preventDefault();
            clearSearch();
        }
    });

    function clearSearch() {
        searchEl.value = '';
        searchQuery = '';
        updateClearVisibility();
        if (searchTimer) { clearTimeout(searchTimer); searchTimer = 0; }
        render();
        searchEl.focus();
    }

    searchClearBtn.addEventListener('click', clearSearch);

    document.addEventListener('keydown', e => {
        if (e.key === '/' && document.activeElement !== searchEl && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            searchEl.focus();
        }
    });

    sortEl.addEventListener('change', e => {
        sortMode = e.target.value;
        render();
        scrollToContent();
    });

    function resetFilters() {
        searchEl.value = '';
        searchQuery = '';
        updateClearVisibility();
        sortEl.value = 'newest';
        sortMode = 'newest';
        activeCategory = 'all';
        const buttons = categoriesEl.children;
        for (let i = 0; i < buttons.length; i++) {
            const b = buttons[i];
            const isAll = b.dataset.cat === 'all';
            b.classList.toggle('active', isAll);
            b.setAttribute('aria-pressed', isAll ? 'true' : 'false');
        }
        render();
    }

    function createCard(p) {
        const card = document.createElement('a');
        card.className = 'card';
        card.href = p.url || '#';
        card.target = '_blank';
        card.rel = 'noopener noreferrer';

        const imgWrap = document.createElement('div');
        imgWrap.className = 'card-img';
        const img = document.createElement('img');
        img.src = p.img;
        img.alt = p.name;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.width = 300;
        img.height = 300;
        imgWrap.appendChild(img);

        const info = document.createElement('div');
        info.className = 'card-info';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'card-name';
        nameSpan.textContent = p.name;
        const priceSpan = document.createElement('span');
        priceSpan.className = 'card-price';
        priceSpan.textContent = Math.round(p.price * usdToPln) + ' pln';
        info.appendChild(nameSpan);
        info.appendChild(priceSpan);

        card.appendChild(imgWrap);
        card.appendChild(info);
        return card;
    }

    function loadMore() {
        const end = Math.min(loadedCount + PAGE_SIZE, filteredList.length);
        const fragment = document.createDocumentFragment();
        for (let i = loadedCount; i < end; i++) {
            fragment.appendChild(createCard(filteredList[i]));
        }
        grid.appendChild(fragment);
        loadedCount = end;

        if (loadedCount >= filteredList.length) {
            if (observer) { observer.disconnect(); observer = null; }
            const sentinel = document.getElementById('sentinel');
            if (sentinel) sentinel.remove();
        }
    }

    function filterProducts() {
        const hasSearch = searchQuery.length > 0;
        const hasCat = activeCategory !== 'all';
        if (!hasSearch && !hasCat) return products.slice();

        if (hasSearch) buildSearchIndex();

        const out = [];
        for (let i = 0; i < len; i++) {
            const p = products[i];
            if (hasCat && p.cat !== activeCategory) continue;
            if (hasSearch && p._search.indexOf(searchQuery) === -1) continue;
            out.push(p);
        }
        return out;
    }

    function sortInPlace(arr) {
        switch (sortMode) {
            case 'newest':     arr.sort((a, b) => b.id - a.id); break;
            case 'oldest':     arr.sort((a, b) => a.id - b.id); break;
            case 'az':         arr.sort((a, b) => a.name.localeCompare(b.name)); break;
            case 'za':         arr.sort((a, b) => b.name.localeCompare(a.name)); break;
            case 'price_asc':  arr.sort((a, b) => a.price - b.price); break;
            case 'price_desc': arr.sort((a, b) => b.price - a.price); break;
        }
    }

    function render() {
        const renderKey = activeCategory + '|' + searchQuery + '|' + sortMode;
        if (renderKey === lastRenderKey && filteredList.length > 0 && grid.firstChild && !grid.querySelector('.skeleton-card')) {
            return;
        }
        lastRenderKey = renderKey;

        const token = ++renderToken;

        filteredList = filterProducts();
        sortInPlace(filteredList);

        if (observer) { observer.disconnect(); observer = null; }
        const oldSentinel = document.getElementById('sentinel');
        if (oldSentinel) oldSentinel.remove();

        grid.textContent = '';
        grid.setAttribute('aria-busy', 'false');
        loadedCount = 0;

        if (filteredList.length === 0) {
            const wrap = document.createElement('div');
            wrap.className = 'no-results';
            const msg = document.createElement('p');
            msg.textContent = 'No products found.';
            wrap.appendChild(msg);
            const hasActiveFilter = searchQuery.length > 0 || activeCategory !== 'all';
            if (hasActiveFilter) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'no-results-reset';
                btn.textContent = 'reset filters';
                btn.addEventListener('click', resetFilters);
                wrap.appendChild(btn);
            }
            grid.appendChild(wrap);
            return;
        }

        loadMore();

        if (token !== renderToken) return;

        if (loadedCount < filteredList.length) {
            const sentinel = document.createElement('div');
            sentinel.id = 'sentinel';
            grid.parentElement.appendChild(sentinel);

            observer = new IntersectionObserver(entries => {
                if (entries[0].isIntersecting) loadMore();
            }, { rootMargin: '600px' });
            observer.observe(sentinel);
        }
    }

    function updatePrices() {
        const priceEls = grid.querySelectorAll('.card-price');
        const n = Math.min(priceEls.length, filteredList.length);
        for (let i = 0; i < n; i++) {
            priceEls[i].textContent = Math.round(filteredList[i].price * usdToPln) + ' pln';
        }
    }

    try {
        const cached = localStorage.getItem(FX_CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.rate && (Date.now() - parsed.ts) < FX_CACHE_TTL_MS) {
                usdToPln = parsed.rate;
            }
        }
    } catch (_) {}

    render();

    const idle = window.requestIdleCallback || function (cb) { return setTimeout(cb, 200); };

    idle(buildSearchIndex);

    idle(function () {
        fetch('https://api.frankfurter.app/latest?from=USD&to=PLN')
            .then(r => r.json())
            .then(data => {
                if (data && data.rates && data.rates.PLN) {
                    const rate = data.rates.PLN;
                    try { localStorage.setItem(FX_CACHE_KEY, JSON.stringify({ rate, ts: Date.now() })); } catch (_) {}
                    if (rate !== usdToPln) {
                        usdToPln = rate;
                        updatePrices();
                    }
                }
            })
            .catch(() => {});
    });
})();
