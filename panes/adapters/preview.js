/* Right-panel adapter for the Preview plugin. */
(function () {
    window.InfinitePanelsAdapters = window.InfinitePanelsAdapters || {};
    function initPreviewForPanel(container) {
    if (typeof JSINFO === 'undefined' || !JSINFO.plugin || !JSINFO.plugin.preview) return;

    const previewBox = document.querySelector('.plugin-preview');
    if (!previewBox) return; // preview plugin not active on this install

    let abortController = null;

    function hidePreview() {
        previewBox.style.display = 'none';
        if (abortController) abortController.abort();
        abortController = null;
    }

    async function loadPreview(id) {
        try {
            if (abortController) abortController.abort();
            abortController = new AbortController();
            const data = await fetch(
                DOKU_BASE + 'lib/exe/ajax.php?call=plugin_preview&id=' + encodeURIComponent(id),
                { signal: abortController.signal, method: 'POST' }
            );
            if (data.ok) {
                previewBox.innerHTML = await data.text();
                previewBox.style.display = 'block';
            }
        } catch (ignored) {
            // matches the plugin's own error handling - ignore
        }
    }

    container.querySelectorAll('a.wikilink1').forEach((link) => {
        link.addEventListener('mouseenter', (e) => {
            previewBox.style.top = e.pageY + 10 + 'px';
            previewBox.style.left = e.pageX + 10 + 'px';
            loadPreview(link.dataset.wikiId);
        });
        link.addEventListener('mouseleave', hidePreview);
        link.addEventListener('click', hidePreview);
        link.removeAttribute('title');
    });
}
    window.InfinitePanelsAdapters.preview = { init: initPreviewForPanel };
})();
