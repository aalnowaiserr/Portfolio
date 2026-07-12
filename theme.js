/* Runs synchronously in <head> so the correct theme is painted on the first frame
   (a deferred script would flash the default theme first). */
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
