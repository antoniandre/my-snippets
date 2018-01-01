<?php
//===================================== VARS =====================================//
$knownJs =
[
    'jquery'        => 'bower_components/jquery/dist/jquery.min.js',
    'jquery.easing' => 'bower_components/jquery.easing/js/jquery.easing.min.js',
];
$iconSet = ['i-heart', 'i-cocktail', 'i-book', 'i-edit', 'i-sync', 'i-home', 'i-grid', 'i-coffee',
            'i-chef', 'i-gear', 'i-link', 'i-comment', 'i-wand', 'i-pin', 'i-arr-r', 'i-arr-d', 'i-arr-u',
            'i-arr-l', 'i-arr-ur', 'i-check', 'i-cross', 'i-cross-o', 'i-plane', 'i-asterisk', 'i-star',
            'i-pointer', 'i-settings2', 'i-user', 'i-arr-resize', 'i-wand2', 'i-plus', 'i-terminal',
            'i-code', 'i-trash', 'i-arr-dr', 'i-search', 'i-tools', 'i-hammer', 'i-wrench', 'i-images',
            'i-keypad', 'i-sync2', 'i-pulse', 'i-github', 'i-bulb', 'i-cross-o-filled', 'i-pencil'];
//================================================================================//


//===================================== MAIN =====================================//
$snippetName = strtolower(ROUTE_PARTS[1]);
$snippet     = ($h1 = getFromPost('newSnippet', null)) ? createSnippetJson($snippetName, $h1) : getSnippet($snippetName);

if (checkPost('codes') && isAjax()) edit();
if ($snippet) render($snippet);
else die("No existing snippet. :)");

//================================================================================//


//=================================== FUNCTIONS ==================================//
function render($snippet)
{
    global $knownJs, $iconSet, $self;

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
        $lang = str_replace(['<', '>'], ['&lt;', '&gt;'], $id === 'html' ? htmlentities($language->code) : $language->code);

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
        $html   = '';

        if (isset($snippet->languages->html->code) || isset($snippet->languages->xml->code))
        {
            $html = isset($snippet->languages->xml->code) ? $snippet->languages->xml->code : $snippet->languages->html->code;
            $html = "<div class='content'>\n        $html\n    </div>";
        }
    }

    $checked = !$html ? ' checked' : '';

    $vars = [
        'SELF'        => $self,
        'ROOT_URL'    => ROOT_URL,
        'h1'          => $snippet->h1,
        'snippetName' => $snippet->name,
        'iconSet'     => $iconSet,
        'snippetIcon' => $snippet->icon,
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

function edit()
{
    global $snippet;

    // get the posted snippet edited codes.
    $codes = json_decode(getFromPost('codes'));

    $snippet->languages = new stdClass();// Reinit languages.
    // Reinject the posted code in the current snippet json.
    foreach ($codes as $code)
    {
        $snippet->languages->{$code->language}        = new stdClass();
        $snippet->languages->{$code->language}->code  = $code->code;
        $snippet->languages->{$code->language}->label = $code->label;
    }

    saveSnippetJson($snippet, ROUTE_PARTS[1]);
    die;
}
//================================================================================//
?>