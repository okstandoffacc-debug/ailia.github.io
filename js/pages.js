// Экраны корзины, оформления, личного кабинета и товара внутри magazin.html (маршрутизация по #хэшу).
(function () {
    const $ = id => document.getElementById(id);
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const pr = p => parseInt(String(p.price).replace(/\D/g, ''), 10) || 0;
    const byAvito = a => products.find(p => p.avitoId === String(a));
    const img = p => `<img referrerpolicy="no-referrer" src="${esc(p.image || NO_IMG)}" alt="${esc(p.name)}" onerror="this.onerror=null;this.src=NO_IMG"`;
    const SHOP = CONFIG.phone;
    const VIEWS = ['shop', 'cart', 'checkout', 'lk', 'product'];
    const empty = t => `<p style="padding:2rem;text-align:center;color:#a8843f">${t}</p>`;

    // корзина: берём актуальные данные из каталога по avitoId (id могли смениться при пересборке)
    function lines() {
        return getCart().map(it => ({ p: byAvito(it.avitoId), q: it.quantity || 1 })).filter(l => l.p);
    }
    function saveLines(ls) { saveCart(ls.map(l => Object.assign({}, l.p, { quantity: l.q }))); updateCartCount(); }
    window.cartQty = function (avitoId, d) {
        const ls = lines(), l = ls.find(x => x.p.avitoId === String(avitoId));
        if (!l) return;
        l.q += d;
        saveLines(ls.filter(x => x.q > 0));
        renderCart();
    };

    function renderCart() {
        const ls = lines(), box = $('c-cart-items'), sum = $('c-cart-summary');
        $('c-cart-count').textContent = ls.reduce((s, l) => s + l.q, 0);
        if (!ls.length) {
            box.innerHTML = '<div class="empty-cart"><p>Ваша корзина пуста</p><a href="#shop" class="back-link">Вернуться к товарам</a></div>';
            sum.style.display = 'none'; return;
        }
        let sub = 0;
        box.innerHTML = ls.map(({ p, q }) => {
            sub += pr(p) * q;
            return `<div class="cart-item">${img(p)} class="cart-item-image">
                <div class="cart-item-info"><div class="cart-item-title">${esc(p.name)}</div><div class="cart-item-price">${esc(p.price)}</div></div>
                <div class="cart-item-controls">
                    <button class="quantity-btn" aria-label="Меньше" onclick="cartQty('${p.avitoId}',-1)">−</button>
                    <span class="quantity-display">${q}</span>
                    <button class="quantity-btn" aria-label="Больше" onclick="cartQty('${p.avitoId}',1)">+</button>
                    <button class="remove-btn" onclick="cartQty('${p.avitoId}',-999)">Удалить</button>
                </div></div>`;
        }).join('');
        $('c-subtotal').textContent = fmtRub(sub);
        $('c-total').textContent = fmtRub(sub);
        sum.style.display = 'block';
    }

    // ---------- оформление ----------
    const DEL = CONFIG.delivery;   // тарифы и перевозчики — в config.json
    let sel = null;
    const isLocal = () => new RegExp(CONFIG.localWords, 'i').test($('o-region').value + ' ' + $('o-city').value);
    const dPrice = k => DEL[k][isLocal() ? 2 : 1];
    function drawOptions() {
        document.querySelector('#view-checkout .delivery-options').innerHTML = Object.keys(DEL).map(k =>
            `<div class="delivery-option${k === sel ? ' selected' : ''}" onclick="selectDelivery('${k}', this)"><i class="fas ${DEL[k][3]}"></i><h4>${esc(DEL[k][0])}</h4><p>${esc(DEL[k][4])}</p><span class="delivery-price" id="o-price-${k}"></span></div>`).join('');
    }
    function updateCheckout() {
        const ls = lines(), sub = ls.reduce((s, l) => s + pr(l.p) * l.q, 0);
        $('o-cart-items-mini').innerHTML = ls.map(({ p, q }) => `<div class="cart-item-mini"><span>${esc(p.name)} × ${q}</span><span>${fmtRub(pr(p) * q)}</span></div>`).join('');
        Object.keys(DEL).forEach(k => $('o-price-' + k).textContent = '≈ ' + dPrice(k) + ' ₽');
        const d = sel ? dPrice(sel) : 0;
        $('o-subtotal-mini').textContent = $('o-total-products').textContent = fmtRub(sub);
        $('o-delivery-mini').textContent = $('o-total-delivery').textContent = sel ? '≈ ' + d + ' ₽ (уточнит продавец)' : 'выберите перевозчика';
        $('o-total-mini').textContent = $('o-grand-total').textContent = sub > 0 ? (sel ? '≈ ' + (sub + d).toLocaleString('ru-RU') + ' ₽' : fmtRub(sub)) : 'по запросу';
    }
    function renderCheckout() {
        if (!lines().length) { location.hash = 'cart'; return; }
        drawOptions(); updateCheckout();
    }
    window.selectDelivery = function (k, el) {
        sel = k;
        document.querySelectorAll('#view-checkout .delivery-option').forEach(e => e.classList.remove('selected'));
        el.classList.add('selected');
        $('o-step-2').classList.add('completed', 'active');
        updateCheckout();
    };
    window.placeOrder = function () {
        const v = id => $('o-' + id).value.trim();
        const fio = v('customer-name'), phone = v('customer-phone'), region = v('region'), city = v('city'), street = v('street'), house = v('house'), pickup = v('pickup');
        if (!sel) { alert('Выберите компанию-перевозчика.'); return; }
        if (fio.split(/\s+/).filter(Boolean).length < 2) { alert('Укажите ФИО получателя полностью (фамилия, имя, отчество) — оно нужно перевозчику.'); return; }
        if (phone.replace(/\D/g, '').length < 10) { alert('Проверьте телефон получателя.'); return; }
        if (!region || !city) { alert('Укажите область и город.'); return; }
        if (!pickup && !(street && house)) { alert('Укажите улицу и дом или пункт выдачи / отделение.'); return; }
        const ls = lines(), sub = ls.reduce((s, l) => s + pr(l.p) * l.q, 0), d = dPrice(sel);
        const apt = v('apartment'), zip = v('zip'), email = v('customer-email');
        let m = `*НОВЫЙ ЗАКАЗ* 📦\n\n*Получатель (ФИО):* ${fio}\n*Телефон:* ${phone}\n*Email:* ${email || 'не указан'}\n\n*Перевозчик:* ${DEL[sel][0]}\n*Адрес:* ${region}, ${city}${street ? ', ' + street : ''}${house ? ', д. ' + house : ''}${apt ? ', кв. ' + apt : ''}\n*Индекс:* ${zip || 'не указан'}\n${pickup ? '*Пункт выдачи / отделение:* ' + pickup + '\n' : ''}\n*Товары:*\n`;
        ls.forEach(({ p, q }) => m += `- ${p.name} ×${q} (${pr(p) ? (pr(p) * q) + ' ₽' : 'цена на Авито'}) ${p.link}\n`);
        m += `\n*Товары на сумму:* ${sub > 0 ? sub + ' ₽' : 'уточнить'}\n*Доставка (ориентировочно):* ${d} ₽ — прошу подтвердить стоимость`;
        const orders = getList('orders');
        orders.unshift({ id: Date.now(), date: new Date().toISOString(), items: ls.map(l => ({ avitoId: l.p.avitoId, name: l.p.name, price: l.p.price, quantity: l.q })),
            total: sub + d, customer: { name: fio, phone, email }, address: { region, city, street, house, apartment: apt, zip, pickup }, delivery: { type: sel, company: DEL[sel][0], price: d } });
        localStorage.setItem('orders', JSON.stringify(orders));
        saveCart([]); updateCartCount();
        window.open(`https://wa.me/${SHOP}?text=${encodeURIComponent(m)}`, '_blank');
        sel = null;
        document.querySelectorAll('#view-checkout input').forEach(i => i.value = '');
        alert('Заказ сохранён в личном кабинете. Отправьте сообщение в открывшемся окне WhatsApp — продавец подтвердит цену и стоимость доставки.');
        location.hash = 'lk';
    };

    // ---------- личный кабинет ----------
    function renderLk() {
        const orders = getList('orders'), reviews = getList('antique_reviews');
        const favs = getList('favorites').map(f => byAvito(f.avitoId)).filter(Boolean);
        const seen = getList('viewed_ids').map(byAvito).filter(Boolean);
        $('l-user-name').textContent = (orders[0] && orders[0].customer && orders[0].customer.name) || 'Гость';
        $('l-visit-time').textContent = new Date().toLocaleString('ru-RU');
        $('l-viewed-count').textContent = seen.length; $('l-favorite-count').textContent = favs.length;
        $('l-order-count').textContent = orders.length; $('l-review-count').textContent = reviews.length;
        $('l-viewed-list').innerHTML = seen.length ? seen.map(p => `<a class="lk-list-item" href="#product-${p.id}" style="text-decoration:none">${img(p)} class="lk-list-image"><div class="lk-list-content"><div class="lk-list-title">${esc(p.name)}</div><div class="lk-list-date">${esc(p.price)}</div></div></a>`).join('') : empty('История просмотров пуста');
        $('l-favorites-list').innerHTML = favs.length ? favs.map(p => `<div class="lk-favorite-card"><a href="#product-${p.id}">${img(p)} class="lk-favorite-image"></a><div class="lk-favorite-info"><div class="lk-favorite-title">${esc(p.name)}</div><div class="lk-favorite-price">${esc(p.price)}</div><button class="btn-remove" onclick="lkUnfav('${p.avitoId}')">Удалить</button></div></div>`).join('') : empty('В избранном пока ничего нет');
        $('l-orders-list').innerHTML = orders.length ? orders.map((o, i) => `<div class="review-card" style="background:#1f2d27;border-left-color:#a8843f"><div class="review-header" style="color:#e4e2d6"><span class="review-author" style="color:#f2eee3">Заказ №${orders.length - i}</span><span class="review-date">${new Date(o.date).toLocaleDateString('ru-RU')}</span></div>
            <div style="color:#d9d3c3">${(o.items || []).map(x => `<p style="margin:.2rem 0">${esc(x.name)} × ${x.quantity}</p>`).join('')}
            <p style="margin:.5rem 0 .2rem"><strong>Доставка:</strong> ${esc(o.delivery && o.delivery.company)}, ${o.delivery ? o.delivery.price : 0} ₽</p>
            <p style="margin:.2rem 0"><strong>Адрес:</strong> ${esc([o.address.region, o.address.city, o.address.street, o.address.house].filter(Boolean).join(', '))}</p>
            <p style="margin:.2rem 0"><strong>Итого:</strong> ${o.total > 0 && (o.items || []).every(x => parseInt(String(x.price).replace(/\D/g, ''), 10)) ? o.total + ' ₽' : 'уточняется'}</p>
            <p style="margin:.2rem 0"><strong>Статус:</strong> <span style="color:#ffb300">Ожидает подтверждения</span></p></div></div>`).join('') : empty('У вас пока нет заказов');
        $('l-user-reviews-list').innerHTML = reviews.length ? reviews.map(r => `<div class="review-card" style="background:#1f2d27"><div class="review-header"><span class="review-author" style="color:#f2eee3">${esc(r.name)}</span><span class="review-date">${new Date(r.date).toLocaleDateString('ru-RU')}</span></div><div class="review-rating">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div><p class="review-text" style="color:#b9c2b4">${esc(r.text)}</p></div>`).join('') : empty('Вы пока не оставляли отзывов');
    }
    window.lkUnfav = function (a) { localStorage.setItem('favorites', JSON.stringify(getList('favorites').filter(f => f.avitoId !== a))); renderLk(); };
    window.showSection = function (name, btn) {
        document.querySelectorAll('#view-lk .lk-section').forEach(e => e.classList.remove('active'));
        $('l-' + name).classList.add('active');
        document.querySelectorAll('#view-lk .lk-menu-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    };

    // ---------- товар ----------
    const isFav = a => getList('favorites').some(f => f.avitoId === a);
    window.pFav = function (id) {
        const p = products.find(x => x.id === id);
        const favs = getList('favorites').filter(f => f.avitoId !== p.avitoId);
        if (favs.length === getList('favorites').length) favs.push(p);
        localStorage.setItem('favorites', JSON.stringify(favs));
        renderProduct(id);
    };
    window.pPhoto = function (el) { const m = $('p-main-img'); m.src = el.src; document.querySelectorAll('.p-thumb').forEach(t => t.classList.toggle('active', t === el)); };
    function gallery(p) {
        const ph = [...new Set((p.photos && p.photos.length ? p.photos : [p.image]).filter(Boolean))];
        const one = u => `<img referrerpolicy="no-referrer" src="${esc(u || NO_IMG)}" alt="${esc(p.name)}" onerror="this.onerror=null;this.src=NO_IMG"`;
        return `<div class="product-detail-image-wrapper">${one(ph[0])} id="p-main-img" class="product-detail-image"></div>` +
            (ph.length > 1 ? `<div class="p-thumbs">${ph.map((u, i) => `${one(u)} class="p-thumb${i ? '' : ' active'}" onclick="pPhoto(this)">`).join('')}</div>` : '');
    }
    function renderProduct(id) {
        const box = $('p-product-detail'), p = products.find(x => x.id === id);
        if (!p) { box.innerHTML = '<p style="text-align:center;padding:2rem">Товар не найден.</p>'; return; }
        document.title = p.name + ' — Старинная Коллекция';
        const seen = getList('viewed_ids').filter(a => a !== p.avitoId); seen.unshift(p.avitoId);
        localStorage.setItem('viewed_ids', JSON.stringify(seen.slice(0, 10)));
        const wa = `https://wa.me/${SHOP}?text=${encodeURIComponent('Здравствуйте! Интересует: ' + p.name + ' ' + p.link)}`;
        const fav = isFav(p.avitoId);
        box.innerHTML = `<div class="product-detail-header"><h1 class="product-detail-title">${esc(p.name)}</h1><p class="product-detail-price">${esc(p.price)}</p></div>
            ${gallery(p)}
            <div class="product-detail-info"><div class="product-detail-meta"><div class="meta-item"><span class="meta-label">Категория</span><span class="meta-value">${esc(p.category)}</span></div>
            <div class="meta-item"><span class="meta-label">Продавец</span><span class="meta-value">${esc(p.seller)}</span></div></div>
            <div class="product-detail-description"><h3>Описание</h3><p style="white-space:pre-line">${esc(p.description || 'Подробное описание, состояние и размеры — в объявлении на Авито.')}</p></div>
            <div class="action-buttons">
              <button type="button" class="btn-action" style="background:#1f2d27;color:#fff;border-color:#1f2d27;cursor:pointer" onclick="addToCart(${p.id})">В корзину</button>
              <button type="button" class="btn-action" style="background:transparent;color:#7a2e2a;border-color:#7a2e2a;cursor:pointer" onclick="pFav(${p.id})">${fav ? '♥ В избранном' : '♡ В избранное'}</button>
              <a href="tel:+${SHOP}" class="btn-action btn-call">Позвонить ${esc(CONFIG.phoneDisplay)}</a>
              <a href="${wa}" target="_blank" rel="noopener" class="btn-action btn-chat">Написать в WhatsApp</a>
              <a href="${esc(p.link)}" target="_blank" rel="noopener" class="btn-action" style="background:#2f4a3f;color:#fff;border-color:#2f4a3f;flex-basis:100%">Открыть объявление на Авито</a></div></div>`;
    }

    // ---------- маршрутизация ----------
    function route() {
        const h = location.hash.slice(1);
        let v = 'shop', arg = null;
        if (h === 'cart' || h === 'checkout' || h === 'lk') v = h;
        else if (/^product-\d+$/.test(h)) { v = 'product'; arg = +h.slice(8); }
        VIEWS.forEach(x => $('view-' + x).hidden = x !== v);
        if (v === 'cart') renderCart(); else if (v === 'checkout') renderCheckout(); else if (v === 'lk') renderLk(); else if (v === 'product') renderProduct(arg);
        if (v !== 'shop' && v !== 'product') document.title = ({ cart: 'Корзина', checkout: 'Оформление заказа', lk: 'Личный кабинет' }[v] || document.title) + ' — Старинная Коллекция';
        else if (v === 'shop') document.title = 'Старинная Коллекция — Антиквариат и Редкости';
        const t = v === 'shop' && h && h !== 'shop' && document.getElementById(h);
        if (t) t.scrollIntoView(); else window.scrollTo(0, 0);
        updateCartCount();
    }
    ['region', 'city'].forEach(k => document.addEventListener('input', e => { if (e.target.id === 'o-' + k) updateCheckout(); }));
    window.addEventListener('hashchange', route);
    document.addEventListener('DOMContentLoaded', route);
})();
