// E-Medicare: navbar, animasi saat scroll, penghitung angka, scrollspy, cadangan gambar.
(function () {
    var doc = document;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Navbar, progres scroll, tombol ke atas ---------- */
    var nav = doc.querySelector('.site-nav');
    var bar = doc.querySelector('.scroll-progress');
    var toTop = doc.querySelector('.to-top');
    var ticking = false;

    function onScroll() {
        var y = window.pageYOffset || doc.documentElement.scrollTop;
        var max = doc.documentElement.scrollHeight - window.innerHeight;
        if (nav) nav.classList.toggle('is-scrolled', y > 24);
        if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
        if (toTop) toTop.classList.toggle('is-shown', y > 600);
        ticking = false;
    }
    window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
    }, { passive: true });
    onScroll();

    if (toTop) {
        toTop.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        });
    }

    // Close menu mobile setelah link diklik
    var menu = doc.getElementById('navbarLinks');
    if (menu) {
        menu.addEventListener('click', function (e) {
            if (!e.target.closest('a') || !menu.classList.contains('show')) return;
            if (window.bootstrap && window.bootstrap.Collapse) {
                window.bootstrap.Collapse.getOrCreateInstance(menu).hide();
            }
        });
    }

    /* ---------- Animasi muncul saat scroll ---------- */
    var revealEls = Array.prototype.slice.call(doc.querySelectorAll('[data-reveal]'));
    if ('IntersectionObserver' in window && !reduceMotion) {
        var revealIO = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                revealIO.unobserve(entry.target);
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
        revealEls.forEach(function (el) { revealIO.observe(el); });
    } else {
        revealEls.forEach(function (el) { el.classList.add('is-visible'); });
    }

    /* ---------- Penghitung angka ---------- */
    function runCounter(el) {
        var target = parseFloat(el.getAttribute('data-count')) || 0;
        var suffix = el.getAttribute('data-suffix') || '';
        if (reduceMotion) { el.textContent = target + suffix; return; }
        var duration = 1500;
        var start = null;
        function step(ts) {
            if (start === null) start = ts;
            var p = Math.min((ts - start) / duration, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased) + suffix;
            if (p < 1) window.requestAnimationFrame(step);
        }
        window.requestAnimationFrame(step);
    }
    var counters = Array.prototype.slice.call(doc.querySelectorAll('[data-count]'));
    if ('IntersectionObserver' in window) {
        var countIO = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                runCounter(entry.target);
                countIO.unobserve(entry.target);
            });
        }, { threshold: 0.6 });
        counters.forEach(function (el) { countIO.observe(el); });
    } else {
        counters.forEach(runCounter);
    }

    /* ---------- Scrollspy: tandai menu sesuai section ---------- */
    var spyLinks = {};
    Array.prototype.slice.call(doc.querySelectorAll('.site-nav .nav-link[href^="#"]')).forEach(function (a) {
        spyLinks[a.getAttribute('href').slice(1)] = a;
    });
    var spyIds = Object.keys(spyLinks);
    if (spyIds.length && 'IntersectionObserver' in window) {
        var spyIO = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                spyIds.forEach(function (id) { spyLinks[id].classList.remove('active'); });
                var link = spyLinks[entry.target.id];
                if (link) link.classList.add('active');
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        spyIds.forEach(function (id) {
            var section = doc.getElementById(id);
            if (section) spyIO.observe(section);
        });
    }

    /* ---------- Cadangan jika gambar gagal dimuat ---------- */
    function useFallback(img) {
        if (!img || img.getAttribute('data-failed')) return;
        var box = doc.createElement('div');
        box.className = 'img-fallback ' + img.className;
        box.setAttribute('role', 'img');
        box.setAttribute('aria-label', img.alt || 'Report image');
        box.innerHTML = '<i class="bi bi-hospital" aria-hidden="true"></i>';
        img.setAttribute('data-failed', '1');
        img.replaceWith(box);
    }
    doc.addEventListener('error', function (e) {
        if (e.target && e.target.tagName === 'IMG' && e.target.hasAttribute('data-fallback')) useFallback(e.target);
    }, true);
    Array.prototype.slice.call(doc.querySelectorAll('img[data-fallback]')).forEach(function (img) {
        if (img.complete && img.naturalWidth === 0) useFallback(img);
    });
})();
