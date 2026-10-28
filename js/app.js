// Общая логика сайта. Каталог берётся из catalog.js (window.CATALOG) — без fetch,
// поэтому всё работает и при открытии файлов двойным кликом.
(function () {
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const getList = k => { try { const v = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
    const NO_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#e7e1d0"/><text x="200" y="158" font-family="serif" font-size="22" fill="#a8843f" text-anchor="middle">Фото на Авито</text></svg>');
    const priceOf = p => parseInt(String(p.price).replace(/\D/g, ''), 10) || 0;
    const fmtRub = n => n > 0 ? n.toLocaleString('ru-RU') + ' ₽' : 'по запросу';
    const ICONS = { 'Посуда': 'fa-mug-hot', 'Свет': 'fa-lightbulb', 'Фигурки и декор': 'fa-chess-knight', 'Инструменты и приборы': 'fa-compass', 'Кухня и быт': 'fa-utensils', 'Техника': 'fa-radio', 'Медицина': 'fa-kit-medical', 'Курительные': 'fa-smoking' };

    const products = (window.CATALOG || []).map(p => Object.assign({ price: 'Цена на Авито', category: 'Разное', year: '', image: '', description: '', seller: 'Старинная Коллекция', link: '' }, p));
    const getCart = () => getList('cart');
    const saveCart = c => localStorage.setItem('cart', JSON.stringify(c));
    const getFavs = () => getList('favorites');
    const isFavorite = id => getFavs().some(p => p.id === id);

    function toast(msg) {
        const t = document.createElement('div');
        t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
        setTimeout(() => t.remove(), 2000);
    }

    function updateCartCount() {
        const n = getCart().reduce((s, i) => s + (i.quantity || 1), 0);
        const btn = document.getElementById('cart-btn');
        if (btn) btn.innerHTML = `<i class="fas fa-shopping-cart"></i> Корзина${n ? ` (${n})` : ''}`;
    }

    function addToCart(id) {
        const product = products.find(p => p.id === id);
        if (!product) return;
        const cart = getCart();
        const ex = cart.find(p => p.id === id);
        if (ex) ex.quantity = (ex.quantity || 1) + 1; else cart.push(Object.assign({}, product, { quantity: 1 }));
        saveCart(cart);
        updateCartCount();
        toast(`${product.name} — в корзине`);
    }

    function removeFromCart(id) {
        saveCart(getCart().filter(p => p.id !== id));
        if (typeof window.renderCart === 'function') window.renderCart();
        updateCartCount();
    }

    function toggleFavorite(event, id) {
        event.stopPropagation();
        let favs = getFavs();
        if (favs.some(p => p.id === id)) favs = favs.filter(p => p.id !== id);
        else favs.push(products.find(p => p.id === id));
        localStorage.setItem('favorites', JSON.stringify(favs));
        renderProducts();
    }

    function showProduct(id) { location.hash = 'product-' + id; }

    // ---------- каталог на главной ----------
    let category = 'all', searchQuery = '', sortBy = 'default';

    function renderCategories() {
        const box = document.getElementById('category-filters');
        if (!box) return;
        const counts = {};
        products.forEach(p => counts[p.category] = (counts[p.category] || 0) + 1);
        const cats = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
        box.innerHTML = `<button class="category-btn" data-cat="all">Все товары <small>${products.length}</small></button>` +
            cats.map(c => `<button class="category-btn" data-cat="${esc(c)}">${esc(c)} <small>${counts[c]}</small></button>`).join('');
        box.onclick = e => { const b = e.target.closest('.category-btn'); if (b) filterByCategory(b.dataset.cat); };
    }

    function renderProducts() {
        const grid = document.getElementById('products-grid');
        if (!grid) return;
        let list = products.filter(p => category === 'all' || p.category === category);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(p => (p.name + ' ' + p.description + ' ' + p.category).toLowerCase().includes(q));
        }
        const known = (a, b, dir) => { const x = priceOf(a), y = priceOf(b); if (!x || !y) return (x ? 0 : 1) - (y ? 0 : 1) || 0; return (x - y) * dir; };
        if (sortBy === 'price-asc') list.sort((a, b) => known(a, b, 1));
        else if (sortBy === 'price-desc') list.sort((a, b) => known(a, b, -1));
        else if (sortBy === 'new-first') list.sort((a, b) => Number(b.avitoId || 0) - Number(a.avitoId || 0)); // id объявлений Авито растут со временем

        document.querySelectorAll('.category-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === category));
        if (!list.length) { grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem"><p style="color:#6b6a5e">Товары не найдены</p></div>'; return; }

        grid.innerHTML = list.map(p => {
            const fav = isFavorite(p.id), n = priceOf(p);
            const media = p.image
                ? `<img referrerpolicy="no-referrer" src="${esc(p.image)}" alt="${esc(p.name)}" class="product-photo" loading="lazy" onerror="this.onerror=null;this.src=NO_IMG">`
                : `<div class="product-image-content"><i class="fas ${ICONS[p.category] || 'fa-gem'} item-icon"></i><div class="item-name">${esc(p.category)}</div></div>`;
            return `<article class="product-card" onclick="showProduct(${p.id})" style="cursor:pointer">
                <div class="product-image-wrapper">${media}
                    <button class="btn-favorite" aria-label="В избранное" onclick="toggleFavorite(event, ${p.id})"><i class="${fav ? 'fas' : 'far'} fa-heart" style="color:${fav ? '#7a2e2a' : '#fff'}"></i></button>
                    <button class="btn-cart" aria-label="В корзину" onclick="event.stopPropagation();addToCart(${p.id})"><i class="fas fa-shopping-cart"></i></button>
                </div>
                <div class="product-info">
                    <h3 class="product-name">${esc(p.name)}</h3>
                    <p class="product-price ${n ? '' : 'price-ask'}">${esc(p.price)}</p>
                    ${p.description ? `<p class="product-description">${esc(p.description.length > 110 ? p.description.slice(0, 110) + '…' : p.description)}</p>` : ''}
                    <div class="product-meta"><span>${esc(p.category)}</span><span>${p.year ? esc(p.year) : '№ ' + String(p.id).padStart(3, '0')}</span></div>
                </div></article>`;
        }).join('');
    }

    function filterByCategory(c) { category = c; renderProducts(); }
    function searchProducts() { searchQuery = document.getElementById('search-input').value.trim(); renderProducts(); syncReset(); }
    function handleSort(v) { sortBy = v; renderProducts(); syncReset(); }
    function syncReset() { const b = document.getElementById('reset-filters-btn'); if (b) b.style.display = (searchQuery || sortBy !== 'default' || category !== 'all') ? 'inline-block' : 'none'; }
    function resetFilters() {
        searchQuery = ''; sortBy = 'default'; category = 'all';
        document.getElementById('search-input').value = ''; document.getElementById('sort-select').value = 'default';
        renderProducts(); syncReset();
    }

    // ---------- отзывы (хранятся только в браузере посетителя) ----------
    const loadReviews = () => getList('antique_reviews');
    let allReviews = false;
    function renderReviews() {
        const box = document.getElementById('reviews-container');
        if (!box) return;
        const av = (window.AVITO_REVIEWS || []).map(r => Object.assign({ source: 'Авито' }, r));
        const rs = av.concat(loadReviews());
        if (!rs.length) { box.innerHTML = '<p style="text-align:center;color:#6d4c41">Пока нет отзывов. Будьте первым!</p>'; return; }
        const rated = av.filter(r => r.rating > 0);
        const avg = rated.length ? (rated.reduce((s, r) => s + r.rating, 0) / rated.length).toFixed(1).replace('.', ',') : '';
        const shown = allReviews ? rs : rs.slice(0, 6);
        box.innerHTML = (avg ? `<p class="reviews-summary">Средняя оценка по отзывам на Авито: <strong>${avg} из 5</strong> (${rated.length})</p>` : '') +
            shown.map(r => `<div class="review-card"><div class="review-header"><span class="review-author">${esc(r.name)}</span><span class="review-date">${esc(r.dateText || new Date(r.date).toLocaleDateString('ru-RU'))}${r.source ? ' · ' + esc(r.source) : ''}</span></div>
                ${r.rating ? `<div class="review-rating">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>` : ''}
                ${r.item ? `<p class="review-date" style="margin-bottom:.4rem">${esc(r.item)}</p>` : ''}<p class="review-text">${esc(r.text)}</p></div>`).join('') +
            (!allReviews && rs.length > 6 ? `<p style="text-align:center"><button class="category-btn" onclick="showAllReviews()">Показать все отзывы (${rs.length})</button></p>` : '');
    }
    function showAllReviews() { allReviews = true; renderReviews(); }

    document.addEventListener('DOMContentLoaded', function () {
        updateCartCount();
        renderCategories(); renderProducts(); renderReviews();

        const form = document.getElementById('review-form');
        if (form) form.addEventListener('submit', function (e) {
            e.preventDefault();
            const name = document.getElementById('review-name').value.trim();
            const rating = parseInt(document.getElementById('review-rating').value, 10);
            const text = document.getElementById('review-text').value.trim();
            if (!name || !rating || !text) return;
            const rs = loadReviews(); rs.push({ name, rating, text, date: new Date().toISOString() });
            localStorage.setItem('antique_reviews', JSON.stringify(rs));
            renderReviews(); this.reset();
            const btn = this.querySelector('.btn-submit'), old = btn.textContent;
            btn.textContent = 'Отзыв отправлен! Спасибо!'; btn.style.backgroundColor = '#2e7d32';
            setTimeout(() => { btn.textContent = old; btn.style.backgroundColor = '#1f2d27'; }, 3000);
        });

        document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', function (e) {
            const t = this.getAttribute('href').length > 1 && document.querySelector(this.getAttribute('href'));
            if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        }));
    });

    Object.assign(window, { products, NO_IMG, getCart, saveCart, getList, fmtRub, addToCart, removeFromCart, updateCartCount,
        toggleFavorite, showProduct, showAllReviews, filterByCategory, searchProducts, handleSort, resetFilters });
})();
