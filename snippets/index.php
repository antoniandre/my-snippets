<?php
//=======================================================================================================//
define('ROOT', dirname($_SERVER['PHP_SELF']) . '/..');
$snippet = get('snippet');
$knownJs = [
    'jquery'        => 'bower_components/jquery/dist/jquery.min.js',
    'jquery.easing' => 'bower_components/jquery.easing/js/jquery.easing.min.js',
];
//=======================================================================================================//


//=======================================================================================================//
if ($snippet)
{
    render($snippet);
}
//=======================================================================================================//


//=======================================================================================================//
function get($var, $default = null)
{
    return isset($_GET[$var]) && $_GET[$var] ? $_GET[$var] : $default;
}


function render($snippet)
{
    global $knownJs;

    $snippet = json_decode(file_get_contents("$snippet.json"));
    $scripts = '';
    $styles  = '';
    $root = ROOT;
    $languages = '';
    $activeTab = null;

    foreach ((array)$snippet->dependencies as $type => $array)
    {
        foreach ($array as $resource)
        {
            if ($type === 'css') $styles .= ($styles ? "\n        " : '') . "<link rel='stylesheet' href='$resource'>";
            if ($type === 'js')
            {
                if (array_key_exists($resource, $knownJs)) $resource = ROOT . "/{$knownJs[$resource]}";

                $scripts .= ($scripts ? "\n        " : '') . "<script src='$resource'></script>";
            }
        }
    }

    foreach ((array)$snippet->languages as $id => $language)
    {
        if (isset($language->active) && $language->active) {$activeTab = $id;break;}
    }
    foreach ((array)$snippet->languages as $id => $language)
    {
        $lang = $id === 'html' ? htmlentities($language->code) : $language->code;

        $active     = $id === $activeTab || (!$activeTab && !$languages) ? " data-active" : '';
        $languages .= ($languages ? "\n                    " : '')
                    . "<pre class='i-code' contenteditable='true' data-type='$id'$active>$lang</pre>";
    }

    $script = isset($snippet->languages->js->code) ? "<script>\n        {$snippet->languages->js->code}\n    </script>" : '';
    $style  = isset($snippet->languages->css->code) ? "<style>\n        {$snippet->languages->css->code}\n    </style>" : '';
    $html   = isset($snippet->languages->html->code) ? "<div class='content'>\n        {$snippet->languages->html->code}\n    </div>" : '';

    $checked = !$html ? ' checked' : '';

    echo <<<HTML
<html id="snippet">
    <head>
        <title>$snippet->name</title>
        $styles
        $style
        <link rel="stylesheet" type="text/css" href="$root/css/main.css">
        <link href="https://file.myfontastic.com/3HQaS5Npxv3BKokeRYZ2T3/icons.css" rel="stylesheet">
        <script src="$root/bower_components/jquery/dist/jquery.min.js"></script>
        $scripts
        <script src="$root/js/main.js"></script>
        $script
    </head>
    <body>
HTML;
    include('../templates/top-bar.php');
    echo <<<HTML
        <div id="all">
            <h1>$snippet->h1</h1>
            <input type="checkbox" class="toggle" id="see-the-code"$checked>
            <label for="see-the-code" class="i-plus">Check the code</label>
            <div class="code-section">
                <div class="code-wrapper" style="height: 400px;">
                    $languages
                </div>
            </div>
            $html
            <div id="caretPos"></div>
        </div>
        <div class="center"><a href="../../" class="i-arr-l back"> Go back home</a></div>
    </body>
</html>
HTML;
}
//=======================================================================================================//
?>