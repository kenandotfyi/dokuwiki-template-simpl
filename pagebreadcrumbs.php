<?php
global $conf;

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
               <div class="trace"><?php tpl_breadcrumbs() ?></div>
           <?php endif ?>
       </div>
   <?php endif ?>

</div>
