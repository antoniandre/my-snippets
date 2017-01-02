<?php
$self = $_SERVER['PHP_SELF'];
define('SNIPPETS_JSON', __DIR__ . '/snippets.json');
define('SNIPPETS_DIR', __DIR__ . '/snippets/');

$snippets = getSnippets();



function getSnippets()
{
    return is_file(SNIPPETS_JSON) ? json_decode(file_get_contents(SNIPPETS_JSON)) : createSnippetsJson();
}


function createSnippetsJson()
{
    $jsons = glob(SNIPPETS_DIR . '*.json');

    foreach ($jsons as $json)
    {
        $snippetTmp  = json_decode(file_get_contents($json));
        $jsonName = basename($json, '.json');

        $snippet  = new StdClass();
        $snippet->name = $snippetTmp->name;
        if (isset($snippetTmp->url)) $snippet->url = $snippetTmp->url;
        if (isset($snippetTmp->icon)) $snippet->icon = $snippetTmp->icon;

        $snippets[$jsonName] = $snippet;
    }

    file_put_contents(SNIPPETS_JSON, json_encode($snippets));
    return $snippets;
}
?><html>
<head>
    <title>My snippets</title>
    <link rel="stylesheet" type="text/css" href="css/main.css">
    <link rel="stylesheet" type="text/css" href="../grid/css/grid.css">
    <link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet">
    <link href="https://file.myfontastic.com/3HQaS5Npxv3BKokeRYZ2T3/icons.css" rel="stylesheet">
    <script src="bower_components/jquery/dist/jquery.min.js"></script>
    <script src="bower_components/jquery.easing/js/jquery.easing.min.js"></script>
    <script src="../grid/js/grid.js"></script>
    <script src="js/main.js"></script>
</head>
<body>
    <div class="topbar-wrapper">
        <div class="topbar clearfix">
            <div class="topbar-inner">
                <div class="topbar-logo i-chef"><a href="$self">My snippets</a></div>
                <div class="topbar-menu">
                    <ul>
                        <li><a href="index.html" class="i-home"><span>home</span></a></li>
                        <li>
                            <span class="i-examples"><span>Examples &nbsp; <i class="i-arr-d"></i></span></span>
                            <ul class="topbar-submenu">
                                <li><a href="examples/basic.html" class="i-arr-l">Basic</a></li>
                            </ul>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
    <h1>This is my snippets.</h1>
    <p class="intro">This is where I store all my started projects and usefull snippets :)</p>

    <div class="thegrid">
        <div class="loading"></div>
        <?php
            foreach ($snippets as $jsonName => $snippet)
            {
                $url       = isset($snippet->url) ? $snippet->url : "snippet/$jsonName/";
                $linkClass = isset($snippet->url) ? 'i-arr-ur' : 'i-arr-dr';
                $target    = isset($snippet->url) ? ' target="_blank"' : '';
                $icon      = isset($snippet->icon) ? $snippet->icon : 'i-star';

                echo <<<HTML
        <div class="cell" data-width="1" data-height="1">
            <div>
                <a href="$url" class="$linkClass"$target><i class="$icon"></i> $snippet->name</a>
            </div>
        </div>
HTML;
            }
        ?>
        <div class="cell" data-width="1" data-height="1">
            <div>
                <a href="http://" class="i-arr-dr" target="_blank"><i class="i-plus"></i> New Snippet</a>
            </div>
        </div>
    </div>
</body>
</html>
