/* Runs synchronously in <head> so the correct theme is painted on the first frame
   (a deferred script would flash the default theme first). */

/* ---------- Frame-busting -----------------------------------------------
   A stand-in for `frame-ancestors 'none'` / `X-Frame-Options: DENY`, neither of
   which can be set here: GitHub Pages serves no custom response headers, and
   frame-ancestors is ignored when it appears in a <meta> CSP.

   Be clear about what this is worth. Script-based frame-busting is strictly
   weaker than the header:
     - an attacker can serve the page inside a `sandbox`ed iframe, which blocks
       the top-level navigation below and defeats the bust-out;
     - it does nothing if the visitor has JavaScript disabled.
   So we also hide the document as a fallback, which a sandbox cannot prevent.

   For a static portfolio the real exposure is someone framing the site to
   pass it off as their own, not classic clickjacking — there is no login and
   no state-changing action here to hijack a click on. This closes the cheap
   version of that. The header remains the only complete fix, and it needs a
   host or proxy that can send headers. */
(function () {
    if (window.self === window.top) return;
    try {
        window.top.location = window.self.location;
    } catch (e) {
        /* Sandboxed: navigation refused. Hide the content rather than let it be
           displayed inside someone else's page. */
        document.documentElement.style.display = 'none';
    }
})();

(function () {
    var root = document.documentElement;
    var theme = 'dark';
    try {
        var stored = localStorage.getItem('theme');
        if (stored === 'light' || stored === 'dark') {
            theme = stored;
        } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            theme = 'light';
        }
    } catch (e) { /* private mode: fall back to dark */ }

    root.dataset.theme = theme;
    root.style.colorScheme = theme;
})();
