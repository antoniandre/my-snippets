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
echo includeTpl('snippets-list', $vars);
//=================================== FUNCTIONS ==================================//
//================================================================================//
?><!-- <html>
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
<body class="snippets-list">
    <?php includeTpl('top-bar', ['ROOT_URL' => ROOT_URL]); ?>
    <h1>This is my snippets.</h1>
    <form action="<?php echo $self ?>" method="post">
        <p class="intro">
            This is where I store all my started projects and usefull snippets :)<br>
            <button type="submit" name="refresh" class="i-sync"> Refresh</button>
        </p>
    </form>

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
                <input type="checkbox" id="showForm" class="toggle">
                <label for="showForm" class="i-arr-dr" target="_blank"><i class="i-plus"></i> New Snippet</label>
                <div class="new-snippet">
                    <label for="showForm"><i class="i-cross"></i></label>
                    <form action="<?php echo ROOT . '/snippet/new' ?>" method="post">
                        <input type="text" placeholder="Choose a nice snippet name" name="newSnippet" required>
                        <button type="submit">ok</button>
                    </form>
                </div>
            </div>
        </div>
    </div>
</body>
</html> -->
