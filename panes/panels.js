function executeInfinitePanelsScripts(container) {
    // Scripts inserted via innerHTML do not execute automatically.
    container.querySelectorAll('script').forEach((oldScript) => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach((attr) => newScript.setAttribute(attr.name, attr.value));
        newScript.textContent = oldScript.textContent;
        oldScript.replaceWith(newScript);
    });
}

function infinitePanelsIdFromUrl(url) {
    const targetUrl = new URL(url, window.location.href);
    const queryPageId = targetUrl.searchParams.get('id');
    if (queryPageId) return queryPageId;
    const baseUrl = new URL(DOKU_BASE, window.location.origin);
    let pagePath = targetUrl.pathname;
    if (pagePath.startsWith(baseUrl.pathname)) pagePath = pagePath.slice(baseUrl.pathname.length);
    return decodeURIComponent(pagePath.replace(/^\/+|\/+$/g, ''));
}

function infinitePanelsUrlFromId(id) {
    const baseUrl = new URL(DOKU_BASE, window.location.origin);
    const basePath = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
    const pagePath = encodeURIComponent(id).replace(/%3A/gi, ':');
    return new URL(`${basePath}${pagePath}`, baseUrl.origin).href;
}

document.addEventListener('DOMContentLoaded', () => {
    const content = document.getElementById('dokuwiki__content');
    const pageContext = document.querySelector('#dokuwiki__top.mode_show') || document.body;
    if (!content || !pageContext.classList.contains('mode_show')) return;

    // Keep the plugin template-agnostic: wrap the normal DokuWiki content
    // column instead of requiring panel markup in a particular template.
    const pageContent = content.querySelector(':scope > .pad.group') || content.firstElementChild;
    if (!pageContent) return;

    const currentPageId = window.JSINFO?.id || window.InfinitePanelsConfig?.pageId || '';
    const startPageId = window.InfinitePanelsConfig?.startPageId || '';

    let wrapper = null;
    let viewport = null;
    let panes = null;
    let rootPane = null;
    let zoomBackdrop = null;
    let zoomPane = null;
    let zoomPlaceholder = null;
    let zoomTrigger = null;
    let zoomTemporaryPane = false;
    let editBackdrop = null;
    let editPane = null;
    let editTrigger = null;
    let editDirty = false;
    const paneElements = [];
    let desktopIndependentScroll = false;
    let navigationVersion = 0;

    function createPanelLayout() {
        if (wrapper) return;

        wrapper = document.createElement('div');
        wrapper.className = 'infinitepanels-wrapper';
        viewport = document.createElement('div');
        viewport.className = 'infinitepanels-viewport';
        panes = document.createElement('div');
        panes.className = 'infinitepanels-panes';
        viewport.appendChild(panes);
        wrapper.appendChild(viewport);
        content.insertBefore(wrapper, pageContent);

        // Pane bodies scroll vertically on their own, so horizontal wheel
        // gestures over their content do not naturally reach the viewport.
        // Forward those gestures to the shared pane scroller.
        viewport.addEventListener('wheel', (event) => {
            if (!window.matchMedia('(min-width: 1200px)').matches) return;

            let delta = event.deltaX;
            if (!delta && event.shiftKey) delta = event.deltaY;
            if (!delta) return;

            const multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE
                ? 16
                : (event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? viewport.clientWidth : 1);
            delta *= multiplier;

            const target = event.target instanceof Element ? event.target : event.target.parentElement;
            let nestedScroller = target;
            while (nestedScroller && nestedScroller !== viewport) {
                const style = window.getComputedStyle(nestedScroller);
                const canScrollHorizontally = nestedScroller.scrollWidth > nestedScroller.clientWidth
                    && /(auto|scroll)/.test(style.overflowX);
                const canConsumeDelta = delta < 0
                    ? nestedScroller.scrollLeft > 0
                    : nestedScroller.scrollLeft + nestedScroller.clientWidth < nestedScroller.scrollWidth;
                if (canScrollHorizontally && canConsumeDelta) return;
                nestedScroller = nestedScroller.parentElement;
            }

            const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth;
            const nextScrollLeft = Math.max(0, Math.min(maxScrollLeft, viewport.scrollLeft + delta));
            if (nextScrollLeft !== viewport.scrollLeft) {
                event.preventDefault();
                viewport.scrollLeft = nextScrollLeft;
            }
        }, { passive: false });

        rootPane = document.createElement('section');
        rootPane.className = 'infinitepanels-pane infinitepanels-pane-root';
        rootPane.dataset.pageId = currentPageId;
        rootPane.appendChild(pageContent);
        panes.appendChild(rootPane);
        paneElements.push(rootPane);
        addPaneControls(rootPane, currentPageId, document, true);
        refreshOpenPageLinks();
    }

    function removePanelLayout() {
        if (!wrapper) return;
        viewport.scrollLeft = 0;
        rootPane?.querySelectorAll('.infinitepanels-open, .infinitepanels-close, .infinitepanels-zoom').forEach((button) => button.remove());
        content.insertBefore(pageContent, wrapper);
        wrapper.remove();
        wrapper = null;
        viewport = null;
        panes = null;
        rootPane = null;
        paneElements.length = 0;
    }

    function updatePaneHeight() {
        const header = document.getElementById('dokuwiki__header');
        const headerBottom = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
        const availableHeight = Math.max(240, window.innerHeight - headerBottom);
        document.documentElement.style.setProperty('--infinitepanels-viewport-height', `${availableHeight}px`);
    }

    function pageIdForUrl(url) {
        return infinitePanelsIdFromUrl(url);
    }

    function normalizePageId(pageId) {
        if (!pageId) return '';
        try {
            return decodeURIComponent(pageId);
        } catch (_error) {
            return pageId;
        }
    }

    function pageIdForLink(anchor) {
        return normalizePageId(anchor.dataset.wikiId || pageIdForUrl(anchor.href));
    }

    function findOpenPageIndex(pageId) {
        const normalizedId = normalizePageId(pageId);
        if (!normalizedId) return -1;
        if (!wrapper) return normalizedId === normalizePageId(currentPageId) ? 0 : -1;
        return paneElements.findIndex((pane) => normalizePageId(pane.dataset.pageId) === normalizedId);
    }

    function focusOpenPage(index, url) {
        const pane = wrapper ? paneElements[index] : pageContent;
        if (!pane) return;
        if (wrapper && viewport) {
            viewport.scrollTo({ left: pane.offsetLeft, behavior: 'smooth' });
        }

        const hash = new URL(url, window.location.href).hash;
        if (!hash) return;
        let anchorId = hash.slice(1);
        try {
            anchorId = decodeURIComponent(anchorId);
        } catch (_error) {
            // Keep the encoded fragment if it is malformed.
        }
        const target = Array.from(pane.querySelectorAll('[id]')).find((element) => element.id === anchorId);
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function refreshOpenPageLinks() {
        const openPageIds = new Set((wrapper
            ? paneElements.map((pane) => pane.dataset.pageId)
            : [currentPageId]
        ).map(normalizePageId).filter(Boolean));

        content.querySelectorAll('a.wikilink1, a.wikilink2').forEach((anchor) => {
            const targetPageId = pageIdForLink(anchor);
            anchor.classList.toggle('infinitepanels-open-page-link', openPageIds.has(targetPageId));
        });
    }

    function saveUrlState() {
        const ids = paneElements.slice(1).map((pane) => pane.dataset.pageId).filter(Boolean);
        const url = new URL(window.location.href);
        url.searchParams.delete('p');
        ids.forEach((id) => url.searchParams.append('p', id));

        // URLSearchParams escapes namespace separators. Keep DokuWiki's
        // readable colon notation in pane values while preserving all other
        // query parameter encoding.
        const query = url.searchParams.toString().replace(/(^|&)p=([^&]*)/g, (_match, prefix, value) => {
            return `${prefix}p=${value.replace(/%3A/gi, ':')}`;
        });
        const readableUrl = `${url.origin}${url.pathname}${query ? `?${query}` : ''}${url.hash}`;
        if (readableUrl !== window.location.href) {
            window.history.pushState(window.history.state, '', readableUrl);
        }
    }

    function activatePanelMode() {
        if (paneElements.length < 2) return;
        const wasActive = document.body.classList.contains('infinitepanels-active');
        const desktop = window.matchMedia('(min-width: 1200px)').matches;
        const root = paneElements[0];
        const scrollOffset = !wasActive && desktop ? Math.max(0, -root.getBoundingClientRect().top) : 0;
        updatePaneHeight();
        document.body.classList.add('infinitepanels-active');
        if (!wasActive && desktop) {
            root.scrollTop = scrollOffset;
            window.scrollTo(0, 0);
            desktopIndependentScroll = true;
        }
    }

    function deactivatePanelMode() {
        if (paneElements.length > 1 || !wrapper) return;
        if (zoomBackdrop) closeZoomPane(false);
        const root = paneElements[0];
        const documentScroll = desktopIndependentScroll
            ? window.scrollY + root.getBoundingClientRect().top + root.scrollTop
            : null;
        document.body.classList.remove('infinitepanels-active');
        if (documentScroll !== null) {
            window.scrollTo(0, Math.max(0, documentScroll));
            desktopIndependentScroll = false;
        }
        removePanelLayout();
    }

    function setZoomButtonState(pane, isZoomed) {
        const button = pane?.querySelector('.infinitepanels-zoom');
        if (!button) return;
        const label = isZoomed ? 'Restore pane size' : 'Zoom pane';
        button.title = label;
        button.setAttribute('aria-label', label);
        button.setAttribute('aria-pressed', String(isZoomed));
        const icon = button.querySelector('svg');
        if (icon) {
            icon.innerHTML = isZoomed
                ? '<path d="M8 3v5H3M16 3v5h5M3 16h5v5M21 16h-5v5"></path>'
                : '<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"></path>';
        }
    }

    function closeZoomPane(restoreFocus = true) {
        if (!zoomBackdrop) return;
        const pane = zoomPane;
        if (pane && zoomTemporaryPane) {
            window.InfinitePanelsAdapters?.annotations?.destroy(pane);
            pane.remove();
        } else if (pane && zoomPlaceholder?.isConnected) {
            zoomPlaceholder.before(pane);
        }
        zoomPlaceholder?.remove();
        zoomBackdrop.remove();
        document.body.classList.remove('infinitepanels-zoom-active');
        setZoomButtonState(pane, false);
        const trigger = zoomTrigger;
        zoomBackdrop = null;
        zoomPane = null;
        zoomPlaceholder = null;
        zoomTrigger = null;
        zoomTemporaryPane = false;
        if (restoreFocus && trigger?.isConnected) trigger.focus({ preventScroll: true });
    }

    function toggleZoomPane(pane, trigger, temporary = false) {
        if (zoomPane === pane) {
            closeZoomPane();
            return;
        }
        if (zoomBackdrop) closeZoomPane(false);

        if (!temporary) {
            zoomPlaceholder = document.createElement('div');
            zoomPlaceholder.className = 'infinitepanels-pane-placeholder';
            pane.before(zoomPlaceholder);
        }

        zoomBackdrop = document.createElement('div');
        zoomBackdrop.className = 'infinitepanels-zoom-backdrop';
        zoomBackdrop.setAttribute('role', 'dialog');
        zoomBackdrop.setAttribute('aria-modal', 'true');
        zoomBackdrop.setAttribute('aria-label', `Zoomed wiki page ${pane.dataset.pageId || ''}`);
        zoomBackdrop.addEventListener('click', (event) => {
            if (event.target === zoomBackdrop) closeZoomPane();
        });
        zoomPane = pane;
        zoomTrigger = trigger;
        zoomTemporaryPane = temporary;
        content.appendChild(zoomBackdrop);
        zoomBackdrop.appendChild(pane);
        document.body.classList.add('infinitepanels-zoom-active');
        setZoomButtonState(pane, true);
    }

    function closeNativeEdit(refreshPane = false) {
        if (!editBackdrop) return true;
        if (!refreshPane && editDirty && !window.confirm('Close the editor and discard unsaved changes?')) {
            return false;
        }
        const pane = editPane;
        const trigger = editTrigger;
        editBackdrop.remove();
        editBackdrop = null;
        editPane = null;
        editTrigger = null;
        editDirty = false;
        if (refreshPane && pane?.isConnected) {
            if (pane.classList.contains('infinitepanels-pane')) {
                const pageId = pane.dataset.pageId;
                const pageUrl = pane.dataset.pageUrl || infinitePanelsUrlFromId(pageId);
                loadPane(pane, pageUrl, pageId, navigationVersion).catch((error) => {
                    console.error('infinitepanels: failed to refresh edited page', error);
                });
            } else {
                window.location.reload();
            }
        }
        if (!refreshPane && trigger?.isConnected) trigger.focus({ preventScroll: true });
        return true;
    }

    function openNativeEdit(pane, pageId, trigger) {
        if (!closeNativeEdit(false)) return;
        editDirty = false;

        const backdrop = document.createElement('div');
        backdrop.className = 'infinitepanels-edit-backdrop';
        backdrop.setAttribute('role', 'dialog');
        backdrop.setAttribute('aria-modal', 'true');
        backdrop.setAttribute('aria-label', `Edit wiki page ${pageId}`);
        backdrop.addEventListener('click', (event) => {
            if (event.target === backdrop) closeNativeEdit(false);
        });

        const windowElement = document.createElement('div');
        windowElement.className = 'infinitepanels-edit-window';
        const toolbar = document.createElement('div');
        toolbar.className = 'infinitepanels-edit-toolbar';
        const title = document.createElement('span');
        title.textContent = `Edit ${pageId}`;
        const toolbarActions = document.createElement('div');
        toolbarActions.className = 'infinitepanels-edit-toolbar-actions';
        const nativeEditLink = document.createElement('a');
        nativeEditLink.className = 'infinitepanels-edit-toolbar-action infinitepanels-edit-new-tab';
        nativeEditLink.title = 'Open native editor in a new tab';
        nativeEditLink.setAttribute('aria-label', nativeEditLink.title);
        nativeEditLink.target = '_blank';
        nativeEditLink.rel = 'noopener';
        const nativeEditUrl = new URL(DOKU_BASE + 'doku.php', window.location.origin);
        nativeEditUrl.searchParams.set('do', 'edit');
        nativeEditUrl.searchParams.set('id', pageId);
        nativeEditLink.href = nativeEditUrl.href;
        nativeEditLink.appendChild(createPaneIcon(
            '<path d="M14 3h7v7"></path><path d="M21 3 10 14"></path><path d="M19 13v7H4V5h7"></path>'
        ));
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'infinitepanels-edit-toolbar-action infinitepanels-edit-close';
        closeButton.title = 'Close editor';
        closeButton.setAttribute('aria-label', 'Close editor');
        closeButton.appendChild(createPaneIcon('<path d="m18 6-12 12M6 6l12 12"></path>'));
        closeButton.addEventListener('click', () => closeNativeEdit(false));
        toolbarActions.append(nativeEditLink, closeButton);
        toolbar.append(title, toolbarActions);

        const frame = document.createElement('iframe');
        frame.className = 'infinitepanels-edit-frame';
        frame.title = `DokuWiki editor for ${pageId}`;
        frame.addEventListener('load', () => {
            if (editBackdrop !== backdrop) return;

            try {
                const frameWindow = frame.contentWindow;
                const frameDocument = frame.contentDocument;
                if (!frameWindow || !frameDocument) return;

                if (frameDocument.querySelector('#dokuwiki__top.mode_show')) {
                    closeNativeEdit(true);
                    return;
                }

                const editForm = frameDocument.querySelector('#dw__editform');
                if (editForm && !editForm.dataset.infinitePanelsDirtyTracking) {
                    editForm.dataset.infinitePanelsDirtyTracking = 'true';
                    const markDirty = () => { editDirty = true; };
                    editForm.addEventListener('input', markDirty);
                    editForm.addEventListener('change', markDirty);
                }

                // Keep the normal DokuWiki editor but use the popup's width
                // instead of Simpl's usual narrow page column.
                if (!frameDocument.getElementById('infinitepanels-editor-layout')) {
                    const style = frameDocument.createElement('style');
                    style.id = 'infinitepanels-editor-layout';
                    style.textContent = `
                        #dokuwiki__site { width: 100% !important; max-width: none !important; margin: 0 !important; }
                        #dokuwiki__header, #dokuwiki__pagetools { display: none !important; }
                        #dokuwiki__site > #dokuwiki__top > .wrapper { display: block !important; margin: 0 !important; }
                        #dokuwiki__content { float: none !important; width: 100% !important; max-width: none !important; margin: 0 !important; }
                        #dokuwiki__content > .pad.group { box-sizing: border-box !important; width: 100% !important; max-width: none !important; padding: 1rem !important; }
                        #dokuwiki__content .page.group { width: 100% !important; max-width: none !important; }
                    `;
                    frameDocument.head.appendChild(style);
                }
            } catch (error) {
                // The editor stays usable if the browser blocks frame access.
                console.warn('infinitepanels: could not adjust editor popup layout', error);
            }
        });

        const editUrl = new URL(DOKU_BASE + 'doku.php', window.location.origin);
        editUrl.searchParams.set('do', 'edit');
        editUrl.searchParams.set('id', pageId);
        editUrl.searchParams.set('simpl_moai_popup', '1');
        frame.src = editUrl.href;

        windowElement.append(toolbar, frame);
        backdrop.appendChild(windowElement);
        document.body.appendChild(backdrop);
        editBackdrop = backdrop;
        editPane = pane;
        editTrigger = trigger;
    }

    function addPaneControls(pane, pageId, parsedDocument, includePaneActions = true) {
        const topBanner = pane.querySelector('.topBanner');
        let actions = pane.querySelector('.infinitepanels-actions');
        if (!actions) {
            actions = document.createElement('div');
            actions.className = 'infinitepanels-actions';
        }

        const pageTools = parsedDocument.querySelector('#dokuwiki__pagetools');
        const pageUrl = pane.dataset.pageUrl || window.location.href;
        const paneToolLinks = [
            {
                name: 'edit',
                label: 'Edit page',
                selector: '.action.edit a, a[href*="do=edit"]',
                icon: '<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"></path>'
            },
            {
                name: 'revisions',
                label: 'Old revisions',
                selector: 'a[href*="do=revisions"]',
                icon: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>'
            },
            {
                name: 'rename',
                label: 'Rename page',
                selector: '.plugin_move_page a, a.plugin_move_page, a[href*="do=plugin_move"]',
                icon: '<path d="m3 20 6-16h2l6 16M5.5 13h9"></path><path d="M21 7v10m-1.5-10h3m-3 10h3"></path>'
            }
        ];

        paneToolLinks.forEach((tool) => {
            if (actions.querySelector(`.infinitepanels-tool-${tool.name}`)) return;
            const sourceLink = pageTools?.querySelector(tool.selector);
            const sourceHref = sourceLink?.getAttribute('href');
            if (!sourceLink || (!sourceHref && tool.name !== 'rename')) return;

            const link = document.createElement('a');
            link.className = `infinitepanels-tool infinitepanels-tool-${tool.name}`;
            link.href = tool.name === 'rename'
                ? pageUrl
                : (tool.name === 'edit'
                    ? `${DOKU_BASE}doku.php?do=edit&id=${encodeURIComponent(pageId)}`
                    : new URL(sourceHref, pageUrl).href);
            link.title = tool.label;
            link.setAttribute('aria-label', tool.label);

            if (tool.name === 'edit') {
                link.addEventListener('click', (event) => {
                    event.preventDefault();
                    openNativeEdit(pane, pageId, link);
                });
            }

            if (tool.name === 'rename') {
                link.addEventListener('click', (event) => {
                    event.preventDefault();
                    const moveButton = document.querySelector('#dokuwiki__pagetools .plugin_move_page');
                    if (!moveButton || !window.JSINFO) {
                        window.location.href = pageUrl;
                        return;
                    }

                    const previousId = window.JSINFO.id;
                    const previousRenamePermission = window.JSINFO.move_renameokay;
                    window.JSINFO.id = pageId;
                    window.JSINFO.move_renameokay = true;
                    let dialog = null;
                    let dialogObserver;
                    const restorePageContext = () => {
                        dialogObserver?.disconnect();
                        window.JSINFO.id = previousId;
                        window.JSINFO.move_renameokay = previousRenamePermission;
                    };
                    const findDialog = () => {
                        dialog = document.querySelector('.plugin_move_dialog');
                        if (!dialog) return false;
                        clearTimeout(dialogTimeout);
                        return true;
                    };

                    dialogObserver = new MutationObserver(() => {
                        if (!dialog && !findDialog()) return;
                        if (dialog && (!dialog.isConnected || window.getComputedStyle(dialog).display === 'none')) {
                            restorePageContext();
                        }
                    });
                    dialogObserver.observe(document.body, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        attributeFilter: ['style', 'class', 'aria-hidden']
                    });

                    const dialogTimeout = setTimeout(() => {
                        if (!findDialog()) restorePageContext();
                    }, 2000);
                    moveButton.click();
                    findDialog();
                });
            }

            link.appendChild(createPaneIcon(tool.icon));
            actions.appendChild(link);
        });

        if (includePaneActions && !actions.querySelector('.infinitepanels-open')) {
            const openButton = document.createElement('button');
            openButton.type = 'button';
            openButton.className = 'infinitepanels-open';
            openButton.title = 'Open page by itself';
            openButton.setAttribute('aria-label', 'Open page by itself');
            openButton.appendChild(createPaneIcon(
                '<path d="M14 3h7v7"></path><path d="M21 3 10 14"></path><path d="M19 13v7H4V5h7"></path>'
            ));
            actions.appendChild(openButton);
        }

        if (includePaneActions && !actions.querySelector('.infinitepanels-zoom')) {
            const zoomButton = document.createElement('button');
            zoomButton.type = 'button';
            zoomButton.className = 'infinitepanels-zoom';
            zoomButton.title = 'Zoom pane';
            zoomButton.setAttribute('aria-label', 'Zoom pane');
            zoomButton.setAttribute('aria-pressed', 'false');
            zoomButton.appendChild(createPaneIcon(
                '<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"></path>'
            ));
            actions.appendChild(zoomButton);
        }

        if (includePaneActions
            && !pane.classList.contains('infinitepanels-pane-root')
            && !actions.querySelector('.infinitepanels-close')) {
            const closeButton = document.createElement('button');
            closeButton.type = 'button';
            closeButton.className = 'infinitepanels-close';
            closeButton.title = 'Close this pane';
            closeButton.setAttribute('aria-label', 'Close this pane');
            closeButton.appendChild(createPaneIcon(
                '<path d="m18 6-12 12M6 6l12 12"></path>'
            ));
            actions.appendChild(closeButton);
        }

        if (topBanner) {
            let rightSide = topBanner.querySelector(':scope > .infinitepanels-header-right');
            if (!rightSide) {
                const bannerDetails = topBanner.children[1];
                rightSide = document.createElement('div');
                rightSide.className = 'infinitepanels-header-right';
                if (bannerDetails) rightSide.appendChild(bannerDetails);
                topBanner.appendChild(rightSide);
            }
            if (!actions.parentElement) rightSide.appendChild(actions);
        } else {
            let toolbar = pane.querySelector('.infinitepanels-pane-toolbar');
            if (!toolbar) {
                toolbar = document.createElement('div');
                toolbar.className = 'infinitepanels-pane-toolbar';
                const title = document.createElement('span');
                title.className = 'infinitepanels-pane-title';
                title.textContent = pageId;
                toolbar.appendChild(title);
                pane.prepend(toolbar);
            }
            if (!actions.parentElement) toolbar.appendChild(actions);
        }
        pane.dataset.pageId = pageId;
    }

    function createPaneIcon(paths) {
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.setAttribute('aria-hidden', 'true');
        icon.setAttribute('focusable', 'false');
        icon.innerHTML = paths;
        return icon;
    }

    function updatePaneIndexes() {
        paneElements.forEach((pane, index) => {
            pane.dataset.paneIndex = String(index + 1);
            pane.setAttribute('aria-label', `Wiki page ${pane.dataset.pageId || ''}, pane ${index + 1}`);
        });
    }

    function initializeAdapters(pane, pageId, parsedDocument) {
        if (pageId && window.InfinitePanelsAdapters?.annotations) {
            window.InfinitePanelsAdapters.annotations.init(pageId, pane, parsedDocument);
        }
        executeInfinitePanelsScripts(pane);
        window.InfinitePanelsAdapters?.preview?.init(pane);
        window.InfinitePanelsAdapters?.prettyphoto?.init(pane);
        window.InfinitePanelsAdapters?.katex?.init(pane);
    }

    async function loadPane(pane, url, pageId, expectedVersion) {
        const requestUrl = new URL(url, window.location.href);
        requestUrl.searchParams.delete('p');
        const response = await fetch(requestUrl.href, { credentials: 'same-origin' });
        if (!response.ok) throw new Error(`Page request failed (${response.status})`);
        const html = await response.text();
        if (expectedVersion !== navigationVersion || !pane.isConnected) return false;
        const parsedDocument = new DOMParser().parseFromString(html, 'text/html');
        const canonicalLink = parsedDocument.querySelector('link[rel="canonical"]');
        const canonicalUrl = canonicalLink ? new URL(canonicalLink.href, requestUrl) : null;
        pane.dataset.pageUrl = canonicalUrl?.origin === window.location.origin
            ? canonicalUrl.href
            : infinitePanelsUrlFromId(pageId);
        const sourceContent = parsedDocument.querySelector('#dokuwiki__content > .pad.group')
            || parsedDocument.querySelector('#dokuwiki__content .pad.group')
            || parsedDocument.querySelector('#dokuwiki__content');
        if (!sourceContent) throw new Error('Could not find the rendered page content');

        const clonedContent = sourceContent.cloneNode(true);
        pane.replaceChildren(clonedContent);
        pane.dataset.pageId = pageId;
        addPaneControls(pane, pageId, parsedDocument);
        initializeAdapters(pane, pageId, parsedDocument);
        refreshOpenPageLinks();
        return true;
    }

    async function openPaneAfter(parentIndex, url, pageId = null, persistUrl = true, expectedVersion = navigationVersion) {
        const resolvedPageId = pageId || pageIdForUrl(url);
        if (!resolvedPageId) return;
        const existingPageIndex = findOpenPageIndex(resolvedPageId);
        if (existingPageIndex >= 0) {
            focusOpenPage(existingPageIndex, url);
            return;
        }
        createPanelLayout();

        // Open or update the slot immediately after parentIndex. Callers pass
        // the last pane when they want to append; panes farther right stay put.
        const targetIndex = parentIndex + 1;
        let pane = paneElements[targetIndex];
        if (pane) {
            window.InfinitePanelsAdapters?.annotations?.destroy(pane);
        } else {
            pane = document.createElement('section');
            pane.className = 'infinitepanels-pane infinitepanels-pane-secondary';
            pane.dataset.pageId = resolvedPageId;
            panes.appendChild(pane);
            paneElements.push(pane);
        }
        pane.dataset.pageId = resolvedPageId;
        updatePaneIndexes();
        refreshOpenPageLinks();
        activatePanelMode();
        viewport.scrollTo({ left: pane.offsetLeft, behavior: 'smooth' });
        pane.scrollTop = 0;

        try {
            const loaded = await loadPane(pane, url, resolvedPageId, expectedVersion);
            if (loaded && persistUrl && expectedVersion === navigationVersion) saveUrlState();
        } catch (error) {
            if (expectedVersion !== navigationVersion || !pane.isConnected) return;
            pane.innerHTML = '<p class="infinitepanels-error">Could not load this page.</p>';
            console.error('infinitepanels: failed to load page', error);
        }
    }

    async function openTagCloudPopup(anchor) {
        const pageId = pageIdForLink(anchor);
        if (!pageId) return;

        const pane = document.createElement('section');
        pane.className = 'infinitepanels-pane infinitepanels-pane-secondary infinitepanels-popup-pane';
        pane.dataset.pageId = pageId;
        pane.innerHTML = '<p class="infinitepanels-loading">Loading…</p>';
        const expectedVersion = ++navigationVersion;
        toggleZoomPane(pane, anchor, true);

        try {
            const loaded = await loadPane(pane, anchor.href, pageId, expectedVersion);
            if (loaded && zoomPane === pane) setZoomButtonState(pane, true);
        } catch (error) {
            if (!pane.isConnected) return;
            pane.innerHTML = '<p class="infinitepanels-error">Could not load this page.</p>';
            console.error('infinitepanels: failed to load tag page popup', error);
        }
    }

    function closeAfter(index, persistUrl = true) {
        if (zoomPane && paneElements.indexOf(zoomPane) > index) closeZoomPane(false);
        while (paneElements.length > index + 1) {
            const removed = paneElements.pop();
            window.InfinitePanelsAdapters?.annotations?.destroy(removed);
            removed.remove();
        }
        updatePaneIndexes();
        if (paneElements.length === 1) deactivatePanelMode();
        refreshOpenPageLinks();
        if (persistUrl) saveUrlState();
    }

    function closePane(index, persistUrl = true) {
        if (index <= 0 || index >= paneElements.length) return;
        const [removed] = paneElements.splice(index, 1);
        window.InfinitePanelsAdapters?.annotations?.destroy(removed);
        removed.remove();
        updatePaneIndexes();
        if (paneElements.length === 1) deactivatePanelMode();
        refreshOpenPageLinks();
        if (persistUrl) saveUrlState();
    }

    function panelIdsFromUrl() {
        const seen = new Set();
        return new URL(window.location.href).searchParams.getAll('p')
            .map(normalizePageId)
            .filter((pageId) => {
                if (!pageId || pageId === normalizePageId(currentPageId) || seen.has(pageId)) return false;
                seen.add(pageId);
                return true;
            });
    }

    async function restorePanesFromUrl() {
        const expectedVersion = ++navigationVersion;
        const ids = panelIdsFromUrl();
        if (ids.length && !wrapper) createPanelLayout();
        if (!ids.length && !wrapper) return;
        let matching = 0;
        while (matching < ids.length && paneElements[matching + 1]?.dataset.pageId === ids[matching]) {
            matching++;
        }
        closeAfter(matching, false);
        for (let index = matching; index < ids.length; index++) {
            if (expectedVersion !== navigationVersion) return;
            await openPaneAfter(index, infinitePanelsUrlFromId(ids[index]), ids[index], false, expectedVersion);
        }
    }

    function isEligibleLink(anchor) {
        if (!anchor || anchor.closest('#cmdp-search-modal')) return false;
        if (!anchor.classList.contains('wikilink1') && !anchor.classList.contains('wikilink2')) return false;
        if (anchor.classList.contains('media') || anchor.classList.contains('interwiki')) return false;
        if (anchor.target === '_blank') return false;
        try {
            return new URL(anchor.href, window.location.origin).origin === window.location.origin;
        } catch (_error) {
            return false;
        }
    }

    content.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (button) {
            const pane = button.closest('.infinitepanels-pane');
            const index = paneElements.indexOf(pane);
            if (button.matches('.infinitepanels-open')) {
                if (zoomPane === pane) closeZoomPane(false);
                window.location.href = pane.dataset.pageUrl
                    || infinitePanelsUrlFromId(pane.dataset.pageId);
                return;
            }
            if (button.matches('.infinitepanels-zoom')) {
                toggleZoomPane(pane, button);
                return;
            }
            if (button.matches('.infinitepanels-close')) {
                navigationVersion++;
                if (zoomPane === pane) {
                    closeZoomPane(false);
                    return;
                }
                closePane(index);
                return;
            }
        }

        const anchor = event.target.closest('a');
        const isCloudTag = anchor?.closest('.cloud') && anchor.matches('a[class*="_tag"]');
        const isPageTag = anchor?.relList.contains('tag');
        if ((isCloudTag || isPageTag)
            && event.button === 0
            && !event.metaKey
            && !event.ctrlKey
            && !event.altKey
            && !event.shiftKey
            && !anchor.target) {
            try {
                if (new URL(anchor.href, window.location.href).origin === window.location.origin) {
                    event.preventDefault();
                    openTagCloudPopup(anchor);
                    return;
                }
            } catch (_error) {
                // Let malformed or non-web tag links follow their normal behavior.
            }
        }
        if (!anchor || !isEligibleLink(anchor)) return;
        const sourcePane = anchor.closest('.infinitepanels-pane');
        const sourceIndex = sourcePane ? paneElements.indexOf(sourcePane) : (wrapper ? -1 : 0);
        if (sourceIndex < 0) return;
        if (zoomPane === sourcePane) closeZoomPane(false);
        const targetPageId = pageIdForLink(anchor);
        const existingPageIndex = findOpenPageIndex(targetPageId);
        if (existingPageIndex >= 0) {
            event.preventDefault();
            focusOpenPage(existingPageIndex, anchor.href);
            return;
        }
        // The configured start page is the single-pane landing page. Its first
        // navigation should use DokuWiki's ordinary page link; subsequent page
        // views then use the normal pane behavior.
        if (!wrapper && currentPageId === startPageId) return;
        if (paneElements.length > 1) {
            event.preventDefault();
            const expectedVersion = ++navigationVersion;
            openPaneAfter(
                paneElements.length - 1,
                anchor.href,
                targetPageId || null,
                true,
                expectedVersion
            );
            return;
        }
        if (event.shiftKey) {
            event.preventDefault();
            window.location.href = anchor.href;
            return;
        }
        event.preventDefault();
        const expectedVersion = ++navigationVersion;
        openPaneAfter(sourceIndex, anchor.href, targetPageId || null, true, expectedVersion);
    });

    async function openInInfinitePanels(url, persistUrl = true, pageId = null) {
        const resolvedPageId = normalizePageId(pageId || pageIdForUrl(url));
        if (!resolvedPageId) return;
        if (!wrapper && resolvedPageId === normalizePageId(currentPageId)) {
            focusOpenPage(0, url);
            return;
        }
        createPanelLayout();
        const expectedVersion = persistUrl ? ++navigationVersion : navigationVersion;
        return openPaneAfter(paneElements.length - 1, url, resolvedPageId, persistUrl, expectedVersion);
    }
    window.infinitePanelsCloseAllAdditionalPanes = function () {
        if (paneElements.length < 2) return;
        navigationVersion++;
        closeAfter(0);
    };
    window.infinitepanelsOpenInRightPanel = openInInfinitePanels;
    window.infinitepanelsOpenPage = openInInfinitePanels;
    window.addEventListener('resize', updatePaneHeight, { passive: true });
    window.addEventListener('popstate', restorePanesFromUrl);
    addPaneControls(pageContent, currentPageId, document, false);
    window.InfinitePanelsAdapters?.preview?.initMainPage(pageContent);
    document.body.classList.add('infinitepanels-ready');
    refreshOpenPageLinks();
    restorePanesFromUrl();
});
