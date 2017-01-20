<?php
//===================================== VARS =====================================//
define('SELF', $_SERVER['PHP_SELF']);
define('ROOT_DIR', realpath(__DIR__ ) . '/');
define('ROOT_URL', dirname(SELF) . '/');
//================================================================================//


//===================================== MAIN =====================================//
include ROOT_DIR . '/functions/core.php';
$snippets = checkPost('refresh') ? createSnippetsJson() : getSnippets();
//================================================================================//



$vars = [
    'ROOT_URL' => ROOT_URL,
    'SELF' => SELF,
    'snippets' => $snippets,
    'defaultUrl' => ROOT_URL . 'snippet/yo',
    'defaultIcon' => 'i-arr-star',
];
echo Tpl::include('snippets-list', $vars);
//=================================== FUNCTIONS ==================================//
//================================================================================//
?>