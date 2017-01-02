<?php
define('ROOT', dirname($_SERVER['PHP_SELF']) . '/..');
$snippet = get('snippet');
$knownJs = [
    'jquery'        => 'bower_components/jquery/dist/jquery.min.js',
    'jquery.easing' => 'bower_components/jquery.easing/js/jquery.easing.min.js',
];

if ($snippet)
{
    render($snippet);
}


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
    $htmlCode = htmlentities($snippet->html);

    foreach ((array)$snippet->dependencies as $type => $array)
    {
        foreach ($array as $resource)
        {
            if ($type === 'css') $styles .= ($styles ? "\n\t\t" : '') . "<link rel='stylesheet' href='$resource'>";
            if ($type === 'js')
            {
                if (array_key_exists($resource, $knownJs)) $resource = ROOT . "/{$knownJs[$resource]}";

                $scripts .= ($scripts ? "\n\t\t" : '') . "<script src='$resource'></script>";
            }
        }
    }

    echo <<<HTML
    <html id="snippet">
    <head>
        <title>$snippet->name</title>
        $styles
        <style>
            $snippet->css
        </style>
        <link rel="stylesheet" type="text/css" href="$root/css/main.css">
        <link href="https://file.myfontastic.com/3HQaS5Npxv3BKokeRYZ2T3/icons.css" rel="stylesheet">
        $scripts
        <script src="$root/js/main.js"></script>
        <script>
            $snippet->js
        </script>
    </head>
    <body>
        <div id="all">
            <h1>$snippet->h1</h1>
            <input type="checkbox" class="toggle" id="see-the-code">
            <label for="see-the-code" class="i-plus">Check the code</label>
            <div class="code-section">
                <div class="code-wrapper" style="height: 500px;">
                    <pre class="i-code" data-type="javascript">$snippet->js</pre>
                    <pre class="i-code" data-type="css">$snippet->css</pre>
                    <pre class="i-code" data-type="html">$htmlCode</pre>
                </div>
            </div>
            <div class="content">$snippet->html</div>
        </div>
        <a href="../../" class="i-arr-l"> Go back home</a>
    </body>
    </html>
HTML;
}
?>