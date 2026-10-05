/* Right-panel adapter for the PrettyPhoto plugin. */
(function () {
    window.InfinitePanelsAdapters = window.InfinitePanelsAdapters || {};
    /**
 * PrettyPhoto initializes links once on document ready. Reapply its normal
 * media-link setup and click binding to content inserted into infinitepanels.
 */
function initPrettyPhotoForPanel(container) {
    const $ = window.jQuery;
    const prettyPhotoConfig = window.JSINFO && window.JSINFO.plugin_prettyphoto;
    if (!$ || !$.fn.prettyPhoto || !prettyPhotoConfig) return;

    const mediaPath = window.PRETTYPHOTO_PLUGIN_MEDIAPATH || prettyPhotoConfig.mediapath;
    if (!mediaPath) return;

    const $container = $(container);
    const $mediaLinks = $container.find('a[class=media][href]')
        .add($container.filter('a[class=media][href]'));

    $mediaLinks.each(function() {
        const $link = $(this);
        if (!$link.find('img').length) return;
        if ($link.attr('href').indexOf(mediaPath) !== -1) {
            $link.attr('rel', 'prettyPhoto[gallery]');
        }
    });

    const $prettyPhotoLinks = $container.find("a[rel^='prettyPhoto']")
        .add($container.filter("a[rel^='prettyPhoto']"));
    $prettyPhotoLinks.prettyPhoto(window.PRETTYPHOTO_PLUGIN_PARAMS || {});
}
    window.InfinitePanelsAdapters.prettyphoto = { init: initPrettyPhotoForPanel };
})();
