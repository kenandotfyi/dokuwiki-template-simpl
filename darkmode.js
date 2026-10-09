(function () {
    const storageKey = 'simpl-theme';

    function preferredTheme() {
        try {
            const savedTheme = localStorage.getItem(storageKey);
            if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
        } catch (error) {
            // Storage can be unavailable in restricted browser contexts.
        }

        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
    }

    function applyTheme(theme) {
        document.documentElement.dataset.theme = theme;
    }

    applyTheme(preferredTheme());

    document.addEventListener('click', function (event) {
        const button = event.target.closest('.cmdp-theme-toggle');
        if (!button) return;

        const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        try {
            localStorage.setItem(storageKey, nextTheme);
        } catch (error) {
            // The selected theme remains active for this page even without storage.
        }
    });
})();
