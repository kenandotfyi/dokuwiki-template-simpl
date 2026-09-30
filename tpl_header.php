<?php

/**
 * Template header, included in the main and detail files
 */

// must be run from within DokuWiki
if (!defined('DOKU_INC')) die();
?>

<!-- ********** HEADER ********** -->
<header id="dokuwiki__header"><div class="pad group">

    <?php tpl_includeFile('header.html') ?>

    <!-- Making the toolbar area simpl  -->
    <div class="simpl-toolbar">

        <?php if ($conf['useacl'] && !empty($_SERVER['REMOTE_USER'])) : ?>
            <ul>
                <li class="logo"><?php
                // get logo either out of the template images folder or data/media folder
                    $logoSize = [];
                    $logo = tpl_getMediaFile([
                        ':wiki:logo.svg', ':logo.svg',
                        ':wiki:logo.png', ':logo.png',
                        'images/logo.svg', 'images/logo.png'
                    ], false, $logoSize);
                // display wiki title in a link to the home page
                tpl_link(
                    wl(),
                    '<img src="' . $logo . '" ' . ($logoSize ? $logoSize[3] : '') . ' alt="" />' .
                    '<span>' . $conf['title'] . '</span>',
                    'accesskey="h" title="' . tpl_getLang('home') . ' [h]"'
                );
                ?></li>
                <?php echo (new \dokuwiki\Menu\UserMenu())->getListItems('action '); ?>
                <?php echo (new \dokuwiki\Menu\SiteMenu())->getListItems('action ', false); ?>
            </ul>
        <?php endif ?>
    </div>



</div></header><!-- /header -->
