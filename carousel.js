// Carousel "Recent Reports": 3 card terlihat, card tengah aktif, card kiri/kanan pudar.
// Tambahan: titik navigasi, putar otomatis (berhenti saat disentuh/difokuskan), dan dukungan "kurangi gerakan".
(function () {
    var carousel = document.getElementById('recentCarousel');
    if (!carousel) return;

    var viewport = carousel.querySelector('.recent-viewport');
    var slides = Array.prototype.slice.call(carousel.querySelectorAll('.recent-slide'));
    var prevBtn = document.getElementById('recentPrev');
    var nextBtn = document.getElementById('recentNext');
    var dotsWrap = document.getElementById('recentDots');
    var live = document.getElementById('recentLive');
    var total = slides.length;
    if (!total) return;

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var current = 0;
    var previousOffsets = [];
    var dots = [];

    // Titik navigasi
    if (dotsWrap) {
        slides.forEach(function (slide, i) {
            var dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'recent-dot';
            dot.setAttribute('aria-label', 'Show report ' + (i + 1) + ' of ' + total);
            dot.addEventListener('click', function () { goTo(i); });
            dotsWrap.appendChild(dot);
            dots.push(dot);
        });
    }

    function offsetFor(i) {
        var d = (((i - current) % total) + total) % total;
        if (d > total / 2) d -= total;
        return d;
    }

    function render(animate) {
        slides.forEach(function (slide, i) {
            var d = offsetFor(i);
            var jumped = previousOffsets[i] !== undefined && Math.abs(d - previousOffsets[i]) > 2;

            // Card yang "melompat" dari ujung ke ujung dipindah tanpa animasi
            if (jumped || !animate) slide.style.transition = 'none';

            slide.style.setProperty('--offset', d);
            slide.classList.toggle('is-active', d === 0);
            slide.classList.toggle('is-side', Math.abs(d) === 1);
            slide.classList.toggle('is-hidden', Math.abs(d) > 1);
            slide.setAttribute('aria-hidden', d === 0 ? 'false' : 'true');

            var focusables = slide.querySelectorAll('a, button');
            for (var k = 0; k < focusables.length; k++) {
                if (d === 0) focusables[k].removeAttribute('tabindex');
                else focusables[k].setAttribute('tabindex', '-1');
            }

            if (jumped || !animate) {
                void slide.offsetWidth; // paksa reflow
                slide.style.transition = '';
            }
            previousOffsets[i] = d;
        });

        dots.forEach(function (dot, i) {
            var on = i === current;
            dot.classList.toggle('is-active', on);
            if (on) dot.setAttribute('aria-current', 'true');
            else dot.removeAttribute('aria-current');
        });

        if (live && animate) {
            var title = slides[current].querySelector('.card-title');
            live.textContent = 'Report ' + (current + 1) + ' of ' + total + (title ? ': ' + title.textContent : '');
        }
    }

    function goTo(index) {
        current = ((index % total) + total) % total;
        render(true);
        startAuto();
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(current - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(current + 1); });

    // Keyboard: panah kiri/kanan saat carousel difokuskan
    carousel.setAttribute('tabindex', '0');
    carousel.addEventListener('keydown', function (e) {
        if (e.target !== carousel) return;
        if (e.key === 'ArrowLeft') goTo(current - 1);
        if (e.key === 'ArrowRight') goTo(current + 1);
    });

    // Geser dengan mouse / sentuhan
    var startX = 0;
    var deltaX = 0;
    var dragging = false;
    var moved = false;
    var THRESHOLD = 50;

    viewport.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        dragging = true;
        moved = false;
        startX = e.clientX;
        deltaX = 0;
    });

    viewport.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        deltaX = e.clientX - startX;
        if (Math.abs(deltaX) > 5) {
            moved = true;
            viewport.classList.add('is-dragging');
        }
    });

    function endDrag() {
        if (!dragging) return;
        dragging = false;
        viewport.classList.remove('is-dragging');
        if (deltaX <= -THRESHOLD) goTo(current + 1);
        else if (deltaX >= THRESHOLD) goTo(current - 1);
    }

    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);
    viewport.addEventListener('pointerleave', endDrag);

    // Klik pada card samping memindahkannya ke tengah; klik setelah drag tidak membuka link
    viewport.addEventListener('click', function (e) {
        var slide = e.target.closest('.recent-slide');
        if (moved) {
            e.preventDefault();
            e.stopPropagation();
            moved = false;
            return;
        }
        if (slide && !slide.classList.contains('is-active') && !slide.classList.contains('is-hidden')) {
            e.preventDefault();
            goTo(slides.indexOf(slide));
        }
    }, true);

    viewport.addEventListener('dragstart', function (e) { e.preventDefault(); });

    // Putar otomatis: jeda saat kursor/fokus berada di carousel, tab tersembunyi, atau carousel di luar layar
    var timer = null;
    var paused = false;
    var inView = false;

    function stopAuto() {
        if (timer) { clearInterval(timer); timer = null; }
    }
    function startAuto() {
        stopAuto();
        if (reduceMotion || paused || !inView || document.hidden) return;
        timer = setInterval(function () { goTo(current + 1); }, 5500);
    }

    carousel.addEventListener('mouseenter', function () { paused = true; stopAuto(); });
    carousel.addEventListener('mouseleave', function () { paused = false; startAuto(); });
    carousel.addEventListener('focusin', function () { paused = true; stopAuto(); });
    carousel.addEventListener('focusout', function () { paused = false; startAuto(); });
    document.addEventListener('visibilitychange', startAuto);

    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            inView = entries[0].isIntersecting;
            startAuto();
        }, { threshold: 0.4 }).observe(carousel);
    }

    render(false);
})();
