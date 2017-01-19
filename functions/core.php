<?php
//===================================== VARS =====================================//
define('SNIPPETS_JSON', ROOT_DIR . 'snippets.json');
define('SNIPPETS_DIR',  ROOT_DIR . 'snippets/');
define('TEMPLATES_DIR',  ROOT_DIR . 'templates/');
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


function includeTpl($name, $vars, $tpl = null)
{
    $tpl = $tpl ? $tpl : file_get_contents(TEMPLATES_DIR . "$name.html");


    // Looks for foreach blocks in template and support nested foreach.
    // Syntax:
    // {{foreach array as key => value}}
    // ...
    // {{/foreach}}
    // Syntax 2:
    // {{foreach array as value}}
    // ...
    // {{/foreach}}
    $tpl = preg_replace_callback('~\{\{\s*foreach\s+(\w*?)\s+as\s+(?:(.*?)\s+=>\s+)*(.*?)\s*\}\}\s*(.*?)\s*\{\{\s*/foreach\s*\}\}~s', function($m) use ($vars)
    {
        list(, $array, $key, $value, $blockContent) = $m;

        $repeatedBlock = '';
        foreach ($vars[$array] as $k => $v)
        {
            $vars[$key] = $k;
            $vars[$value] = (object)$v;
            $repeatedBlock .= includeTpl('foreach', $vars, $blockContent);
        }
        return $repeatedBlock;
    }, $tpl);


    // Replace every variable name by its value.
    // Syntax: {{variable}}
    // Syntax 2 for arrays or objects: {{object->attribute}}
    // return preg_replace_callback('~\{\{\s*(?:(include)\s+)*([\w\-]*?(?:->[\w\-]+)*)\s*\}\}~s', function($m) use ($vars, $name)
    return preg_replace_callback('~\{\{\s*(.*?)\s*\}\}~s', function($m) use ($vars, $name)
    {
        list($original, $expression) = $m;
        unset($m);// So I can securely use same var in switch.
        $return = $original;

        /*switch ($task)
        {
            case 'include':
                $return = includeTpl($varname, $vars);
                break;

            case '':
                if ($name === 'foreach')
                {
                    list($object, $objAttr) = explode('->', $varname);
                    $return = $vars[$object]->$objAttr;
                }
                else $return = $vars[$varname];
                break;
        }*/
        switch (true)
        {
            // Template inclusions.
            // {{include templatename}}
            case (strpos($expression, 'include') === 0):
                if (preg_match('~include\s+([\w-.]*)~', $expression, $m)) $return = includeTpl($m[1], $vars);
                break;

            // Ternary.
            // {{var ? var1 : var2}}
            // or {{var->sub ? var1 : var2}}
            // or {{var ? 'string1' : 'string2'}}
            case (strpos($expression, '?') !== false && strpos($expression, ':') !== false):
                if (preg_match('~([\w]+(?:->[\w-.]+)*)\s*\?\s*(["\']?)([\w-]+)\2\s*:\s*(["\']?)([\w-_]+)\4~', $expression, $m))
                {
                    if (strpos($m[1], '->') !== false)
                    {
                        list($objName, $objAttr) = explode('->', $m[1], 2);
                        $cond = isset($vars[$objName]->$objAttr) ? $vars[$objName]->$objAttr : null;
                    }
                    else $cond = $vars[$m[1]];

                    $expression1 = $m[2] ? $m[3] : $vars[$m[3]];
                    $expression2 = $m[4] ? $m[5] : $vars[$m[5]];
                    $return = $cond ? $expression1 : $expression2;
                }
                break;

            // Comments.
            // Remove comments like {{* some comments *}}.
            case (strpos($original, '{{*') === 0):// No space allowed between '{{' and '*'.
                if (preg_match('~^\*.*\*$~', $expression, $m)) $return = '';
                break;

            // Variable fallbacks.
            // {{var1 || var2}}
            // or {{object->attribute || object->attribute}}
            // or {{var1 || 'string'}}
            case (strpos($expression, '||') !== false):
                if (preg_match('~([\w-.]+(?:->[\w-.]+)*)\s*\|\|\s*(["\']?)([\w-.]+(?:->[\w-.]+)*)\2~', $expression, $m))
                {
                    list(, $leftHand, $quote, $rightHand) = $m;
                    // Left hand var.
                    if (strpos($leftHand, '->') !== false)
                    {
                        list($objName, $objAttr) = explode('->', $leftHand, 2);
                        $value1 = isset($vars[$objName]->$objAttr) ? $vars[$objName]->$objAttr : null;
                    }
                    else $value1 = isset($vars[$leftHand]) ? $vars[$leftHand] : null;

                    // Right hand var.
                    if (strpos($rightHand, '->') !== false)
                    {
                        list($objName, $objAttr) = explode('->', $rightHand, 2);
                        $value2 = isset($vars[$objName]->$objAttr) ? $vars[$objName]->$objAttr : null;
                    }
                    else $value2 = $quote ? $rightHand : (isset($vars[$rightHand]) ? $vars[$rightHand] : null);

                    if ($value1 || $value2) $return = $value1 ? $value1 : $value2;
                }
                break;

            // Simple object attribute / array value.
            // {{object->attribute}}.
            case (preg_match('~(\w+)->(\w+)~', $expression, $m)):
                if (isset($vars[$m[1]]->{$m[2]})) $return = $vars[$m[1]]->{$m[2]};
                break;

            // Simple variables.
            case (preg_match('~\w+~', $expression, $m)):
                $return = $vars[$expression];
                break;
        }
        return $return;
    }, $tpl);
};


/*function checkVar($expression, $vars)
{
    $value = null;

    if (strpos($expression, '->') !== false)
    {
        list($objName, $objAttr) = explode('->', $expression, 2);
        $value = isset($vars[$objName]->$objAttr) ? $vars[$objName]->$objAttr : null;
    }
    elseif $value = isset($vars[$expression]) ? $vars[$expression] : null;

    return $value;
}*/
//================================================================================//
?>