<?php

global $ID;

$meta = p_get_metadata($ID);
?>

<div class="topBannerEmpty"> </div>
<div class="topBanner">
    <div><?php echo hsc($ID) ?></div>
    <div>
        <?php
        if (!empty($meta['date']['created'])) {
            echo 'p: ' . date('y-m-d', $meta['date']['created']);
        }

        echo ' // ';

        if (!empty($meta['date']['modified'])) {
            echo 'u: ' . date('y-m-d', $meta['date']['modified']);
        }
        ?>
    </div>
</div>
