/* Right-panel adapter for KaTeX auto-render. */
(function () {
    window.InfinitePanelsAdapters = window.InfinitePanelsAdapters || {};
    window.InfinitePanelsAdapters.katex = {
        init(container) {
            if (typeof window.renderMathInElement !== 'function') return;
            try {
                window.renderMathInElement(container, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '$', right: '$', display: false}
                    ],
                    throwOnError: false
                });
            } catch (err) {
                console.error('infinitepanels: renderMathInElement failed', err);
            }
        }
    };
})();
