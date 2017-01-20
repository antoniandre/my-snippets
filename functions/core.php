<?php
//===================================== VARS =====================================//
define('SNIPPETS_JSON', ROOT_DIR . 'snippets.json');
define('SNIPPETS_DIR',  ROOT_DIR . 'snippets/');
define('TEMPLATES_DIR',  ROOT_DIR . 'templates/');

include ROOT_DIR . 'classes/tpl.php';
//================================================================================//


//=================================== FUNCTIONS ==================================//
function checkPost($var)
{
    return isset($_POST[$var]);
}


function getFromPost($var, $default = null)
{
    return isset($_POST[$var]) && $_POST[$var] ? $_POST[$var] : $default;
}


function getFromGet($var, $default = null)
{
    return isset($_GET[$var]) && $_GET[$var] ? $_GET[$var] : $default;
}


function getSnippets()
{
    $data = is_file(SNIPPETS_JSON) ? json_decode(file_get_contents(SNIPPETS_JSON)) : null;

    return $data ? $data : createSnippetsJson();
}


function getSnippet($name)
{
    $data = is_file("$name.json") ? json_decode(file_get_contents("$name.json")) : null;

    return $data;
}


function createSnippetsJson()
{
    $jsons = glob(SNIPPETS_DIR . '*.json');

    foreach ($jsons as $json)
    {
        $snippetTmp = json_decode(file_get_contents($json));
        $jsonName = basename($json, '.json');

        $snippet = new StdClass();
        $snippet->name = $snippetTmp->name;
        if (isset($snippetTmp->url)) $snippet->url = $snippetTmp->url;
        if (isset($snippetTmp->icon)) $snippet->icon = $snippetTmp->icon;

        $snippets[$jsonName] = $snippet;
    }

    file_put_contents(SNIPPETS_JSON, json_encode($snippets));
    return $snippets;
}


function createSnippetJson($name, $h1)
{
    $snippet = new StdClass();
    $snippet->name         = $name;
    $snippet->h1           = $h1;
    $snippet->icon         = 'i-star';
    $snippet->dependencies = new StdClass();
    $snippet->languages    = new StdClass();

    file_put_contents("$name.json", json_encode($snippet));

    createSnippetsJson();// Update snippets list.

    return $snippet;
}
//================================================================================//
?>