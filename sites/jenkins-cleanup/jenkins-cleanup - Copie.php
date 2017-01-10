<?php
//============================= VARS =============================//
//$filesToClean= array('.');
$filesToClean= array('dirty-code.php');
$maxDepth= 1;
$filePattern= '~^[^.].*\.(?:html|htm|php|tpl|js|css)$~si';
$filesStack= array();
$task= 'askConfirm';
define('SELF', $_SERVER['PHP_SELF']);
//================================================================//


//============================= MAIN =============================//
crawlFiles($filesToClean);
if (isset($_GET['trackChanges']) && isset($_GET['file']))
{
	$task= 'trackChanges';
	$file= $_GET['file'];
	$contents= trackChanges(urldecode($file));
}
elseif (!isset($_GET['confirmed']))
{
	$task= 'askConfirm';
	$filesList= askConfirm();
}
elseif (isset($_GET['confirmed']))
{
	$task= 'proceed';
	if (isset($_GET['file'])) $filesStack= urldecode($_GET['file']);
	treatStack($filesStack);
}
//================================================================//


//========================== FUNCTIONS ===========================//
function crawlFiles($files, $path='.', $depth=0)
{
    global $patternToSkip, $filePattern, $maxDepth, $filesStack;

    foreach($files as $file)
    {
        if ($depth>0) $file= "$path/$file";
        if (is_file($file) && preg_match($filePattern, basename($file))) $filesStack[]= $file;
        elseif(is_dir($file) && $depth<= $maxDepth)
        {
            crawlFiles(array_diff(scandir($file), array('.', '..')), "$path/$file", $depth+1);
        }
    }
}

function askConfirm()
{
    global $filesStack;

	$filesList= '';
    foreach($filesStack as $file) $filesList.= "<li>$file <a href=\"?trackChanges&file=".urlencode($file)."\">See changes</a></li>";

	return $filesList;
}

function treatStack($filesStack)
{
	foreach($filesStack as $file)
	{
		$contents= cleanup($file);
		writeFile($file, $contents);
	}
}

function trackChanges($file)
{
	$contents= array(cleanup($file, true, false), cleanup($file, true));
	return $contents;
}

function writeFile($file, $contents)
{
	file_put_contents($file, $contents);
}

function cleanup($file, $highlight= false, $doReplace= true)
{
	if (checkFilePerms($file))
	{
		// Pairs of match-replace, for preg_replace().
		$patterns= array(
						//if php '.', ' . '
						//if js '+', ' + '
						//'if (...) then', 'if (...) {then}'
						//'else then', 'else {then}'
						array('~\s+$~', '[highlight][/highlight]'),// Match and remove any space on an empty line.
						array('~(\((?!\))|,|==|=(?!=|))(?! )~', '$1[highlight] [/highlight]'),
						array('~(?<! )((?<!\()\)|(?<!=)=)~', '[highlight] [/highlight]$1'),
						//array('~(?<!\*\/)\n*(\s*)function (.+?)\(\s*([^\s]*?)\s*\)~ms', "\n\n$1/**\n$1 * function $2.\n$1 *\n$1 * @version //autogentag//$1\n$1 * @params $3\n$1 * @return null\n$1 */\n$1function $2($3)"),
						);
		// Pair of matches array - replacements array, for str_replace() only.
		$replaces= array(array("\t", "\r\n", " \n"), array('[highlight]    [/highlight]', "[highlight]\n[/highlight]", "[highlight]\n[/highlight]"));

		$replacements= array();
		$contents= htmlentities(file_get_contents($file));// The content to perform replacements on.

		if ($doReplace)
		{
			//$contents= str_replace(array('[highlight]', '[/highlight]'), '', $contents);
			$contents= str_replace($replaces[0], $replaces[1], $contents);
		}
		else $contents= str_replace($replaces[0], array("\t", "\r\n", " \n"), $contents);
		// else $contents= str_replace($replaces[0], array("\t", "\r\n", " \n"), $contents);
		// else $contents= str_replace($replaces[0], explode(';;', implode(";;", $replaces[1])), $contents);

		foreach($patterns as $pattern)
		{
			if (!$doReplace && preg_match($pattern[0], $contents, $matches))
			{
				$contents= preg_replace($pattern[0], "\\0", $contents);
			}
			else $contents= preg_replace($pattern[0], $pattern[1], $contents);
		}

		if ($doReplace && count($replacements))
		{
			foreach ($replacements as $r) $contents= preg_replace('/\[highlight\].*?\[\/highlight\]/', "\\0", $contents);
		}

		$contents= str_replace(array('[highlight]', '[/highlight]'), array('<span class="highlight">', '</span>'), $contents);
		if ($doReplace && count($replacements)) $contents= preg_replace('/<span class="highlight">(.*?)<\/span> <span class="highlight">(.*?)<\/span>/', '<span class="highlight">$1$2</span>', $contents);
		return $contents;
	}
}

