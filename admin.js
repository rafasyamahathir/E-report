// E-Medicare Admin: report data, navbar features (search, notifications, theme, profile),
// Dashboard, Statistics, and Settings. Data is stored in the browser's localStorage (no server).
(function () {
    'use strict';

    const doc = document;
    const root = doc.documentElement;
    const page = doc.body.getAttribute('data-page');
    const $ = (sel, ctx) => (ctx || doc).querySelector(sel);
    const $$ = (sel, ctx) => Array.prototype.slice.call((ctx || doc).querySelectorAll(sel));

    /* =====================================================
       1. CONSTANTS & STORAGE
       ===================================================== */
    const KEYS = { reports: 'em3.reports', settings: 'em3.settings', notif: 'em3.notif', theme: 'em3.theme' };

    const CATS = {
        Emergency:  { icon: 'bi-car-front-fill',        color: '#E26D5A', dept: 'Emergency Department' },
        Inpatient:  { icon: 'bi-heart-pulse-fill',      color: '#4D8DBA', dept: 'Inpatient Unit' },
        Pharmacy:   { icon: 'bi-capsule',               color: '#2E9E7A', dept: 'Pharmacy' },
        Laboratory: { icon: 'bi-clipboard2-pulse-fill', color: '#8E7CC3', dept: 'Laboratory' }
    };
    const STATUS = {
        critical:  { label: 'Critical',   cls: 'st-critical',  color: '#E5484D', order: 0 },
        review:    { label: 'Under review', cls: 'st-review',    color: '#E0A030', order: 1 },
        progress:  { label: 'In progress', cls: 'st-progress',  color: '#4D8DBA', order: 2 },
        submitted: { label: 'Submitted', cls: 'st-submitted', color: '#2E9E7A', order: 3 },
        closed:    { label: 'Completed',  cls: 'st-closed',    color: '#8497A8', order: 4 }
    };
    const PRIORITY = { high: 'High', medium: 'Medium', low: 'Low' };
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const DEFAULT_SETTINGS = {
        hospital: 'E-Medicare',
        email: 'E-medicare@gmail.com',
        phone: '118',
        address: 'Jl. Raya Jonggol No.1A, Sukamanah, Kec. Jonggol, Kabupaten Bogor, Jawa Barat 16830',
        admin: 'Admin',
        role: 'System manager',
        adminEmail: 'admin@e-medicare.local',
        notif: { Emergency: true, Inpatient: true, Pharmacy: true, Laboratory: true, digest: false },
        compact: false,
        reduceMotion: false
    };

    function load(key, fallback) {
        try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
    }
    function save(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
    }
    function esc(s) {
        return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    function isoDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    function daysAgoIso(n) { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return isoDate(d); }
    function parseIso(s) { const p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); }
    function fmtDate(s) { const d = parseIso(s); return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
    function diffDays(s) {
        const t = new Date(); t.setHours(12, 0, 0, 0);
        return Math.round((t - parseIso(s)) / 86400000);
    }
    function relDay(s) {
        const n = diffDays(s);
        if (n <= 0) return 'Today';
        if (n === 1) return 'Yesterday';
        return n + ' days ago';
    }
    function prefersReduced() {
        return root.getAttribute('data-motion') === 'reduced' ||
            (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    /* ----- Report data (contoh ilustrasi, tanpa data pasien nyata) ----- */
    function seedReports() {
        const rows = [
            ['Road Traffic Injury', 'Emergency', 'review', 'high', 2, 'detail-road-traffic-injury.html', 'An unidentified patient was brought to the emergency department after a road traffic collision.'],
            ['Cancer Patient (Stage III)', 'Inpatient', 'progress', 'medium', 1, 'detail-patient-monitoring.html', 'A patient with stage III cancer is receiving treatment in the inpatient unit.'],
            ['Medication Stock Alert', 'Pharmacy', 'submitted', 'high', 2, 'detail-medication-stock-alert.html', 'An essential medication was reported as running low.'],
            ['Severe Allergic Reaction', 'Emergency', 'review', 'high', 0, 'detail-allergic-reaction.html', 'A patient was assessed after a suspected severe allergic reaction.'],
            ['Inpatient Fall Incident', 'Inpatient', 'progress', 'medium', 0, 'detail-inpatient-fall.html', 'A patient fall in a hospital room was reported to the care team.'],
            ['Critical Lab Result Alert', 'Laboratory', 'submitted', 'high', 0, 'detail-critical-lab-result.html', 'A critical test result was flagged for the responsible clinical team.'],
            ['Burn Injury Assessment', 'Emergency', 'closed', 'medium', 3, null, 'Initial assessment and dressing of a minor burn injury.'],
            ['Post-Surgery Monitoring', 'Inpatient', 'closed', 'low', 4, null, 'Routine monitoring after a scheduled surgical procedure.'],
            ['Antibiotic Stock Running Low', 'Pharmacy', 'progress', 'medium', 5, null, 'Stock of a common antibiotic is below the reorder level.'],
            ['Blood Panel Delayed', 'Laboratory', 'review', 'medium', 6, null, 'A blood panel result was delayed beyond the expected turnaround time.'],
            ['Cardiac Arrest Response Log', 'Emergency', 'closed', 'high', 7, null, 'Response timeline recorded for a cardiac arrest drill.'],
            ['Ward Bed Capacity Alert', 'Inpatient', 'submitted', 'low', 8, null, 'Bed occupancy reached the alert threshold in one ward.'],
            ['Insulin Supply Reorder', 'Pharmacy', 'closed', 'low', 9, null, 'Reorder request for insulin supplies was completed.'],
            ['Abnormal Potassium Result', 'Laboratory', 'critical', 'high', 10, null, 'An abnormal potassium value was flagged for urgent clinical review.'],
            ['Pediatric Fever Case', 'Emergency', 'closed', 'low', 11, null, 'A pediatric fever case was assessed and handed over to the ward.'],
            ['Wound Care Follow-up', 'Inpatient', 'closed', 'low', 12, null, 'Scheduled wound care follow-up was completed.'],
            ['Expired Medication Check', 'Pharmacy', 'closed', 'medium', 14, null, 'Monthly expiry check of the medication cabinet.'],
            ['Culture Sample Mix-up Report', 'Laboratory', 'closed', 'high', 16, null, 'A sample labelling issue was reported and corrected.'],
            ['Fracture Triage', 'Emergency', 'closed', 'medium', 19, null, 'Triage and referral of a suspected fracture.'],
            ['Discharge Planning Review', 'Inpatient', 'closed', 'low', 22, null, 'Discharge planning review completed with the care team.']
        ];
        return rows.map((r, i) => ({
            id: 'EMR-2026-' + (i < 9 ? '00' : '0') + (i + 1),
            title: r[0], cat: r[1], dept: CATS[r[1]].dept, status: r[2], priority: r[3],
            date: daysAgoIso(r[4]), page: r[5], desc: r[6]
        }));
    }
    function getReports() {
        const stored = load(KEYS.reports, null);
        if (Array.isArray(stored) && stored.length) return stored;
        const seeded = seedReports();
        save(KEYS.reports, seeded);
        return seeded;
    }
    function setReports(list) { save(KEYS.reports, list); }
    function nextId(list) {
        let max = 0;
        list.forEach((r) => { const n = parseInt(String(r.id).split('-').pop(), 10); if (n > max) max = n; });
        const n = max + 1;
        return 'EMR-2026-' + (n < 10 ? '00' : n < 100 ? '0' : '') + n;
    }
    function getSettings() {
        const s = load(KEYS.settings, {});
        return Object.assign({}, DEFAULT_SETTINGS, s, { notif: Object.assign({}, DEFAULT_SETTINGS.notif, s.notif || {}) });
    }
    function saveSettings(patch) {
        const merged = Object.assign({}, getSettings(), patch);
        save(KEYS.settings, merged);
        applySettings();
        return merged;
    }

    /* =====================================================
       2. TEMA, KEPADATAN, PROFIL
       ===================================================== */
    function themeMode() { try { return localStorage.getItem(KEYS.theme) || 'system'; } catch (e) { return 'system'; } }
    function applyTheme(mode) {
        const dark = mode === 'dark' || (mode === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
        root.setAttribute('data-bs-theme', dark ? 'dark' : 'light');
    }
    function setTheme(mode) {
        try { localStorage.setItem(KEYS.theme, mode); } catch (e) { /* abaikan */ }
        applyTheme(mode);
    }
    if (window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = () => { if (themeMode() === 'system') applyTheme('system'); };
        if (mq.addEventListener) mq.addEventListener('change', onChange);
    }

    function initials(name) {
        const parts = String(name).trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return 'AD';
        return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : (parts[0][1] || ''))).toUpperCase();
    }
    function applySettings() {
        const s = getSettings();
        root.setAttribute('data-density', s.compact ? 'compact' : 'comfortable');
        if (s.reduceMotion) root.setAttribute('data-motion', 'reduced'); else root.removeAttribute('data-motion');
        $$('[data-bind="adminName"]').forEach((el) => { el.textContent = s.admin; });
        $$('[data-bind="adminRole"]').forEach((el) => { el.textContent = s.role; });
        $$('[data-bind="adminInitials"]').forEach((el) => { el.textContent = initials(s.admin); });
        $$('[data-bind="hospital"]').forEach((el) => { el.textContent = s.hospital; });
    }

    /* =====================================================
       3. UTILITAS UI (toast, hitung angka, unduh CSV)
       ===================================================== */
    function toast(message, type) {
        let host = $('#toastHost');
        if (!host) { host = doc.createElement('div'); host.id = 'toastHost'; host.className = 'toast-host'; host.setAttribute('aria-live', 'polite'); doc.body.appendChild(host); }
        const el = doc.createElement('div');
        el.className = 'adm-toast' + (type === 'error' ? ' is-error' : '');
        el.innerHTML = '<i class="bi ' + (type === 'error' ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill') + '" aria-hidden="true"></i><span>' + esc(message) + '</span>';
        host.appendChild(el);
        setTimeout(() => { el.classList.add('is-out'); setTimeout(() => el.remove(), 350); }, 3200);
    }

    function countTo(el, target, opts) {
        if (!el) return;
        opts = opts || {};
        const dec = opts.decimals || 0;
        const suffix = opts.suffix || '';
        const fmt = (v) => (dec ? v.toFixed(dec).replace('.', ',') : Math.round(v)) + suffix;
        if (prefersReduced()) { el.textContent = fmt(target); return; }
        const duration = 900;
        let start = null;
        function step(ts) {
            if (start === null) start = ts;
            const p = Math.min((ts - start) / duration, 1);
            el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)));
            if (p < 1) window.requestAnimationFrame(step);
        }
        window.requestAnimationFrame(step);
    }

    function downloadFile(filename, content, mime) {
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = doc.createElement('a');
        a.href = url; a.download = filename;
        doc.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 500);
    }
    function exportCsv(filename, list) {
        const head = ['ID', 'Title', 'Category', 'Department', 'Priority', 'Status', 'Date', 'Summary'];
        const rows = list.map((r) => [r.id, r.title, r.cat, r.dept, PRIORITY[r.priority] || r.priority, STATUS[r.status].label, r.date, r.desc || '']);
        const csv = [head].concat(rows).map((row) => row.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\r\n');
        downloadFile(filename, '\ufeff' + csv, 'text/csv;charset=utf-8');
        toast('File ' + filename + ' diunduh (' + list.length + ' baris)');
    }
    function statusBadge(key) {
        const s = STATUS[key];
        return '<span class="status-badge ' + s.cls + '"><i class="bi bi-circle-fill" style="font-size:.55rem" aria-hidden="true"></i>' + s.label + '</span>';
    }
    function catChip(cat) {
        return '<span class="cat-chip cat-' + cat + '"><i class="bi ' + CATS[cat].icon + '" aria-hidden="true"></i>' + cat + '</span>';
    }
    function getModal(id) {
        const el = $(id);
        return el && window.bootstrap ? window.bootstrap.Modal.getOrCreateInstance(el) : null;
    }

    /* =====================================================
       4. FITUR NAVBAR ADMIN
       ===================================================== */
    function initTopbar() {
        // Light mode / gelap
        const themeBtn = $('#themeToggle');
        if (themeBtn) themeBtn.addEventListener('click', () => {
            const dark = root.getAttribute('data-bs-theme') === 'dark';
            setTheme(dark ? 'light' : 'dark');
            syncThemeRadios();
        });
        $$('[data-theme-set]').forEach((b) => b.addEventListener('click', () => { setTheme(b.getAttribute('data-theme-set')); syncThemeRadios(); }));

        // Tambah cepat
        const quick = $('#quickAdd');
        if (quick) quick.addEventListener('click', () => {
            if (page === 'dashboard') window.dispatchEvent(new Event('em:add'));
            else window.location.href = 'dashboard.html#tambah';
        });

        initSearch();
        initNotifications();
        applySettings();

        // Keyboard shortcut: "/" or Ctrl+K focuses the search
        doc.addEventListener('keydown', (e) => {
            const input = $('#adminSearch');
            if (!input) return;
            const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || '')) || e.target.isContentEditable;
            if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
                e.preventDefault(); input.focus(); input.select();
            }
        });
    }

    function initSearch() {
        const input = $('#adminSearch');
        const box = $('#searchResults');
        if (!input || !box) return;
        let results = [];
        let active = -1;

        function pool() {
            const pages = [
                { t: 'Dashboard', s: 'Summary & data laporan', h: 'dashboard.html', i: 'bi-speedometer2' },
                { t: 'Statistics', s: 'Grafik & analisis laporan', h: 'statistik.html', i: 'bi-bar-chart-line' },
                { t: 'Settings', s: 'Profil, notifikasi, tampilan', h: 'pengaturan.html', i: 'bi-gear' },
                { t: 'Home', s: 'Halaman utama E-Medicare', h: 'index.html', i: 'bi-house-door' },
                { t: 'Recent Reports', s: 'Carousel laporan terbaru', h: 'index.html#recent', i: 'bi-file-earmark-medical' },
                { t: 'FAQ', s: 'Pertanyaan yang sering diajukan', h: 'index.html#faq', i: 'bi-question-circle' }
            ];
            const reps = getReports().map((r) => ({ t: r.title, s: r.id + ' · ' + r.cat, h: r.page || 'dashboard.html?q=' + encodeURIComponent(r.id), i: CATS[r.cat].icon }));
            return pages.concat(reps);
        }
        function render() {
            if (!results.length) { box.innerHTML = '<div class="sr-empty">No results for "' + esc(input.value) + '"</div>'; return; }
            box.innerHTML = results.map((r, i) =>
                '<a class="sr-item' + (i === active ? ' is-active' : '') + '" href="' + esc(r.h) + '"><i class="bi ' + r.i + '" aria-hidden="true"></i><span><strong>' + esc(r.t) + '</strong><small>' + esc(r.s) + '</small></span></a>'
            ).join('');
        }
        function search() {
            const q = input.value.trim().toLowerCase();
            if (!q) { box.hidden = true; return; }
            results = pool().filter((r) => (r.t + ' ' + r.s).toLowerCase().indexOf(q) !== -1).slice(0, 7);
            active = results.length ? 0 : -1;
            render();
            box.hidden = false;
        }
        input.addEventListener('input', search);
        input.addEventListener('focus', search);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { box.hidden = true; input.blur(); return; }
            if (box.hidden || !results.length) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % results.length; render(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + results.length) % results.length; render(); }
            else if (e.key === 'Enter') { e.preventDefault(); window.location.href = results[Math.max(active, 0)].h; }
        });
        doc.addEventListener('click', (e) => { if (!e.target.closest('.tb-search')) box.hidden = true; });
    }

    function initNotifications() {
        const list = $('#notifList');
        const badge = $('#notifBadge');
        if (!list) return;

        function items() {
            const s = getSettings();
            return getReports()
                .filter((r) => r.status !== 'closed' && s.notif[r.cat] !== false)
                .sort((a, b) => (STATUS[a.status].order - STATUS[b.status].order) || (b.date < a.date ? -1 : b.date > a.date ? 1 : 0))
                .slice(0, 6);
        }
        function key(r) { return r.id + ':' + r.status; }
        function render() {
            const read = load(KEYS.notif, []);
            const data = items();
            const unread = data.filter((r) => read.indexOf(key(r)) === -1).length;
            if (badge) { badge.textContent = unread; badge.hidden = unread === 0; }
            if (!data.length) { list.innerHTML = '<div class="notif-empty"><i class="bi bi-bell-slash fs-3 d-block mb-2" aria-hidden="true"></i>No notifications</div>'; return; }
            list.innerHTML = data.map((r) => {
                const isUnread = read.indexOf(key(r)) === -1;
                const href = r.page || 'dashboard.html?q=' + encodeURIComponent(r.id);
                return '<a class="notif-item' + (isUnread ? ' is-unread' : '') + '" href="' + esc(href) + '" data-key="' + esc(key(r)) + '">' +
                    '<span class="notif-ico" style="--c:' + CATS[r.cat].color + '"><i class="bi ' + CATS[r.cat].icon + '" aria-hidden="true"></i></span>' +
                    '<span><strong>' + esc(r.title) + '</strong><small>' + STATUS[r.status].label + ' · ' + esc(r.dept) + ' · ' + relDay(r.date) + '</small></span></a>';
            }).join('');
        }
        const readAll = $('#notifReadAll');
        if (readAll) readAll.addEventListener('click', (e) => {
            e.stopPropagation();
            save(KEYS.notif, items().map(key));
            render();
            toast('All notifications marked as read');
        });
        list.addEventListener('click', (e) => {
            const a = e.target.closest('.notif-item');
            if (!a) return;
            const read = load(KEYS.notif, []);
            const k = a.getAttribute('data-key');
            if (read.indexOf(k) === -1) { read.push(k); save(KEYS.notif, read); }
        });
        render();
        window.addEventListener('em:data', render);
    }

    /* =====================================================
       5. DASHBOARD
       ===================================================== */
    function initDashboard() {
        const state = { q: '', cat: '', status: '', sortKey: 'date', sortDir: -1, page: 1, perPage: 6 };
        const body = $('#reportBody');
        if (!body) return;
        const params = new URLSearchParams(window.location.search);
        if (params.get('q')) { state.q = params.get('q'); $('#fSearch').value = state.q; }

        const today = $('#todayLabel');
        if (today) today.textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

        function reports() { return getReports(); }
        function broadcast() { window.dispatchEvent(new Event('em:data')); }

        /* --- Summary --- */
        function renderKpi() {
            const list = reports();
            const total = list.length;
            const open = list.filter((r) => r.status === 'review' || r.status === 'progress');
            const critical = list.filter((r) => r.status === 'critical');
            const done = list.filter((r) => r.status === 'closed' || r.status === 'submitted');
            const week = list.filter((r) => diffDays(r.date) <= 6).length;
            countTo($('[data-kpi="total"]'), total);
            countTo($('[data-kpi="open"]'), open.length);
            countTo($('[data-kpi="critical"]'), critical.length);
            countTo($('[data-kpi="done"]'), done.length);
            $('[data-kpi-note="total"]').innerHTML = '<i class="bi bi-calendar-week" aria-hidden="true"></i><span><strong>' + week + '</strong> laporan dalam 7 days terakhir</span>';
            $('[data-kpi-note="open"]').innerHTML = '<i class="bi bi-exclamation-circle" aria-hidden="true"></i><span><strong>' + open.filter((r) => r.priority === 'high').length + '</strong> berprioritas tinggi</span>';
            $('[data-kpi-note="critical"]').innerHTML = '<i class="bi bi-lightning-charge" aria-hidden="true"></i><span>' + (critical.length ? 'Needs immediate handling' : 'No critical cases') + '</span>';
            $('[data-kpi-note="done"]').innerHTML = '<i class="bi bi-graph-up-arrow" aria-hidden="true"></i><span><strong>' + (total ? Math.round(done.length / total * 100) : 0) + '%</strong> dari seluruh laporan</span>';
            $$('[data-bind="sideCount"]').forEach((el) => { el.textContent = open.length + critical.length; });
        }

        /* --- Aktivitas --- */
        function renderActivity() {
            const latest = reports().slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.id < b.id ? 1 : -1))).slice(0, 5);
            $('#activityList').innerHTML = latest.map((r) =>
                '<li style="--c:' + CATS[r.cat].color + '"><span class="act-ico"><i class="bi ' + CATS[r.cat].icon + '" aria-hidden="true"></i></span>' +
                '<div><a href="' + esc(r.page || 'dashboard.html?q=' + encodeURIComponent(r.id)) + '">' + esc(r.title) + '</a><small>' + esc(r.dept) + ' · ' + relDay(r.date) + '</small></div></li>'
            ).join('');
        }

        /* --- Tabel --- */
        function filtered() {
            const q = state.q.trim().toLowerCase();
            const list = reports().filter((r) =>
                (!q || (r.id + ' ' + r.title + ' ' + r.dept + ' ' + r.cat).toLowerCase().indexOf(q) !== -1) &&
                (!state.cat || r.cat === state.cat) && (!state.status || r.status === state.status));
            const k = state.sortKey;
            list.sort((a, b) => {
                let x = a[k], y = b[k];
                if (k === 'status') { x = STATUS[a.status].order; y = STATUS[b.status].order; }
                if (x < y) return -1 * state.sortDir;
                if (x > y) return 1 * state.sortDir;
                return a.id < b.id ? 1 : -1;
            });
            return list;
        }
        function renderTable() {
            const list = filtered();
            const pages = Math.max(1, Math.ceil(list.length / state.perPage));
            if (state.page > pages) state.page = pages;
            const from = (state.page - 1) * state.perPage;
            const slice = list.slice(from, from + state.perPage);

            if (!slice.length) {
                body.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="bi bi-inbox" aria-hidden="true"></i>No reports match the search or filter.</div></td></tr>';
            } else {
                body.innerHTML = slice.map((r) =>
                    '<tr><td class="rt-id">#' + esc(r.id) + '</td>' +
                    '<td><div class="rt-title">' + esc(r.title) + '<small>' + esc(r.dept) + '</small></div></td>' +
                    '<td class="d-none d-md-table-cell">' + catChip(r.cat) + '</td>' +
                    '<td class="d-none d-lg-table-cell text-nowrap">' + fmtDate(r.date) + '</td>' +
                    '<td>' + statusBadge(r.status) + '</td>' +
                    '<td><div class="row-actions">' +
                    '<button type="button" class="icon-btn" data-act="view" data-id="' + esc(r.id) + '" title="View details" aria-label="View details ' + esc(r.title) + '"><i class="bi bi-eye"></i></button>' +
                    '<button type="button" class="icon-btn" data-act="edit" data-id="' + esc(r.id) + '" title="Ubah" aria-label="Ubah ' + esc(r.title) + '"><i class="bi bi-pencil-square"></i></button>' +
                    '<button type="button" class="icon-btn danger" data-act="del" data-id="' + esc(r.id) + '" title="Delete" aria-label="Delete ' + esc(r.title) + '"><i class="bi bi-trash"></i></button>' +
                    '</div></td></tr>'
                ).join('');
            }

            $('#tableInfo').textContent = list.length ? 'Menampilkan ' + (from + 1) + '–' + (from + slice.length) + ' dari ' + list.length + ' laporan' : '0 laporan';
            let pg = '<li class="page-item' + (state.page === 1 ? ' disabled' : '') + '"><button class="page-link" data-page="' + (state.page - 1) + '" aria-label="Sebelumnya"><i class="bi bi-chevron-left"></i></button></li>';
            for (let i = 1; i <= pages; i++) pg += '<li class="page-item' + (i === state.page ? ' active' : '') + '"><button class="page-link" data-page="' + i + '">' + i + '</button></li>';
            pg += '<li class="page-item' + (state.page === pages ? ' disabled' : '') + '"><button class="page-link" data-page="' + (state.page + 1) + '" aria-label="Berikutnya"><i class="bi bi-chevron-right"></i></button></li>';
            $('#pager').innerHTML = pg;

            $$('.sort-btn').forEach((b) => {
                const on = b.getAttribute('data-sort') === state.sortKey;
                b.classList.toggle('is-sorted', on);
                b.querySelector('i').className = 'bi ' + (on ? (state.sortDir === 1 ? 'bi-sort-up' : 'bi-sort-down') : 'bi-arrow-down-up');
            });
        }
        function refresh() { renderKpi(); renderActivity(); renderTable(); broadcast(); }

        /* --- Filter, urutan, halaman --- */
        $('#fSearch').addEventListener('input', (e) => { state.q = e.target.value; state.page = 1; renderTable(); });
        $('#fCat').addEventListener('change', (e) => { state.cat = e.target.value; state.page = 1; renderTable(); });
        $('#fStatus').addEventListener('change', (e) => { state.status = e.target.value; state.page = 1; renderTable(); });
        $$('.sort-btn').forEach((b) => b.addEventListener('click', () => {
            const k = b.getAttribute('data-sort');
            if (state.sortKey === k) state.sortDir *= -1; else { state.sortKey = k; state.sortDir = k === 'date' ? -1 : 1; }
            renderTable();
        }));
        $('#pager').addEventListener('click', (e) => {
            const b = e.target.closest('[data-page]');
            if (!b || b.closest('.disabled')) return;
            state.page = +b.getAttribute('data-page');
            renderTable();
        });
        $('#btnExport').addEventListener('click', () => exportCsv('laporan-e-medicare.csv', filtered()));
        $('#btnReset').addEventListener('click', () => {
            state.q = ''; state.cat = ''; state.status = ''; state.page = 1;
            $('#fSearch').value = ''; $('#fCat').value = ''; $('#fStatus').value = '';
            renderTable();
        });

        /* --- Form tambah / ubah --- */
        const form = $('#reportForm');
        const modal = getModal('#reportModal');
        function openForm(report) {
            form.classList.remove('was-validated');
            form.reset();
            $('#fId').value = report ? report.id : '';
            $('#reportModalTitle').textContent = report ? 'Ubah laporan ' + report.id : 'Add report';
            $('#fTitle').value = report ? report.title : '';
            $('#fCategory').value = report ? report.cat : '';
            $('#fPriority').value = report ? report.priority : 'medium';
            $('#fState').value = report ? report.status : 'review';
            $('#fDecc').value = report ? report.desc || '' : '';
            if (modal) modal.show();
        }
        window.addEventListener('em:add', () => openForm(null));
        $('#btnAdd').addEventListener('click', () => openForm(null));
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            form.classList.add('was-validated');
            if (!form.checkValidity()) return;
            const list = reports();
            const id = $('#fId').value;
            const data = {
                title: $('#fTitle').value.trim(), cat: $('#fCategory').value, priority: $('#fPriority').value,
                status: $('#fState').value, desc: $('#fDecc').value.trim()
            };
            data.dept = CATS[data.cat].dept;
            if (id) {
                const r = list.filter((x) => x.id === id)[0];
                if (r) Object.assign(r, data);
                toast('Report ' + id + ' diperbarui');
            } else {
                const created = Object.assign({ id: nextId(list), date: isoDate(new Date()), page: null }, data);
                list.unshift(created);
                state.page = 1; state.sortKey = 'date'; state.sortDir = -1;
                toast('Report ' + created.id + ' ditambahkan');
            }
            setReports(list);
            if (modal) modal.hide();
            refresh();
        });

        /* --- View details & hapus --- */
        const viewModal = getModal('#viewModal');
        const delModal = getModal('#deleteModal');
        let pendingDelete = null;
        function find(id) { return reports().filter((r) => r.id === id)[0]; }
        body.addEventListener('click', (e) => {
            const b = e.target.closest('[data-act]');
            if (!b) return;
            const r = find(b.getAttribute('data-id'));
            if (!r) return;
            const act = b.getAttribute('data-act');
            if (act === 'edit') openForm(r);
            if (act === 'del') { pendingDelete = r.id; $('#deleteName').textContent = r.title; if (delModal) delModal.show(); }
            if (act === 'view') {
                $('#viewTitle').textContent = r.title;
                $('#viewBody').innerHTML =
                    '<div class="d-flex flex-wrap gap-2 mb-3">' + catChip(r.cat) + statusBadge(r.status) + '</div>' +
                    '<p class="mb-3">' + esc(r.desc || 'No summary available.') + '</p>' +
                    '<dl class="kv"><div><dt>ID laporan</dt><dd>' + esc(r.id) + '</dd></div><div><dt>Department</dt><dd>' + esc(r.dept) + '</dd></div>' +
                    '<div><dt>Priority</dt><dd>' + (PRIORITY[r.priority] || r.priority) + '</dd></div><div><dt>Date</dt><dd>' + fmtDate(r.date) + '</dd></div></dl>' +
                    '<p class="small text-secondary mt-3 mb-0"><i class="bi bi-info-circle-fill me-1"></i>Illustrative case only. No real patient information.</p>';
                const link = $('#viewLink');
                if (r.page) { link.href = r.page; link.hidden = false; } else { link.hidden = true; }
                if (viewModal) viewModal.show();
            }
        });
        $('#confirmDelete').addEventListener('click', () => {
            if (!pendingDelete) return;
            setReports(reports().filter((r) => r.id !== pendingDelete));
            toast('Report ' + pendingDelete + ' dihapus');
            pendingDelete = null;
            if (delModal) delModal.hide();
            refresh();
        });

        refresh();
        if (window.location.hash === '#tambah') {
            history.replaceState(null, '', window.location.pathname + window.location.search);
            openForm(null);
        }
    }

    /* =====================================================
       6. STATISTIK
       ===================================================== */
    function initStats() {
        const chartEl = $('#barChart');
        if (!chartEl) return;
        let period = 14;

        function inPeriod() { return getReports().filter((r) => diffDays(r.date) >= 0 && diffDays(r.date) < period); }
        function pct(n, t) { return t ? Math.round(n / t * 100) : 0; }

        function renderKpi(list) {
            const total = list.length;
            const done = list.filter((r) => r.status === 'closed' || r.status === 'submitted').length;
            const high = list.filter((r) => r.priority === 'high').length;
            countTo($('[data-kpi="total"]'), total);
            countTo($('[data-kpi="avg"]'), total / period, { decimals: 1 });
            countTo($('[data-kpi="rate"]'), pct(done, total), { suffix: '%' });
            countTo($('[data-kpi="high"]'), high);
            $('[data-kpi-note="total"]').innerHTML = '<i class="bi bi-calendar3" aria-hidden="true"></i><span>' + period + ' hari terakhir</span>';
            $('[data-kpi-note="avg"]').innerHTML = '<i class="bi bi-speedometer" aria-hidden="true"></i><span>laporan per hari</span>';
            $('[data-kpi-note="rate"]').innerHTML = '<i class="bi bi-check2-circle" aria-hidden="true"></i><span><strong>' + done + '</strong> selesai / terkirim</span>';
            $('[data-kpi-note="high"]').innerHTML = '<i class="bi bi-flag" aria-hidden="true"></i><span>' + pct(high, total) + '% dari laporan</span>';
        }

        function renderBars(list) {
            const counts = [];
            const labels = [];
            for (let i = period - 1; i >= 0; i--) {
                const iso = daysAgoIso(i);
                counts.push(list.filter((r) => r.date === iso).length);
                const d = parseIso(iso);
                labels.push(d.getDate() + ' ' + MONTHS[d.getMonth()]);
            }
            const W = 640, H = 250, L = 34, R = 8, T = 12, B = 30;
            const iw = W - L - R, ih = H - T - B;
            const max = Math.max.apply(null, counts.concat([1]));
            const top = max <= 2 ? 2 : Math.ceil(max / 2) * 2;
            const slot = iw / period;
            const bw = Math.min(30, slot * 0.62);
            const step = period <= 7 ? 1 : period <= 14 ? 2 : 5;
            let svg = '';
            [0, 0.5, 1].forEach((f) => {
                const y = T + ih - ih * f;
                svg += '<line class="grid-line" x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '"/><text x="' + (L - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + Math.round(top * f) + '</text>';
            });
            counts.forEach((c, i) => {
                const h = Math.max(c / top * ih, 3);
                const x = L + i * slot + (slot - bw) / 2;
                svg += '<rect class="bar' + (c === 0 ? ' is-zero' : '') + '" style="--i:' + i + '" x="' + x.toFixed(1) + '" y="' + (T + ih - h).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="5"><title>' + labels[i] + ': ' + c + ' laporan</title></rect>';
                if ((period - 1 - i) % step === 0) svg += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + labels[i] + '</text>';
            });
            chartEl.classList.remove('is-in');
            chartEl.innerHTML = svg;
            window.requestAnimationFrame(() => window.requestAnimationFrame(() => chartEl.classList.add('is-in')));
            chartEl.setAttribute('aria-label', 'Grafik batang laporan per hari selama ' + period + ' hari terakhir');
        }

        function renderDonut(list) {
            const total = list.length;
            let acc = 0;
            const stops = [];
            Object.keys(CATS).forEach((c) => {
                const n = list.filter((r) => r.cat === c).length;
                if (!n) return;
                const start = acc / total * 100;
                acc += n;
                stops.push(CATS[c].color + ' ' + start.toFixed(2) + '% ' + (acc / total * 100).toFixed(2) + '%');
            });
            const donut = $('#donut');
            donut.style.background = total ? 'conic-gradient(' + stops.join(', ') + ')' : '';
            donut.classList.remove('is-in');
            window.requestAnimationFrame(() => window.requestAnimationFrame(() => donut.classList.add('is-in')));
            $('#donutTotal').textContent = total;
            $('#legend').innerHTML = Object.keys(CATS).map((c) => {
                const n = list.filter((r) => r.cat === c).length;
                return '<li style="--c:' + CATS[c].color + '"><span class="dot"></span>' + c + '<span class="val">' + n + ' · ' + pct(n, total) + '%</span></li>';
            }).join('');
        }

        function renderStatus(list) {
            const total = list.length;
            const box = $('#statusBars');
            box.innerHTML = Object.keys(STATUS).map((k) => {
                const n = list.filter((r) => r.status === k).length;
                return '<div class="hbar" style="--c:' + STATUS[k].color + ';--p:' + pct(n, total) + '%"><div class="hbar-top"><span>' + STATUS[k].label + '</span><span>' + n + ' · ' + pct(n, total) + '%</span></div><div class="hbar-track"><div class="hbar-fill"></div></div></div>';
            }).join('');
            box.classList.remove('is-in');
            window.requestAnimationFrame(() => window.requestAnimationFrame(() => box.classList.add('is-in')));
        }

        function renderDept(list) {
            const total = list.length;
            const box = $('#deptRows');
            box.innerHTML = Object.keys(CATS).map((c) => {
                const rows = list.filter((r) => r.cat === c);
                const crit = rows.filter((r) => r.status === 'critical').length;
                const open = rows.filter((r) => r.status === 'review' || r.status === 'progress').length;
                return '<tr style="--c:' + CATS[c].color + ';--p:' + pct(rows.length, total) + '%"><td>' + catChip(c) + '<div class="small text-secondary mt-1">' + CATS[c].dept + '</div></td>' +
                    '<td class="fw-bold">' + rows.length + '</td><td>' + open + '</td><td>' + (crit ? '<span class="status-badge st-critical">' + crit + '</span>' : '0') + '</td>' +
                    '<td style="min-width:140px"><div class="hbar mb-0"><div class="hbar-track"><div class="hbar-fill"></div></div></div></td></tr>';
            }).join('');
            const wrap = $('#deptWrap');
            wrap.classList.remove('is-in');
            window.requestAnimationFrame(() => window.requestAnimationFrame(() => wrap.classList.add('is-in')));
        }

        function renderInsights(list) {
            const total = list.length;
            const ul = $('#insights');
            if (!total) { ul.innerHTML = '<li><i class="bi bi-info-circle" aria-hidden="true"></i><span>Belum ada laporan pada periode ini.</span></li>'; return; }
            const byCat = Object.keys(CATS).map((c) => ({ c: c, n: list.filter((r) => r.cat === c).length })).sort((a, b) => b.n - a.n);
            const crit = list.filter((r) => r.status === 'critical').length;
            const open = list.filter((r) => r.status === 'review' || r.status === 'progress').length;
            const busiest = {};
            list.forEach((r) => { busiest[r.date] = (busiest[r.date] || 0) + 1; });
            const bd = Object.keys(busiest).sort((a, b) => busiest[b] - busiest[a])[0];
            const items = [
                ['bi-pie-chart', 'Most common category is <strong>' + byCat[0].c + '</strong> (' + byCat[0].n + ' reports, ' + pct(byCat[0].n, total) + '%).'],
                ['bi-calendar-event', 'Hari tersibuk: <strong>' + fmtDate(bd) + '</strong> dengan ' + busiest[bd] + ' laporan.'],
                ['bi-hourglass-split', '<strong>' + open + '</strong> laporan masih ditinjau atau berjalan' + (crit ? ', dan <strong>' + crit + '</strong> berstatus kritis.' : '.')]
            ];
            ul.innerHTML = items.map((i) => '<li><i class="bi ' + i[0] + '" aria-hidden="true"></i><span>' + i[1] + '</span></li>').join('');
        }

        function render() {
            const list = inPeriod();
            renderKpi(list); renderBars(list); renderDonut(list); renderStatus(list); renderDept(list); renderInsights(list);
            $$('.segmented button').forEach((b) => b.classList.toggle('is-on', +b.getAttribute('data-period') === period));
            $('#periodLabel').textContent = period + ' hari terakhir';
        }
        $$('.segmented button').forEach((b) => b.addEventListener('click', () => { period = +b.getAttribute('data-period'); render(); }));
        $('#btnExport').addEventListener('click', () => exportCsv('statistik-' + period + '-hari.csv', inPeriod()));
        $('#btnPrint').addEventListener('click', () => window.print());
        render();
    }

    /* =====================================================
       7. PENGATURAN
       ===================================================== */
    function syncThemeRadios() {
        const mode = themeMode();
        $$('input[name="theme"]').forEach((r) => { r.checked = r.value === mode; });
    }

    function initSettings() {
        if (!$('#settingsTabs')) return;
        const s = getSettings();

        // Isi form dari data tersimpan
        const set = (id, v) => { const el = $(id); if (el) el.value = v; };
        set('#sHospital', s.hospital); set('#sEmail', s.email); set('#sPhone', s.phone); set('#sAddress', s.address);
        set('#sAdmin', s.admin); set('#sRole', s.role); set('#sAdminEmail', s.adminEmail);
        Object.keys(s.notif).forEach((k) => { const el = $('#n-' + k); if (el) el.checked = !!s.notif[k]; });
        $('#sCompact').checked = !!s.compact;
        $('#sMotion').checked = !!s.reduceMotion;
        syncThemeRadios();

        function validate(form) {
            form.classList.add('was-validated');
            return form.checkValidity();
        }

        // Hospital profile
        $('#formProfile').addEventListener('submit', (e) => {
            e.preventDefault();
            if (!validate(e.target)) return;
            saveSettings({ hospital: $('#sHospital').value.trim(), email: $('#sEmail').value.trim(), phone: $('#sPhone').value.trim(), address: $('#sAddress').value.trim() });
            toast('Hospital profile saved');
        });

        // Admin account
        $('#formAccount').addEventListener('submit', (e) => {
            e.preventDefault();
            if (!validate(e.target)) return;
            saveSettings({ admin: $('#sAdmin').value.trim(), role: $('#sRole').value.trim(), adminEmail: $('#sAdminEmail').value.trim() });
            toast('Admin account saved');
        });

        // Password (demo only, not saved)
        const pwNew = $('#pwNew');
        const bar = $('#pwStrength > span');
        function strength(v) {
            let sc = 0;
            if (v.length >= 8) sc++;
            if (/[a-z]/.test(v) && /[A-Z]/.test(v)) sc++;
            if (/\d/.test(v)) sc++;
            if (/[^A-Za-z0-9]/.test(v)) sc++;
            return sc;
        }
        pwNew.addEventListener('input', () => {
            const sc = strength(pwNew.value);
            bar.style.width = (pwNew.value ? sc * 25 : 0) + '%';
            bar.style.backgroundColor = ['#d9473f', '#d9473f', '#E0A030', '#4D8DBA', '#2E9E7A'][sc];
            $('#pwHint').textContent = pwNew.value ? ['Sangat lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat kuat'][sc] : 'Minimum 8 characters, combine uppercase, lowercase, numbers, and symbols.';
            checkConfirm();
        });
        function checkConfirm() {
            const c = $('#pwConfirm');
            c.setCustomValidity(c.value && c.value !== pwNew.value ? 'Tidak sama' : '');
        }
        $('#pwConfirm').addEventListener('input', checkConfirm);
        $$('.pw-toggle').forEach((b) => b.addEventListener('click', () => {
            const input = $(b.getAttribute('data-target'));
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            b.querySelector('i').className = 'bi ' + (show ? 'bi-eye-slash' : 'bi-eye');
        }));
        $('#formPassword').addEventListener('submit', (e) => {
            e.preventDefault();
            checkConfirm();
            if (!validate(e.target)) return;
            e.target.reset(); e.target.classList.remove('was-validated');
            bar.style.width = '0'; $('#pwHint').textContent = 'Minimum 8 characters, combine uppercase, lowercase, numbers, and symbols.';
            toast('Password updated (demo only; not saved)');
        });

        // Notifications
        $('#formNotif').addEventListener('submit', (e) => {
            e.preventDefault();
            const n = {};
            Object.keys(DEFAULT_SETTINGS.notif).forEach((k) => { n[k] = $('#n-' + k).checked; });
            saveSettings({ notif: n });
            window.dispatchEvent(new Event('em:data'));
            toast('Notification preferences saved');
        });

        // Appearance (langsung diterapkan)
        $$('input[name="theme"]').forEach((r) => r.addEventListener('change', () => { setTheme(r.value); toast('Theme diubah'); }));
        $('#sCompact').addEventListener('change', (e) => { saveSettings({ compact: e.target.checked }); toast(e.target.checked ? 'Tabel dibuat ringkas' : 'Tabel kembali normal'); });
        $('#sMotion').addEventListener('change', (e) => { saveSettings({ reduceMotion: e.target.checked }); toast(e.target.checked ? 'Animasi dikurangi' : 'Animasi diaktifkan'); });

        // Data
        function renderDataStats() {
            let bytes = 0;
            Object.keys(KEYS).forEach((k) => { try { const v = localStorage.getItem(KEYS[k]); if (v) bytes += v.length * 2; } catch (e) { /* abaikan */ } });
            $('#dsReports').textContent = getReports().length;
            $('#dsSize').textContent = (bytes / 1024).toFixed(1) + ' KB';
            $('#dsTheme').textContent = { light: 'Terang', dark: 'Gelap', system: 'Follow system' }[themeMode()];
        }
        renderDataStats();
        window.addEventListener('em:data', renderDataStats);
        $$('input[name="theme"]').forEach((r) => r.addEventListener('change', renderDataStats));
        $('#btnBackup').addEventListener('click', () => {
            const dump = { diekspor: new Date().toISOString(), pengaturan: getSettings(), laporan: getReports() };
            downloadFile('e-medicare-cadangan.json', JSON.stringify(dump, null, 2), 'application/json');
            toast('Cadangan data diunduh');
        });
        const resetModal = getModal('#resetModal');
        $('#btnResetData').addEventListener('click', () => { if (resetModal) resetModal.show(); });
        $('#confirmReset').addEventListener('click', () => {
            Object.keys(KEYS).forEach((k) => { try { localStorage.removeItem(KEYS[k]); } catch (e) { /* abaikan */ } });
            window.location.reload();
        });

        // Tab: ikuti hash URL
        const tabs = $$('#settingsTabs [data-bs-toggle="pill"]');
        function showFromHash() {
            const h = window.location.hash.replace('#', '');
            const btn = tabs.filter((t) => t.getAttribute('data-bs-target') === '#pane-' + h)[0];
            if (btn && window.bootstrap) window.bootstrap.Tab.getOrCreateInstance(btn).show();
        }
        tabs.forEach((t) => t.addEventListener('shown.bs.tab', () => {
            history.replaceState(null, '', '#' + t.getAttribute('data-bs-target').replace('#pane-', ''));
        }));
        showFromHash();
    }

    /* =====================================================
       8. JALANKAN
       ===================================================== */
    initTopbar();
    if (page === 'dashboard') initDashboard();
    if (page === 'statistik') initStats();
    if (page === 'pengaturan') initSettings();
})();
