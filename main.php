<?php

/**
 * Simpl 2026 / Derived from DokuWiki default template
 *
 * @link     https://github.com/kenandotfyi/dokuwiki-template-simpl
 * @author   Kenan Akinci
 * @license  GPL 2 (http://www.gnu.org/licenses/gpl.html)
 */

if (!defined('DOKU_INC')) die(); /* must be run from within DokuWiki */

$panesEnabled = ($ACT === 'show') && (bool) tpl_getConf('panes_enabled', 1);
$paneWidth = tpl_getConf('pane_width', 45);
if (!is_numeric($paneWidth) || (float)$paneWidth < 25 || (float)$paneWidth > 100) {
    $paneWidth = 45;
}
$paneWidth = rtrim(rtrim(number_format((float)$paneWidth, 2, '.', ''), '0'), '.');

// Only load adapters that are both supported by Simpl and enabled in its configuration.
$paneAdapters = ['preview', 'prettyphoto', 'annotations', 'katex'];
?><!DOCTYPE html>
<html lang="<?php echo $conf['lang'] ?>" dir="<?php echo $lang['direction'] ?>" class="no-js">
<head>
    <meta charset="utf-8" />
    <title><?php tpl_pagetitle() ?> [<?php echo strip_tags($conf['title']) ?>]</title>
    <?php tpl_metaheaders() ?>
    <style>:root{--infinitepanels-panel-width:<?php echo hsc($paneWidth); ?>rem;}</style>
    <link rel="stylesheet" href="<?php echo tpl_basedir(); ?>panes/panels.css" />
    <?php if ($panesEnabled) : ?>
    <script>window.InfinitePanelsConfig = <?php echo json_encode([
        'pageId' => $ID,
        'startPageId' => $conf['start'],
    ], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;</script>
    <?php foreach ($paneAdapters as $adapter) : ?>
        <?php if (tpl_getConf('adapter_' . $adapter, 0)) : ?>
    <script src="<?php echo tpl_basedir(); ?>panes/adapters/<?php echo hsc($adapter); ?>.js"></script>
        <?php endif; ?>
    <?php endforeach; ?>
    <script src="<?php echo tpl_basedir(); ?>panes/panels.js"></script>
    <?php endif; ?>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <?php echo tpl_favicon(['favicon', 'mobile']) ?>
    <?php tpl_includeFile('meta.html') ?>
</head>

<body>
    <div id="dokuwiki__site"><div id="dokuwiki__top" class="site <?php echo tpl_classes(); ?>">

        <?php include(__DIR__ . '/tpl_header.php') ?>


        <div class="wrapper group">
            <!-- ********** CONTENT ********** -->
            <main id="dokuwiki__content"><div class="pad group">
                <?php html_msgarea() ?>
                <?php tpl_includeFile('pageheader.php') ?>
                <?php tpl_includeFile('pagedates.php') ?>
                <?php tpl_includeFile('pagebreadcrumbs.php') ?>
                <div class="page group">
                    <?php tpl_flush() ?>
                    <!-- wikipage start -->
                    <?php tpl_content() ?>
                    <!-- wikipage stop -->
                </div>

                <?php if ($ACT === 'show') : ?>
                <?php include(__DIR__ . '/subpages.php'); ?>

                <div class="page-backlinks-header">Backlinks</div>
                <div class="page-backlinks">
                    <?php
                    $renderInfo = [];
                    echo p_render('xhtml', p_get_instructions('{{backlinks>.}}'), $renderInfo);
                    ?>
                </div>
                <?php endif; ?>

                <?php tpl_flush() ?>

                <hr class="a11y" />
            </div></main><!-- /content -->

            <!-- PAGE ACTIONS -->
            <nav id="dokuwiki__pagetools" aria-labelledby="dokuwiki__pagetools__heading">
                <h3 class="a11y" id="dokuwiki__pagetools__heading"><?php echo $lang['page_tools']; ?></h3>
                <div class="tools">
                    <ul>
                        <?php echo (new \dokuwiki\Menu\PageMenu())->getListItems(); ?>
                    </ul>
                </div>
            </nav>
        </div><!-- /wrapper -->

    </div></div><!-- /site -->

    <div class="no"><?php tpl_indexerWebBug() /* provide DokuWiki housekeeping, required in all templates */ ?></div>
    <div id="screen__mode" class="no"></div><?php /* helper to detect CSS media query in script.js */ ?>
</body>
</html>
