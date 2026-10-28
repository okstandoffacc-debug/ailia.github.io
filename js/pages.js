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
    window.placeOrder = async function () {
        const v = id => $('o-' + id).value.trim();
        if (!window.sb) { alert('Авторизация и оформление заказов пока не настроены.'); return; }
        const { data: { session } } = await sb.auth.getSession();
        if (!session) { alert('Для оформления заказа войдите или зарегистрируйтесь.'); document.getElementById('auth-open')?.click(); return; }
        const fio = v('customer-name'), phone = v('customer-phone'), region = v('region'), city = v('city'), street = v('street'), house = v('house'), pickup = v('pickup');
        if (!sel) { alert('Выберите компанию-перевозчика.'); return; }
        if (fio.split(/\s+/).filter(Boolean).length < 2) { alert('Укажите ФИО получателя полностью.'); return; }
        if (phone.replace(/\D/g, '').length < 10) { alert('Проверьте телефон получателя.'); return; }
        if (!region || !city) { alert('Укажите область и город.'); return; }
        if (!pickup && !(street && house)) { alert('Укажите улицу и дом или пункт выдачи / отделение.'); return; }
        const ls = lines();
        if (!ls.length) { alert('Корзина пуста.'); return; }
        if (ls.some(l => l.q !== 1)) { alert('Антикварные товары продаются в единственном экземпляре. Уберите дубликаты из корзины.'); return; }
        const sub = ls.reduce((sum, l) => sum + pr(l.p) * l.q, 0), d = dPrice(sel);
        const apt = v('apartment'), zip = v('zip'), email = v('customer-email');
        const items = ls.map(l => ({ product_id: Number(l.p.id), avitoId: l.p.avitoId, name: l.p.name, price: l.p.price, quantity: l.q }));
        const customer = { name: fio, phone, email: email || session.user.email };
        const address = { region, city, street, house, apartment: apt, zip, pickup };
        const delivery = { type: sel, company: DEL[sel][0], price: d };
        try {
            const { data: orderId, error } = await sb.rpc('create_shop_order', { p_product_ids: items.map(i => i.product_id), p_items: items, p_customer: customer, p_address: address, p_delivery: delivery, p_total: sub + d });
            if (error) throw error;
            const m = `НОВЫЙ ЗАКАЗ №${orderId}\nПолучатель: ${fio}\nТелефон: ${phone}\nEmail: ${customer.email}\nПеревозчик: ${delivery.company}\nАдрес: ${region}, ${city}${street ? ', '+street : ''}${house ? ', д. '+house : ''}${apt ? ', кв. '+apt : ''}\nИндекс: ${zip || 'не указан'}\nПункт выдачи: ${pickup || 'не указан'}\nТовары: ${items.map(i=>i.name+' — '+i.price).join('; ')}\nСумма с ориентировочной доставкой: ${sub+d} ₽`;
            saveCart([]); updateCartCount(); window.open(`https://wa.me/${SHOP}?text=${encodeURIComponent(m)}`, '_blank');
            sel = null; document.querySelectorAll('#view-checkout input').forEach(i => i.value = '');
            alert('Заказ оформлен. Товар снят с витрины и теперь отображается в личном кабинете. Отправьте сообщение продавцу в открывшемся WhatsApp для подтверждения доставки.');
            await window.refreshRemoteCatalog?.(); location.hash = 'lk';
        } catch (err) { alert('Не удалось оформить заказ: ' + (err.message || 'ошибка сервера')); }
    };

    // ---------- личный кабинет ----------
    async function renderLk() {
        let orders = getList('orders');
        if (window.sb) { try { const {data:{session}} = await sb.auth.getSession(); if(session){ const {data,error}=await sb.from('orders').select('*').order('created_at',{ascending:false}); if(!error) orders=(data||[]).map(o=>({...o,date:o.created_at})); } } catch(e) { console.warn('Не удалось загрузить заказы',e); } }
        const reviews = getList('antique_reviews');
        const favs = getList('favorites').map(f => byAvito(f.avitoId)).filter(Boolean);
        const seen = getList('viewed_ids').map(byAvito).filter(Boolean);
        $('l-user-name').textContent = (orders[0] && orders[0].customer && orders[0].customer.name) || 'Гость';
        $('l-visit-time').textContent = new Date().toLocaleString('ru-RU');
        $('l-viewed-count').textContent = seen.length; $('l-favorite-count').textContent = favs.length;
        $('l-order-count').textContent = orders.length; $('l-review-count').textContent = reviews.length;
        $('l-viewed-list').innerHTML = seen.length ? seen.map(p => `<a class="lk-list-item" href="#product-${p.id}" style="text-decoration:none">${img(p)} class="lk-list-image"><div class="lk-list-content"><div class="lk-list-title">${esc(p.name)}</div><div class="lk-list-date">${esc(p.price)}</div></div></a>`).join('') : empty('История просмотров пуста');
        $('l-favorites-list').innerHTML = favs.length ? favs.map(p => `<div class="lk-favorite-card"><a href="#product-${p.id}">${img(p)} class="lk-favorite-image"></a><div class="lk-favorite-info"><div class="lk-favorite-title">${esc(p.name)}</div><div class="lk-favorite-price">${esc(p.price)}</div><button class="btn-remove" onclick="lkUnfav('${p.avitoId}')">Удалить</button></div></div>`).join('') : empty('В избранном пока ничего нет');
        $('l-orders-list').innerHTML = orders.length ? orders.map((o, i) => `<div class="review-card" style="background:#1f2d27;border-left-color:#a8843f"><div class="review-header" style="color:#e4e2d6"><span class="review-author" style="color:#f2eee3">Заказ №${o.id || orders.length - i}</span><span class="review-date">${new Date(o.date).toLocaleDateString('ru-RU')}</span></div>
            <div style="color:#d9d3c3">${(o.items || []).map(x => `<p style="margin:.2rem 0">${esc(x.name)} × ${x.quantity}</p>`).join('')}
            <p style="margin:.5rem 0 .2rem"><strong>Доставка:</strong> ${esc(o.delivery && o.delivery.company)}, ${o.delivery ? o.delivery.price : 0} ₽</p>
            <p style="margin:.2rem 0"><strong>Адрес:</strong> ${esc([o.address.region, o.address.city, o.address.street, o.address.house].filter(Boolean).join(', '))}</p>
            <p style="margin:.2rem 0"><strong>Итого:</strong> ${o.total > 0 && (o.items || []).every(x => parseInt(String(x.price).replace(/\D/g, ''), 10)) ? o.total + ' ₽' : 'уточняется'}</p>
            <p style="margin:.2rem 0"><strong>Статус:</strong> <span style="color:#ffb300">${esc(({ordered:'Заказ оформлен',sent:'Отправлен',at_warehouse:'Прибыл на склад / сортировочный центр',ready_for_pickup:'Готов к получению',delivered:'Получен покупателем',cancelled:'Отменён'})[o.status] || 'Ожидает подтверждения')}</span></p>${o.tracking_number?`<p style="margin:.2rem 0"><strong>Трек-номер:</strong> ${esc(o.tracking_number)}</p>`:''}${o.status_note?`<p style="margin:.2rem 0">${esc(o.status_note)}</p>`:''}</div></div>`).join('') : empty('У вас пока нет заказов');
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
    let viewerPhotos=[]; let viewerIndex=0;
    window.pPhoto = function (el) { const m = $('p-main-img'); m.src = el.src; viewerIndex=Math.max(0,viewerPhotos.indexOf(el.src)); document.querySelectorAll('.p-thumb').forEach(t => t.classList.toggle('active', t === el)); };
    function ensurePhotoViewer(){if($('photo-lightbox'))return;const st=document.createElement('style');st.textContent='.photo-lightbox{position:fixed;inset:0;z-index:99999;background:rgba(10,10,10,.94);display:none;align-items:center;justify-content:center;padding:24px}.photo-lightbox.open{display:flex}.photo-lightbox img{max-width: min(92vw,1500px);max-height:88vh;object-fit:contain;box-shadow:0 15px 60px rgba(0,0,0,.35);cursor:zoom-in}.photo-lightbox button{position:absolute;border:1px solid rgba(255,255,255,.4);background:rgba(30,30,30,.7);color:white;border-radius:50%;width:44px;height:44px;font-size:24px;cursor:pointer}.photo-lightbox-close{top:18px;right:18px}.photo-lightbox-prev{left:18px;top:50%;transform:translateY(-50%)}.photo-lightbox-next{right:18px;top:50%;transform:translateY(-50%)}.photo-lightbox-count{position:absolute;bottom:18px;color:#fff;font:14px system-ui}.product-detail-image,.p-thumb{cursor:zoom-in}@media(max-width:600px){.photo-lightbox{padding:10px}.photo-lightbox button{width:40px;height:40px}.photo-lightbox-prev{left:6px}.photo-lightbox-next{right:6px}}';document.head.appendChild(st);const box=document.createElement('div');box.id='photo-lightbox';box.className='photo-lightbox';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.innerHTML='<button type="button" class="photo-lightbox-close" aria-label="Закрыть">×</button><button type="button" class="photo-lightbox-prev" aria-label="Предыдущее фото">‹</button><img id="photo-lightbox-img" alt="Увеличенное фото товара"><button type="button" class="photo-lightbox-next" aria-label="Следующее фото">›</button><div class="photo-lightbox-count" id="photo-lightbox-count"></div>';document.body.appendChild(box);box.addEventListener('click',e=>{if(e.target===box||e.target.closest('.photo-lightbox-close'))closePhotoViewer();else if(e.target.closest('.photo-lightbox-prev'))stepPhoto(-1);else if(e.target.closest('.photo-lightbox-next'))stepPhoto(1);});document.addEventListener('keydown',e=>{if(!$('photo-lightbox')?.classList.contains('open'))return;if(e.key==='Escape')closePhotoViewer();if(e.key==='ArrowLeft')stepPhoto(-1);if(e.key==='ArrowRight')stepPhoto(1);});}
    function paintPhotoViewer(){const box=$('photo-lightbox');if(!box)return;$('photo-lightbox-img').src=viewerPhotos[viewerIndex]||'';$('photo-lightbox-count').textContent=viewerPhotos.length>1?`${viewerIndex+1} / ${viewerPhotos.length}`:'';box.querySelector('.photo-lightbox-prev').style.display=viewerPhotos.length>1?'block':'none';box.querySelector('.photo-lightbox-next').style.display=viewerPhotos.length>1?'block':'none';}
    window.openPhotoViewer=function(src){ensurePhotoViewer();if(src&&viewerPhotos.length&&!viewerPhotos.includes(src)){viewerPhotos.unshift(src);viewerIndex=0;}else if(src)viewerIndex=Math.max(0,viewerPhotos.indexOf(src));paintPhotoViewer();$('photo-lightbox').classList.add('open');document.body.style.overflow='hidden';};
    function closePhotoViewer(){const b=$('photo-lightbox');if(b)b.classList.remove('open');document.body.style.overflow='';}
    function stepPhoto(delta){if(!viewerPhotos.length)return;viewerIndex=(viewerIndex+delta+viewerPhotos.length)%viewerPhotos.length;paintPhotoViewer();}
    function gallery(p) {
        const ph = [...new Set((p.photos && p.photos.length ? p.photos : [p.image]).filter(Boolean))];
        viewerPhotos=ph;viewerIndex=0;
        const one = u => `<img referrerpolicy="no-referrer" src="${esc(u || NO_IMG)}" alt="${esc(p.name)}" onerror="this.onerror=null;this.src=NO_IMG"`;
        return `<div class="product-detail-image-wrapper">${one(ph[0])} id="p-main-img" class="product-detail-image" onclick="openPhotoViewer(this.src)" title="Нажмите, чтобы увеличить"></div>` +
            (ph.length > 1 ? `<div class="p-thumbs">${ph.map((u, i) => `${one(u)} class="p-thumb${i ? '' : ' active'}" onclick="pPhoto(this)" title="Нажмите, чтобы выбрать фото">`).join('')}</div>` : '');
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
