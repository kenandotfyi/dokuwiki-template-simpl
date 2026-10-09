<?php

global $ID;

$meta = p_get_metadata($ID);
?>

<div class="pagedates">
    <?php
    if (!empty($meta['date']['created'])) {
        echo 'created: ' . date('y-m-d', $meta['date']['created']);
    }

    echo ' // ';

    if (!empty($meta['date']['modified'])) {
        echo 'updated: ' . date('y-m-d', $meta['date']['modified']);
    }
    ?>
</div>
