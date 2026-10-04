<?php

/**
 * DokuWiki Default Template 2012
 *
 * @link     http://dokuwiki.org/template
 * @author   Anika Henke <anika@selfthinker.org>
 * @author   Clarence Lee <clarencedglee@gmail.com>
 * @license  GPL 2 (http://www.gnu.org/licenses/gpl.html)
 */

if (!defined('DOKU_INC')) die(); /* must be run from within DokuWiki */

$hasSidebar = page_findnearest($conf['sidebar']);
$showSidebar = $hasSidebar && ($ACT == 'show');
?><!DOCTYPE html>
<html lang="<?php echo $conf['lang'] ?>" dir="<?php echo $lang['direction'] ?>" class="no-js">
<head>
    <meta charset="utf-8" />
    <title><?php tpl_pagetitle() ?> [<?php echo strip_tags($conf['title']) ?>]</title>
    <?php tpl_metaheaders() ?>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <?php echo tpl_favicon(['favicon', 'mobile']) ?>
    <?php tpl_includeFile('meta.html') ?>
</head>

<body>
    <div id="dokuwiki__site"><div id="dokuwiki__top" class="site <?php echo tpl_classes(); ?> <?php
        echo ($showSidebar) ? 'showSidebar' : ''; ?> <?php echo ($hasSidebar) ? 'hasSidebar' : ''; ?> <?php
        echo ($ACT === 'show' && $ID === $conf['start']) ? 'panelnav-start-page' : ''; ?>"
        data-panelnav-start-id="<?php echo hsc($conf['start']); ?>">

        <?php include(__DIR__ . '/tpl_header.php') ?>


        <div class="wrapper group">

          <?php if ($showSidebar) : ?>
           <!-- ********** ASIDE ********** -->
                <nav id="dokuwiki__aside" aria-label="<?php echo $lang['sidebar']
                ?>"><div class="pad aside include group">

                    <h3 class="toggle"><?php echo $lang['sidebar'] ?></h3>
                    <div class="content"><div class="group">
                        <?php tpl_flush() ?>

                        <?php tpl_includeFile('sidebarheader.html') ?>
                        <?php tpl_include_page($conf['sidebar'], true, true) ?>
                        <?php tpl_includeFile('sidebarfooter.html') ?>
                    </div></div>
                </div></nav><!-- /aside -->
            <?php endif; ?>


            <!-- ********** CONTENT ********** -->
            <main id="dokuwiki__content"><div class="pad group">
                <?php html_msgarea() ?>

                <?php
                // Only use the two-panel layout on real content pages -
                // not search results, and not the wiki's start/home page.
                $isPanelPage = ($ACT === 'show') && ($ID !== $conf['start']);
                ?>

                <?php if ($isPanelPage) : ?>
                <div class="panelnav-wrapper">

                    <!-- LEFT PANEL: the page actually being viewed -->
                    <div id="panelnav-left" class="panelnav-panel">
                        <?php tpl_includeFile('pageheader.php') ?>
                        <?php tpl_includeFile('pagebreadcrumbs.php') ?>
                        <div class="page group">
                            <?php tpl_flush() ?>

                            <!-- wikipage start -->
                            <?php tpl_content() ?>
                            <!-- wikipage stop -->

                            <?php tpl_includeFile('pagefooter.html') ?>
                        </div>

                        <?php include(__DIR__ . '/pagengspace.php'); ?>

                        <div class="page-backlinks-header">Backlinks</div>
                        <div class="page-backlinks">
                            <?php
                            global $ID;
                            $renderInfo = [];
                            echo p_render('xhtml', p_get_instructions('{{backlinks>.}}'), $renderInfo);
                            ?>
                        </div>
                    </div>

                    <!-- RIGHT PANEL: filled by panelnav's JS when a link is clicked -->
                    <div id="panelnav-right" class="panelnav-panel panelnav-hidden">
                        <div id="panelnav-right-content"></div>
                    </div>

                </div>
                <?php else : ?>

                <!-- Normal single-column layout: search results, start page, etc. -->
                <?php tpl_includeFile('pageheader.php') ?>
                <?php tpl_includeFile('pagebreadcrumbs.php') ?>
                <div class="page group">
                    <?php tpl_flush() ?>

                    <!-- wikipage start -->
                    <?php tpl_content() ?>
                    <!-- wikipage stop -->

                    <?php tpl_includeFile('pagefooter.html') ?>
                </div>

                <?php if ($ACT === 'show') : ?>
                <?php include(__DIR__ . '/pagengspace.php'); ?>

                <div class="page-backlinks-header">Backlinks</div>
                <div class="page-backlinks">
                    <?php
                    global $ID;
                    $renderInfo = [];
                    echo p_render('xhtml', p_get_instructions('{{backlinks>.}}'), $renderInfo);
                    ?>
                </div>
                <?php endif; ?>

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
