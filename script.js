/**
 *  We handle several device classes based on browser width.
 *
 *  - desktop:   > __tablet_width__ (as set in style.ini)
 *  - mobile:
 *    - tablet   <= __tablet_width__
 *    - phone    <= __phone_width__
 */
var device_class = ''; // not yet known
var device_classes = 'desktop mobile tablet phone';

function tpl_dokuwiki_mobile(){

    // the z-index in mobile.css is (mis-)used purely for detecting the screen mode here
    var screen_mode = jQuery('#screen__mode').css('z-index') + '';

    // determine our device pattern
    // TODO: consider moving into dokuwiki core
    switch (screen_mode) {
        case '1':
            if (device_class.match(/tablet/)) return;
            device_class = 'mobile tablet';
            break;
        case '2':
            if (device_class.match(/phone/)) return;
            device_class = 'mobile phone';
            break;
        default:
            if (device_class == 'desktop') return;
            device_class = 'desktop';
    }

    jQuery('html').removeClass(device_classes).addClass(device_class);

    // handle some layout changes based on change in device
    var $handle = jQuery('#dokuwiki__aside h3.toggle');
    var $toc = jQuery('#dw__toc h3');

    if (device_class == 'desktop') {
        // reset for desktop mode
        if($handle.length) {
            $handle[0].setState(1);
            $handle.hide();
        }
        if($toc.length) {
            $toc[0].setState(1);
        }
    }
    if (device_class.match(/mobile/)){
        // toc and sidebar hiding
        if($handle.length) {
            $handle.show();
            $handle[0].setState(-1);
        }
        if($toc.length) {
            $toc[0].setState(-1);
        }
    }
}

jQuery(function(){
    var resizeTimer;
    dw_page.makeToggle('#dokuwiki__aside h3.toggle','#dokuwiki__aside div.content');

    tpl_dokuwiki_mobile();
    jQuery(window).on('resize',
        function(){
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(tpl_dokuwiki_mobile,200);
        }
    );

    // increase sidebar length to match content (desktop mode only)
    var sidebar_height = jQuery('.desktop #dokuwiki__aside').height();
    var pagetool_height = jQuery('.desktop #dokuwiki__pagetools ul:first').height();
    // pagetools div has no height; ul has a height
    var content_min = Math.max(sidebar_height || 0, pagetool_height || 0);

    var content_height = jQuery('#dokuwiki__content div.page').height();
    if(content_min && content_min > content_height) {
        var $content = jQuery('#dokuwiki__content div.page');
        $content.css('min-height', content_min);
    }

    // blur when clicked
    jQuery('#dokuwiki__pagetools div.tools>ul>li>a').on('click', function(){
        this.blur();
    });
});

// Start MoaiEditor automatically when the normal DokuWiki edit action opens.
// MoaiEditor creates its own start button asynchronously once it has found
// the template's editor elements, so wait for that button and invoke it.
(function startMoaiEditorOnEditPage() {
    if (typeof JSINFO === 'undefined' || JSINFO.ACT !== 'edit') return;

    const startButton = document.getElementById('moaied-start-button');
    if (startButton) {
        startButton.click();
        return;
    }

    const observer = new MutationObserver(() => {
        const button = document.getElementById('moaied-start-button');
        if (!button) return;
        observer.disconnect();
        button.click();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
})();


// MoaiEditor renders its preview HTML after the initial page-load pass that
// the KaTeX plugin performs. Re-render when the preview content changes.
(function renderKatexInMoaiPreview() {
    if (typeof JSINFO === 'undefined' || JSINFO.ACT !== 'edit') return;

    const katex = JSINFO.plugins && JSINFO.plugins.katex && JSINFO.plugins.katex.options;
    if (!katex) return;

    const options = {
        output: katex.output,
        delimiters: katex.delimiters,
        throwOnError: katex.throwonerror,
        errorColor: katex['error-color'],
        macros: katex.macros
    };

    let lastPreviewText = null;

    function renderPreviewWhenChanged() {
        const preview = document.getElementById('moaied__preview_content');
        if (!preview || typeof renderMathInElement !== 'function') return;

        const text = preview.textContent;
        if (text === lastPreviewText) return;
        lastPreviewText = text;

        // Avoid repeatedly parsing content when the preview has no TeX.
        if (!text.includes('$') && !text.includes('\\(') && !text.includes('\\[')) return;

        try {
            renderMathInElement(preview, options);
        } catch (error) {
            lastPreviewText = null;
            console.error('simpl: KaTeX rendering in the Moai preview failed', error);
        }
    }

    // The preview may be created or replaced asynchronously by MoaiEditor.
    // Polling the text signature catches initial content and later updates.
    renderPreviewWhenChanged();
    window.setInterval(renderPreviewWhenChanged, 500);
})();


(function () {
    let lastText = '';

    function checkPreviews() {
        if (typeof renderMathInElement !== 'function') {
            return;
        }

        document.querySelectorAll('.plugin-preview').forEach(function (preview) {
            if (preview.style.display === 'none') {
                return;
            }

            const text = preview.textContent;

            if (text === lastText) {
                return;
            }

            lastText = text;

            renderMathInElement(preview, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false }
                ],
                throwOnError: false
            });
        });
    }

    setInterval(checkPreviews, 10);
})();
