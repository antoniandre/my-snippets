<?php
//============================= VARS =============================//
$filesToClean= array('.');
$maxDepth= 1;
$filePattern= '~^[^.].*\.(?:html|htm|php|tpl|js|css)$~si';
$filesStack= array();
//================================================================//


//============================= MAIN =============================//
crawlFiles($filesToClean);
if (!isset($_GET['confirmed'])) askConfirm();
else treatStack($filesStack);
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
    echo 'Are you sure you want to proceed to the cleanup of the following files?  <a href="?confirmed">YES</a>';
    foreach($filesStack as $file) echo "<br/>\n$file";
}

function treatStack($filesStack)
{
	foreach($filesStack as $file) cleanup($file);
}

function cleanup($file)
{
    $i= pathinfo(__FILE__);
    $root= $i["dirname"];
    echo $absFilePath= "$root\\".str_replace(array('./', '/'), array('', '\\'), $file);

    //echo exec("cd $root", $output);
    //print_r($output);die;
//"cacls $file"
    echo exec('stat -c "0%a" '.$absFilePath, $output);
    print_r($output);
    die;
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

    if (!is_readable($file))
    {
        exec('chmod 0777 '.$file.'', $output);
        print_r($output);
        //chmod($file, 0777);
    }

    if (is_readable($file))
    {
        $contents= file_get_contents($file);
        exec("chmod $perms $file");
        echo $contents= str_replace(array("\t", " \n", ""), array('    ', "\n"), $contents);
        die;
    }

	//file_put_contents($file, $contents);
}
//================================================================//
?>