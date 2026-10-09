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
       </div>
   <?php endif ?>

</div>
