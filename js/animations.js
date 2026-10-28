// Анимации: появление при прокрутке, шапка, прогресс, переходы между экранами, «в корзину».
(function () {
    const root = document.documentElement;
    root.classList.add('js');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1) появление блоков при прокрутке
    const SEL = '.section-title,.search-sort-bar,.category-filters,.product-card,.review-card,.reviews-summary,.vintage-form,.contact-item,.social-links,.cart-item,.cart-summary,.delivery-option,.checkout-container>div,.lk-user-card,.lk-stat-card,.lk-list-item,.lk-favorite-card,.product-detail-header,.product-detail-image-wrapper,.product-detail-info';
    const io = new IntersectionObserver(es => es.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target; io.unobserve(el); el.classList.add('in');
        setTimeout(() => { el.classList.remove('reveal', 'in'); el.style.transitionDelay = ''; }, 1000);
    }), { threshold: 0.06, rootMargin: '0px 0px -30px 0px' });
    let batch = 0;
    function scan() {
        batch = 0;
        let i = 0;
        document.querySelectorAll(SEL).forEach(el => {
            if (el.dataset.fx) return;
            el.dataset.fx = 1;
            el.classList.add('reveal');
            el.style.transitionDelay = (i++ % 4) * 70 + 'ms';
            io.observe(el);
        });
    }
    new MutationObserver(() => { if (!batch) batch = requestAnimationFrame(scan); }).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', scan);

    // 2) картинки плавно проявляются, когда загрузились
    document.addEventListener('load', e => { if (e.target.tagName === 'IMG') e.target.classList.add('loaded'); }, true);

    // 3) шапка, полоса прогресса, кнопка «наверх»
    const header = document.querySelector('.site-header');
    const bar = document.createElement('div'); bar.className = 'scroll-progress'; document.body.appendChild(bar);
    const top = document.createElement('button'); top.className = 'to-top'; top.setAttribute('aria-label', 'Наверх'); top.textContent = '↑';
    top.onclick = () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); document.body.appendChild(top);
    let tick = 0;
    function onScroll() {
        tick = 0;
        const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
        header.classList.toggle('scrolled', y > 40);
        top.classList.toggle('show', y > 700);
        bar.style.transform = `scaleX(${h > 0 ? Math.min(1, y / h) : 0})`;
    }
    addEventListener('scroll', () => { if (!tick) tick = requestAnimationFrame(onScroll); }, { passive: true });

    // 4) переход между экранами магазина
    function enter() {
        const v = [...document.querySelectorAll('[id^="view-"]')].find(e => !e.hidden);
        if (!v) return;
        v.classList.remove('view-enter'); void v.offsetWidth; v.classList.add('view-enter');
    }
    addEventListener('hashchange', enter);

    // 5) корзина «подпрыгивает», когда в неё что-то добавили
    const cb = document.getElementById('cart-btn');
    if (cb && !reduce) {
        let last = cb.textContent;
        new MutationObserver(() => { if (cb.textContent !== last) { last = cb.textContent; cb.classList.remove('bump'); void cb.offsetWidth; cb.classList.add('bump'); } }).observe(cb, { childList: true, characterData: true, subtree: true });
    }
})();
