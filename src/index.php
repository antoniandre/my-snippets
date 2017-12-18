<?php
//===================================== VARS =====================================//
define('SELF', $_SERVER['PHP_SELF']);
define('ROOT_DIR', realpath(__DIR__) . '/');
define('ROOT_URL', trim(dirname(SELF), '/') . '/');
// The current root-relative url that was asked before landing on this script.
define('ROUTE', trim(ROOT_URL !== '/' ? str_replace(ROOT_URL, '', $_SERVER['REQUEST_URI']) : $_SERVER['REQUEST_URI'], '/'));
define('ROUTE_PARTS', explode('/', ROUTE));
//================================================================================//


//===================================== MAIN =====================================//
include ROOT_DIR . '/functions/core.php';

// ROUTER.
switch (true)
{
    case (ROUTE_PARTS[0] === 'snippet'):
        include ROOT_DIR . '/snippet-view.php';
        break;

    default:
        $snippets = checkPost('refresh') ? createSnippetsJson() : getSnippets();
        $vars = [
            'ROOT_URL'    => ROOT_URL,
            'SELF'        => SELF,
            'snippets'    => $snippets,
            'defaultUrl'  => ROOT_URL . 'snippet/yo',
            'defaultIcon' => 'i-arr-star',
        ];
        echo Tpl::inc('snippets-list', $vars);
        break;
}
exit;
//================================================================================//
?>