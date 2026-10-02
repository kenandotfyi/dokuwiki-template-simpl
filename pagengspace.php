<?php

/**
 * Render the nspages listing for the namespace matching the current page ID.
 * DokuWiki stores child pages in this directory. Only render the container
 * when the namespace actually contains at least one page file.
 */
if (!defined('DOKU_INC')) die();

global $ID, $conf;

$namespaceDirectory = $conf['datadir'] . '/' . utf8_encodeFN(str_replace(':', '/', $ID));
if (!is_dir($namespaceDirectory)) {
    return;
}

$hasSubpages = false;
$pageFiles = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($namespaceDirectory, FilesystemIterator::SKIP_DOTS)
);
foreach ($pageFiles as $pageFile) {
    if ($pageFile->isFile() && strtolower($pageFile->getExtension()) === 'txt') {
        $hasSubpages = true;
        break;
    }
}
if (!$hasSubpages) {
    return;
}

$syntax = '<nspages ' . $ID . ' -tree -r -exclude -h1 -textPages="">';
$renderInfo = [];
?>
<div class="page-nspages-header">Subpages</div>
<div class="page-nspages">
    <?php echo p_render('xhtml', p_get_instructions($syntax), $renderInfo); ?>
</div>
