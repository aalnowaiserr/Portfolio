/* ============================================================
   Abdulrahman A. Alnowaiser — Portfolio
   No frameworks, no CDN dependencies.
   Note: CSP forbids inline style attributes, so every style
   change here goes through CSSOM (el.style.*), never setAttribute.
   ============================================================ */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
    var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

    /* ---------- Theme -------------------------------------- */
    function initTheme() {
        var toggle = $('#theme-toggle');
        var meta = $('#meta-theme-color');
        if (!toggle) return;

        function sync() {
            var isLight = document.documentElement.dataset.theme === 'light';
            toggle.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
            if (meta) meta.setAttribute('content', isLight ? '#FCFCFE' : '#070910');
        }

        toggle.addEventListener('click', function () {
            var next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
            document.documentElement.dataset.theme = next;
            document.documentElement.style.colorScheme = next;
            try { localStorage.setItem('theme', next); } catch (e) { /* ignore */ }
            sync();
            document.dispatchEvent(new CustomEvent('themechange'));
        });

        sync();
    }

    /* ---------- Header state + scroll progress ------------- */
    function initHeader() {
        var header = $('#site-header');
        var bar = $('#scroll-progress-bar');
        var toTop = $('#to-top');
        var ticking = false;

        function update() {
            var y = window.scrollY;
            var max = document.documentElement.scrollHeight - window.innerHeight;

            header.classList.toggle('is-scrolled', y > 24);
            if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
            if (toTop) toTop.classList.toggle('is-visible', y > 700);

            ticking = false;
        }

        window.addEventListener('scroll', function () {
            if (!ticking) { ticking = true; requestAnimationFrame(update); }
        }, { passive: true });

        if (toTop) {
            toTop.addEventListener('click', function () {
                window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
            });
        }

        update();
    }

    /* ---------- Nav: sliding pill + scroll spy ------------- */
    function initNav() {
        var pill = $('#nav-pill');
        var nav = $('.primary-nav');
        var links = $$('.nav-links a[data-nav]');
        if (!pill || !nav || !links.length) return;

        var activeLink = null;

        function movePill(link) {
            if (!link) { pill.classList.remove('is-active'); return; }
            pill.style.width = link.offsetWidth + 'px';
            pill.style.transform = 'translate(' + link.offsetLeft + 'px, -50%)';
            pill.classList.add('is-active');
        }

        function setActive(id) {
            activeLink = id ? $('.nav-links a[href="#' + id + '"]') : null;
            links.forEach(function (l) {
                if (l === activeLink) l.setAttribute('aria-current', 'true');
                else l.removeAttribute('aria-current');
            });
            movePill(activeLink);
        }

        links.forEach(function (l) {
            l.addEventListener('mouseenter', function () { movePill(l); });
            l.addEventListener('focus', function () { movePill(l); });
        });
        nav.addEventListener('mouseleave', function () { movePill(activeLink); });

        var sections = $$('main section[id]');
        var visible = {};

        var spy = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
            var current = null;
            for (var i = 0; i < sections.length; i++) {
                if (visible[sections[i].id]) { current = sections[i].id; break; }
            }
            setActive(current);
        }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

        sections.forEach(function (s) { spy.observe(s); });

        window.addEventListener('resize', function () { movePill(activeLink); }, { passive: true });
    }

    /* ---------- Mobile menu (focus trap + scroll lock) ----- */
    function initMobileMenu() {
        var btn = $('#menu-btn');
        var menu = $('#mobile-menu');
        var close = $('#menu-close');
        if (!btn || !menu) return;

        var lastFocused = null;
        var FOCUSABLE = 'a[href], button:not([disabled])';

        function open() {
            lastFocused = document.activeElement;
            menu.hidden = false;
            requestAnimationFrame(function () { menu.classList.add('is-open'); });
            btn.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
            var first = $(FOCUSABLE, menu);
            if (first) first.focus();
        }

        function shut() {
            menu.classList.remove('is-open');
            btn.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
            var done = function () { menu.hidden = true; };
            if (reduceMotion.matches) done();
            else setTimeout(done, 300);
            if (lastFocused) lastFocused.focus();
        }

        btn.addEventListener('click', open);
        if (close) close.addEventListener('click', shut);
        $$('a', menu).forEach(function (a) { a.addEventListener('click', shut); });

        document.addEventListener('keydown', function (e) {
            if (menu.hidden) return;

            if (e.key === 'Escape') { shut(); return; }

            if (e.key === 'Tab') {
                var items = $$(FOCUSABLE, menu);
                if (!items.length) return;
                var first = items[0];
                var last = items[items.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        });

        // A resize past the mobile breakpoint should not leave the page scroll-locked.
        window.addEventListener('resize', function () {
            if (!menu.hidden && window.innerWidth > 900) shut();
        }, { passive: true });
    }

    /* ---------- Experience tabs (WAI-ARIA pattern) --------- */
    function initTabs() {
        var list = $('.tabs-list');
        if (!list) return;

        var tabs = $$('[role="tab"]', list);
        if (!tabs.length) return;

        function select(tab, focus) {
            tabs.forEach(function (t) {
                var on = t === tab;
                t.setAttribute('aria-selected', on ? 'true' : 'false');
                t.tabIndex = on ? 0 : -1;

                var panel = document.getElementById(t.getAttribute('aria-controls'));
                if (panel) {
                    panel.hidden = !on;
                    panel.classList.toggle('is-active', on);
                }
            });
            if (focus) tab.focus();
        }

        list.addEventListener('click', function (e) {
            var tab = e.target.closest('[role="tab"]');
            if (tab) select(tab, false);
        });

        list.addEventListener('keydown', function (e) {
            var i = tabs.indexOf(document.activeElement);
            if (i < 0) return;

            var next = null;
            switch (e.key) {
                case 'ArrowUp':
                case 'ArrowLeft':  next = tabs[(i - 1 + tabs.length) % tabs.length]; break;
                case 'ArrowDown':
                case 'ArrowRight': next = tabs[(i + 1) % tabs.length]; break;
                case 'Home':       next = tabs[0]; break;
                case 'End':        next = tabs[tabs.length - 1]; break;
                default: return;
            }
            e.preventDefault();
            select(next, true);
        });
    }

    /* ---------- Project disclosures ------------------------ */
    function initDisclosures() {
        $$('.disclosure').forEach(function (btn) {
            var panel = document.getElementById(btn.getAttribute('aria-controls'));
            var label = $('.disclosure-label', btn);
            if (!panel) return;

            btn.addEventListener('click', function () {
                var open = btn.getAttribute('aria-expanded') === 'true';
                btn.setAttribute('aria-expanded', String(!open));
                panel.classList.toggle('is-open', !open);
                if (label) label.textContent = open ? 'Read more' : 'Show less';
            });
        });
    }

    /* ---------- Reveal on scroll --------------------------- */
    function initReveal() {
        var items = $$('[data-reveal]');
        if (!items.length) return;

        if (reduceMotion.matches || !('IntersectionObserver' in window)) {
            items.forEach(function (el) { el.classList.add('is-revealed'); });
            return;
        }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (!e.isIntersecting) return;
                e.target.classList.add('is-revealed');
                io.unobserve(e.target);
            });
        }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

        // Stagger siblings so groups cascade rather than pop in together.
        var groups = new Map();
        items.forEach(function (el) {
            var parent = el.parentElement;
            var n = groups.get(parent) || 0;
            el.style.setProperty('--i', String(n));
            groups.set(parent, n + 1);
            io.observe(el);
        });
    }

    /* ---------- Animated stat counters --------------------- */
    function initCounters() {
        var counters = $$('[data-count]');
        if (!counters.length) return;

        function run(el) {
            var target = parseFloat(el.dataset.count);
            var decimals = parseInt(el.dataset.decimals || '0', 10);

            if (reduceMotion.matches) {
                el.textContent = target.toFixed(decimals);
                return;
            }

            var duration = 1400;
            var start = null;

            function step(ts) {
                if (start === null) start = ts;
                var p = Math.min((ts - start) / duration, 1);
                var eased = 1 - Math.pow(1 - p, 3);
                el.textContent = (target * eased).toFixed(decimals);
                if (p < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        }

        if (!('IntersectionObserver' in window)) {
            counters.forEach(run);
            return;
        }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (!e.isIntersecting) return;
                run(e.target);
                io.unobserve(e.target);
            });
        }, { threshold: 0.6 });

        counters.forEach(function (el) { io.observe(el); });
    }

    /* ---------- Pointer-tracked card spotlight ------------- */
    function initSpotlight() {
        if (!window.matchMedia('(hover: hover)').matches) return;

        $$('[data-spotlight]').forEach(function (card) {
            card.addEventListener('pointermove', function (e) {
                var r = card.getBoundingClientRect();
                card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
                card.style.setProperty('--my', (e.clientY - r.top) + 'px');
            });
        });
    }

    /* ---------- Terminal typing --------------------------- */
    function initTerminal() {
        var body = $('#terminal-body');
        if (!body) return;

        var lines = $$('[data-type]', body);
        if (!lines.length) return;

        if (reduceMotion.matches) return; // leave the static markup as-is

        // Snapshot each line, then empty it so we can retype character by character.
        var queue = lines.map(function (el) {
            var promptEl = $('.t-prompt', el);
            var text = el.textContent;
            if (promptEl) text = text.slice(promptEl.textContent.length);

            el.textContent = '';
            if (promptEl) el.appendChild(promptEl);
            var node = document.createTextNode('');
            el.appendChild(node);

            var isCmd = el.classList.contains('t-line');
            return {
                el: el,
                node: node,
                text: text,
                // Commands type at a human cadence; output dumps fast, like a real shell.
                msPerChar: isCmd ? 18 : 4,
                pause: isCmd ? 120 : 200
            };
        });

        body.classList.add('is-typing');

        // Driven by elapsed time on rAF rather than one setTimeout per character:
        // ~260 chained timeouts accumulate several hundred ms of clamping/scheduling
        // overhead, which stretched a 3.5s animation to well over 5s.
        var START_DELAY = 300;
        var index = 0;
        var shown = -1;
        var origin = null;
        var lineStart = 0;

        function frame(now) {
            if (origin === null) { origin = now; lineStart = now + START_DELAY; }
            if (now < lineStart) { requestAnimationFrame(frame); return; }

            var item = queue[index];
            var elapsed = now - lineStart;
            var chars = Math.min(item.text.length, Math.floor(elapsed / item.msPerChar));

            item.el.classList.add('is-typed');
            if (chars !== shown) {
                item.node.data = item.text.slice(0, chars);
                shown = chars;
            }

            if (chars >= item.text.length &&
                elapsed >= item.text.length * item.msPerChar + item.pause) {
                index++;
                shown = -1;
                lineStart = now;
                if (index >= queue.length) {
                    body.classList.add('is-done');
                    return;
                }
            }
            requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
    }

    /* ---------- Hero constellation canvas ------------------ */
    function initConstellation() {
        var canvas = $('#hero-canvas');
        var hero = $('.hero');
        if (!canvas || !hero || !canvas.getContext) return;

        var ctx = canvas.getContext('2d');
        var LINK = 132;
        var nodes = [];
        var w = 0, h = 0;
        var raf = null;
        var onScreen = true;
        var pointer = { x: -9999, y: -9999 };
        var accent = '#6C8CFF';

        function readAccent() {
            var v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
            if (v) accent = v;
        }

        function seed() {
            var count = Math.min(72, Math.max(24, Math.round((w * h) / 21000)));
            nodes = [];
            for (var i = 0; i < count; i++) {
                nodes.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: (Math.random() - 0.5) * 0.16,
                    vy: (Math.random() - 0.5) * 0.16,
                    r: Math.random() * 1.3 + 0.7
                });
            }
        }

        function resize() {
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            var rect = canvas.getBoundingClientRect();
            w = rect.width;
            h = rect.height;
            if (!w || !h) return;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            seed();
        }

        function draw(animate) {
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = accent;
            ctx.strokeStyle = accent;
            ctx.lineWidth = 1;

            var i, j, a, b, dx, dy, d2, d;

            if (animate) {
                for (i = 0; i < nodes.length; i++) {
                    a = nodes[i];
                    a.x += a.vx;
                    a.y += a.vy;
                    if (a.x < 0 || a.x > w) a.vx *= -1;
                    if (a.y < 0 || a.y > h) a.vy *= -1;

                    // Nudge nodes away from the cursor — makes the field feel alive.
                    dx = a.x - pointer.x;
                    dy = a.y - pointer.y;
                    d2 = dx * dx + dy * dy;
                    if (d2 < 16900 && d2 > 1) {
                        d = Math.sqrt(d2);
                        var force = (130 - d) / 130 * 0.7;
                        a.x += (dx / d) * force;
                        a.y += (dy / d) * force;
                    }
                }
            }

            for (i = 0; i < nodes.length; i++) {
                for (j = i + 1; j < nodes.length; j++) {
                    a = nodes[i];
                    b = nodes[j];
                    dx = a.x - b.x;
                    dy = a.y - b.y;
                    d2 = dx * dx + dy * dy;
                    if (d2 < LINK * LINK) {
                        ctx.globalAlpha = (1 - Math.sqrt(d2) / LINK) * 0.15;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.stroke();
                    }
                }
            }

            ctx.globalAlpha = 0.45;
            for (i = 0; i < nodes.length; i++) {
                a = nodes[i];
                ctx.beginPath();
                ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        function loop() {
            draw(true);
            raf = requestAnimationFrame(loop);
        }

        function start() {
            if (raf !== null || reduceMotion.matches) return;
            raf = requestAnimationFrame(loop);
        }

        function stop() {
            if (raf === null) return;
            cancelAnimationFrame(raf);
            raf = null;
        }

        readAccent();
        resize();

        if (reduceMotion.matches) {
            draw(false);
        } else {
            start();
        }

        hero.addEventListener('pointermove', function (e) {
            var r = canvas.getBoundingClientRect();
            pointer.x = e.clientX - r.left;
            pointer.y = e.clientY - r.top;
        }, { passive: true });

        hero.addEventListener('pointerleave', function () {
            pointer.x = -9999;
            pointer.y = -9999;
        });

        // Don't burn frames on an off-screen or backgrounded canvas.
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                onScreen = entries[0].isIntersecting;
                if (onScreen && !document.hidden) start(); else stop();
            }, { threshold: 0 }).observe(hero);
        }

        document.addEventListener('visibilitychange', function () {
            if (document.hidden || !onScreen) stop(); else start();
        });

        var resizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                resize();
                if (reduceMotion.matches) draw(false);
            }, 150);
        }, { passive: true });

        document.addEventListener('themechange', readAccent);
    }

    /* ---------- Email + copy to clipboard ------------------ */
    function initEmail() {
        // Split so the plain address never appears as one string in source.
        var address = ['aalnowaiserr', 'gmail.com'].join('@');

        $$('[data-email-link]').forEach(function (link) {
            link.href = 'mailto:' + address;
        });

        var label = $('#email-text');
        if (label) label.textContent = address;

        var btn = $('#copy-email');
        if (!btn) return;

        btn.addEventListener('click', function () {
            copy(address).then(function () {
                toast('Email address copied');
            }).catch(function () {
                toast('Press Ctrl+C to copy: ' + address);
            });
        });
    }

    function copy(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        }
        // file:// and plain http have no async clipboard — fall back.
        return new Promise(function (resolve, reject) {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.className = 'copy-shim';
            document.body.appendChild(ta);
            ta.select();
            var ok = false;
            try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
            document.body.removeChild(ta);
            ok ? resolve() : reject(new Error('copy failed'));
        });
    }

    var toastTimer;
    function toast(message) {
        var el = $('#toast');
        if (!el) return;
        el.textContent = message;
        el.classList.add('is-visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { el.classList.remove('is-visible'); }, 2600);
    }

    /* ---------- Misc --------------------------------------- */
    function initYear() {
        var el = $('#year');
        if (el) el.textContent = String(new Date().getFullYear());
    }

    /* ---------- Boot --------------------------------------- */
    document.addEventListener('DOMContentLoaded', function () {
        initTheme();
        initHeader();
        initNav();
        initMobileMenu();
        initTabs();
        initDisclosures();
        initReveal();
        initCounters();
        initSpotlight();
        initTerminal();
        initConstellation();
        initEmail();
        initYear();
    });
})();
