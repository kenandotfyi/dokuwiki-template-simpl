<?php
global $conf;
global $lang;

if (!defined('DOKU_INC')) die();
?>

<div class="page-breadcrumbs">

<!-- BREADCRUMBS -->
   <?php if ($conf['breadcrumbs'] || $conf['youarehere']) : ?>
       <div class="breadcrumbs">
           <?php if ($conf['youarehere']) : ?>
               <div class="youarehere"><?php tpl_youarehere() ?></div>
           <?php endif ?>
           <?php if ($conf['breadcrumbs']) : ?>
               <div class="trace">
                   <?php
                   $crumbs = breadcrumbs();
                   $lastCrumb = count($crumbs);
                   $crumbIndex = 0;

                   echo '<span class="bchead">' . $lang['breadcrumb'] . '</span>';
                   foreach ($crumbs as $id => $name) {
                       $crumbIndex++;
                       echo ' <span class="bcsep">•</span> ';

                       if ($crumbIndex === $lastCrumb) echo '<span class="curid">';
                       // Trace IDs are absolute wiki IDs. The leading colon
                       // prevents tpl_pagelink() resolving them relative to
                       // the current page's namespace.
                       echo tpl_pagelink(':' . ltrim($id, ':'), $name, true);
                       if ($crumbIndex === $lastCrumb) echo '</span>';
                   }
                   ?>
               </div>
           <?php endif ?>
       </div>
   <?php endif ?>

</div>
