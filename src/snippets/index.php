<?php
//===================================== VARS =====================================//
$self = $_SERVER['PHP_SELF'];
define('ROOT_DIR', realpath(__DIR__ . '/../') . '/');
define('ROOT_URL', dirname($self) . '/../');

$knownJs =
[
    'jquery'        => 'bower_components/jquery/dist/jquery.min.js',
    'jquery.easing' => 'bower_components/jquery.easing/js/jquery.easing.min.js',
];
//================================================================================//


//===================================== MAIN =====================================//
include ROOT_DIR . 'functions/core.php';
$snippetName = getFromGet('snippet');
$snippet     = ($h1 = getFromPost('newSnippet', null)) ? createSnippetJson($snippetName, $h1) : getSnippet($snippetName);

if ($snippet) render($snippet);
else "No existing snippet :)";
//================================================================================//


//=================================== FUNCTIONS ==================================//
function render($snippet)
{
    global $knownJs, $self;

    $script    = '';
    $scripts   = '';
    $style     = '';
    $styles    = '';
    $html      = '';
    $rootUrl   = ROOT_URL;
    $languages = '';
    $activeTab = null;
    $compile   = isset($snippet->compile) && $snippet->compile;


    foreach ((array)$snippet->languages as $id => $language)
    {
        if (isset($language->active) && $language->active) {$activeTab = $id;break;}
    }
    foreach ((array)$snippet->languages as $id => $language)
    {
        $lang = $id === 'html' ? htmlentities($language->code) : $language->code;

        $active     = $id === $activeTab || (!$activeTab && !$languages) ? " data-active" : '';
        $dataLabel  = isset($language->label) ? " data-label='$language->label'" : '';
        $languages .= ($languages ? "\n                    " : '')
                    . "<pre class='i-code' contenteditable='true' data-type='$id'$dataLabel$active>$lang</pre>";
    }


    if ($compile)
    {
        foreach ((array)$snippet->dependencies as $type => $array)
        {
            foreach ($array as $resource)
            {
                if ($type === 'css') $styles .= ($styles ? "\n        " : '') . "<link rel='stylesheet' href='$resource'>";
                if ($type === 'js')
                {
                    if (array_key_exists($resource, $knownJs)) $resource = ROOT_URL . "{$knownJs[$resource]}";

                    $scripts .= ($scripts ? "\n        " : '') . "<script src='$resource'></script>";
                }
            }
        }

        $script = isset($snippet->languages->js->code) ? "<script>\n        {$snippet->languages->js->code}\n    </script>" : '';
        $style  = isset($snippet->languages->css->code) ? "<style>\n        {$snippet->languages->css->code}\n    </style>" : '';
        $html   = isset($snippet->languages->html->code) ? "<div class='content'>\n        {$snippet->languages->html->code}\n    </div>" : '';
    }

    $checked = !$html ? ' checked' : '';

    $vars = [
        'SELF'        => $self,
        'ROOT_URL'    => ROOT_URL,
        'h1'          => $snippet->h1,
        'snippetName' => $snippet->name,
        'scripts'     => $scripts,
        'script'      => $script,
        'styles'      => $styles,
        'style'       => $style,
        'html'        => $html,
        'checked'     => $checked,
        'languages'   => $languages,
        'checkCode'   => $html ? 'Check the code' : ($languages ? 'Edit the code' : 'Write some code'),
    ];
    echo Tpl::inc('snippet', $vars);
}
//================================================================================//
?>