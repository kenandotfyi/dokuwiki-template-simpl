/* Right-panel adapter for the Preview plugin. */
(function () {
    window.InfinitePanelsAdapters = window.InfinitePanelsAdapters || {};

    function getPreviewBox() {
        if (typeof JSINFO === 'undefined' || !JSINFO.plugin || !JSINFO.plugin.preview) return null;
        return document.querySelector('.plugin-preview');
    }

    function positionAboveNearBottom(link, previewBox) {
        if (!link?.isConnected || !link.matches(':hover') || previewBox.style.display === 'none') return;

        const linkRect = link.getBoundingClientRect();
        if (linkRect.bottom <= window.innerHeight * 0.8) return;

        const scrollY = window.scrollY || window.pageYOffset;
        const top = Math.max(scrollY + 8, scrollY + linkRect.top - previewBox.offsetHeight - 10) + 'px';
        if (previewBox.style.top !== top) previewBox.style.top = top;
    }

    function initMainPage(container) {
        const previewBox = getPreviewBox();
        if (!previewBox || container.dataset.previewMainPositioning) return;
        container.dataset.previewMainPositioning = 'true';

        let hoveredLink = null;
        let positionFrame = 0;
        const schedulePosition = () => {
            if (positionFrame) cancelAnimationFrame(positionFrame);
            positionFrame = requestAnimationFrame(() => {
                positionFrame = 0;
                positionAboveNearBottom(hoveredLink, previewBox);
            });
        };

        container.addEventListener('pointerover', (event) => {
            const target = event.target instanceof Element ? event.target : event.target.parentElement;
            const link = target?.closest('a.wikilink1');
            if (!link || !container.contains(link)) return;
            hoveredLink = link;
            schedulePosition();
        }, true);

        const observer = new MutationObserver(schedulePosition);
        observer.observe(previewBox, {
            attributes: true,
            attributeFilter: ['style'],
            childList: true,
            subtree: true
        });
    }

    function initPreviewForPanel(container) {
        const previewBox = getPreviewBox();
        if (!previewBox) return;

        let abortController = null;

        function hidePreview() {
            previewBox.style.display = 'none';
            if (abortController) abortController.abort();
            abortController = null;
        }

        function positionPreview(link, event) {
            const linkRect = link.getBoundingClientRect();
            const scrollY = window.scrollY || window.pageYOffset;
            const nearViewportBottom = linkRect.bottom > window.innerHeight * 0.8;
            const top = nearViewportBottom
                ? scrollY + linkRect.top - previewBox.offsetHeight - 10
                : event.pageY + 10;

            previewBox.style.top = Math.max(scrollY + 8, top) + 'px';
            previewBox.style.left = event.pageX + 10 + 'px';
        }

        async function loadPreview(id, link, event) {
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
                    positionPreview(link, event);
                }
            } catch (ignored) {
                // matches the plugin's own error handling - ignore
            }
        }

        container.querySelectorAll('a.wikilink1').forEach((link) => {
            link.addEventListener('mouseenter', (event) => {
                loadPreview(link.dataset.wikiId, link, event);
            });
            link.addEventListener('mouseleave', hidePreview);
            link.addEventListener('click', hidePreview);
            link.removeAttribute('title');
        });
    }

    window.InfinitePanelsAdapters.preview = {
        init: initPreviewForPanel,
        initMainPage
    };
})();