function checkFilePerms($file)
{
	if (!is_readable($file))
	{
	   die('File "$file" is not readable.');
       exec('chmod 0777 '.$file.'', $output);
       print_r($output);
       //chmod($file, 0777);
	}

	return is_readable($file);

    $i= pathinfo(__FILE__);
    $root= $i["dirname"];
    echo $absFilePath= "$root\\".str_replace(array('./', '/'), array('', '\\'), $file);

    //echo exec("cd $root", $output);
    //print_r($output);die;
    //"cacls $file"
    echo exec('stat -c "0%a" '.$absFilePath, $output);
    print_r($output);
    die;
	//exec("chmod $perms $file");
    //$i= pathinfo($file);print_r($i);
    //$p= exec('stat -c "0%a" '.$file, $output);
    $s= stat($file);
    $s= $s[2];
    //$perms= $output[0];
    print_r($s);
    echo ' '.substr(sprintf('%o', $s), -4);
    die;//('stat -c "0%a" '.$file);
    //$perms= substr(sprintf('%o', fileperms($file)), -4);
    $owner= fileowner($file);
    // echo "$file => $perms - $owner\n";
}
//================================================================//

?><html>
<head>
	<title>Jenkins Cleanup</title>
	<link type="text/css" rel="stylesheet" href="css/perfectscrollbar.css" />
	<style language="text/css">
	* {margin:0;padding:0;outline:none;}
	body {background:#e8e8e8;padding:5%;font:12px trebuchet MS, arial;}
	.page {padding:30px;border:1px solid #d8d8d8;border-radius:5px;width:900px;margin:auto;background:#e4e4e4;}
	h1 {-webkit-border-radius:5px;
	-moz-border-radius:5px;
	border-radius:5px;}
	h2 {margin-top:15px;}
	p {margin:12px 0;font-size:14px;}
	ul {margin-left:15px;}
	hr {border:none;border-top:1px dotted #ccc;margin:15px 50px;}
	.center {text-align:center;}

	a.yes, a.no
	{position:relative;
	z-index:1;
	display:inline-block;
	outline:none;
	color:#fff;
	text-decoration:none;
	text-transform:uppercase;
	letter-spacing:1px;
	font-weight:400;
	text-shadow:0 0 1px rgba(255,255,255,0.3);
	font-size:1.35em;
	padding: 0 5px;
	color: #666;
	font-weight: 700;
	-webkit-transition: color 0.3s;
	-moz-transition: color 0.3s;
	transition: color 0.3s;
	margin:10px 0;}
	a:hover, a:focus {color:#333;}
	a.yes::before, a.yes::after, a.no::before, a.no::after
	{position:absolute;
	width:100%;
	left:0;
	top:50%;
	height:2px;
	margin-top:-1px;
	background:#666;
	content:'';
	z-index:-1;
	-webkit-transition: -webkit-transform 0.3s, opacity 0.3s;
	-moz-transition: -moz-transform 0.3s, opacity 0.3s;
	transition: transform 0.3s, opacity 0.3s;
	pointer-events: none;}
	a.yes::before, a.no::before
	{-webkit-transform: translateY(-20px);
	-moz-transform: translateY(-20px);
	transform: translateY(-20px);}
	a:hover::before, a:focus::before
	{-webkit-transform: rotate(45deg);
	-moz-transform: rotate(45deg);
	transform: rotate(45deg);}
	a.yes::after, a.no::after
	{-webkit-transform: translateY(20px);
	-moz-transform: translateY(20px);
	transform: translateY(20px);}
	a:hover::after, a:focus::after
	{-webkit-transform: rotate(-45deg);
	-moz-transform: rotate(-45deg);
	transform: rotate(-45deg);}
	a:hover::before, a:hover::after, a:focus::before, a:focus::after {opacity:0.7;}

	input[type="text"], input[type="submit"] {padding:2px 3px;}
	.codeWrapper
	{position:relative;
	margin:40px 0;
	-webkit-animation:.5s shake;
	-moz-animation:.5s shake;
	-ms-animation:.5s shake;
	-o-animation:.5s shake;
	animation:.5s shake;
	height:200px;
	border-radius:5px;}
	.codeWrapper .bg
	{position: absolute;
	left: 0;
	top: 0;
	height: 100%;
	width: 100%;}
	.codeWrapper .content {height: 100%;overflow:hidden;position: relative;}
	.codeWrapper .bg span
	{position:absolute;
	display: block;
	top: 0;
	left: 0;
	height: 100%;
	width: 49%;
	background:#333;
	box-shadow:0 0 10px #000 inset;
	border-radius:5px;}
	.codeWrapper .bg span + span {right: 0;left:auto;}
	.codeWrapper .bg span:before
	{position:absolute;
	top:-20px;
	left:0;
	font-variant:small-caps;
	font-size:16px;
	color:#666;
	content:"Before:";}
	.codeWrapper .bg span + span:before {content:"After:";}
	.code
	{width:49%;
	min-height:100%;
	position:relative;
	font-family:monospace;
	font-size:13px;
	color:#eee;
	background:none;
	white-space:pre-wrap;
	line-height:18px;}
	.code + .code {top:0;right:0;position:absolute;}
	.code .inner {padding:10px;}
	.codeWrapper .ps-scrollbar-y-rail {right:49.5%;opacity: 1;}
	.code .highlight {color:#333;font-style:italic;padding:0 2px;background:cyan;}
	@-webkit-keyframes shake
	{
		0%, 100% {-webkit-transform: translateX(0);}
		10%, 30%, 50%, 70%, 90% {-webkit-transform: translateX(-10px);}
		20%, 40%, 60%, 80% {-webkit-transform: translateX(10px);}
	}
	@-moz-keyframes shake
	{
		0%, 100% {-moz-transform: translateX(0);}
		10%, 30%, 50%, 70%, 90% {-moz-transform: translateX(-10px);}
		20%, 40%, 60%, 80% {-moz-transform: translateX(10px);}
	}
	@keyframes shake
	{
		0%, 100% {transform: translateX(0);}
		10%, 30%, 50%, 70%, 90% {transform: translateX(-10px);}
		20%, 40%, 60%, 80% {transform: translateX(10px);}
	}

	.satisfied {font-size:18px;color:#333;}
	.satisfied a {margin:0 10px;}
	</style>
	<script type="text/javascript" src="js/jquery.js"></script>
	<script type="text/javascript" src="js/jquery.perfectscrollbar.js"></script>
	<script>
	$(document).ready(function()
	{
		if ($('.codeWrapper').length) $('.codeWrapper .content').perfectScrollbar();
	});
	</script>
</head>
<body>
	<div class="page">
	<h1>Jenkins Cleanup</h1><?php
	if ($task== 'trackChanges')
	{ ?>
		<h2>Changes to apply to the file "<?php echo $file ?>"</h2>
		<div class="codeWrapper">
			<div class="bg">
				<span></span>
				<span></span>
			</div>
			<div class="content">
				<div class="code"><div class="inner"><?php echo $contents[0] ?></div></div>
				<div class="code"><div class="inner"><?php echo $contents[1] ?></div></div>
			</div>
		</div>
		<div>
			<p class="satisfied">Are you satisfied? <a class="no" href="<?php echo SELF ?>" title="Discard the changes">NO</a> <a class="yes" href="<?php echo SELF."?confirmed&file=$file" ?>" title="Ok, apply changes">YES</a></p>
		</div>
		<?php
	}
	elseif ($task== 'proceed')
	{ ?>

		<?php
	}
	elseif ($task== 'askConfirm')
	{ ?>
		<div>
			<p>Are you sure you want to proceed to the cleanup of the following files?</p>
			<hr />
			<ul>
				<?php echo $filesList ?>
			</ul>
			<hr />
			<p class="center"><a class="yes" href="?confirmed">YES</a></p>
		</div>
		<?php
	} ?>
	</div>
</body>