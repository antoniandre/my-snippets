<?php
//================================================== VARS =============================================//
$isArchive= isset($_GET['archive']) && $_GET['archive'];
define('SELF', $_SERVER['PHP_SELF']);
//=====================================================================================================//


//================================================== MAIN =============================================//
$jsonTree= json_decode(file_get_contents($isArchive? $archiveJsonFile: $jsonFile));
$headers= $jsonTree->headers;
$rows= $jsonTree->rows;
if (isset($_POST['export']))
{
	$dirname= 'export/'.date('Ymd').' - '.($_POST['subject']? $_POST['subject'] : 'todo');
	if (!is_dir($dirname)) mkdir($dirname);

	$subject= $_POST['subject']? $_POST['subject'] : date('Ymd');
	$css= <<<EOT
	* {margin:0;padding:0;font-family:arial, sans-serif;}
	#all {margin:6% 6%;padding:25px;box-shadow:0 0 10px #ccc;font-size:12px;}
	h1 {background-color:#36a;color:#fff;text-align:center;padding:5px;font-variant:small-caps;font-size:140%;}
	table {border-collapse:collapse;margin:0 0;color:#36a;width:100%;height: 100%;}
	tr {position: relative;background-image:linear-gradient(rgba(255,255,255,.5),rgba(255,255,50,0));}
	tr:nth-child(even) {background-color:rgba(0,0,0,.05);}
	tr:nth-child(odd) {background-color:rgba(0,0,0,.01);}
	tr:first-child {background-color:rgba(140,180,240,.2);}
	th, td {border:1px solid #ddd;padding:0;min-width:36px;height: 100%;padding:5px;}
	tr > td {color:#259;}
	strong {display:block;padding-top:15px;font-size:15px;text-transform:uppercase;}
EOT;
	$content= '<!doctype html><html lang="fr"><head><meta charset="UTF-8"/><title>todo '.$subject.'</title><style>'.$css.'</style></head><body>'
			 .'<div id="all"><h1>todo '.$subject.'</h1>'.$_POST['content'].'</div></body></html>';
	file_put_contents("$dirname/todo.html", $content);
	$object= new StdClass();
	$object->error= false;
	$object->message= '<p>Now just move the new folder <code>'
					 .__DIR__."/$dirname"
					 .'</code> in its right place on the shared server at: '
					 .'<code>//FR-FP013.groupinfra.com/SOL/Projets/Pool-tma/Forfait/MAPI GROUP/02_LifeCycle/03_Etudes Techniques/Mapigroup/Cookie</code>.<br /><br />'
					 .'mv \''.__DIR__."/$dirname' '//FR-FP013.groupinfra.com/SOL/Projets/Pool-tma/Forfait/MAPI GROUP/02_LifeCycle/03_Etudes Techniques/Mapigroup/Cookie'"
					 .'</p>';

	die(json_encode($object));
}
elseif (isset($_POST['rows']))
{
	$object= new StdClass();
	$object->error= false;
	$object->message= '';
	// JSON file in which will save all the rows that are not supposed to be archived/unarchived
	$file4Rows= $isArchive? $archiveJsonFile: $jsonFile;

	// In case user clicked on a row to archive/unarchive it
	if (isset($_POST['archive']) && $_POST['archive'])
	{
		// JSON file in which will save the clicked row to archive/unarchive depending if current page is archive or not
		$file4clickedRow= $isArchive? $jsonFile : $archiveJsonFile;
		// die('saving '.($isArchive? 'unarchived' : 'archived').' row in file '.$file4clickedRow);
		$jsonTree4clickedRow= json_decode(file_get_contents($file4clickedRow));
		if ($row= json_decode($_POST['archive'])) $isArchive? array_unshift($jsonTree4clickedRow->rows, $row) : array_push($jsonTree4clickedRow->rows, $row);

		$object->error= !file_put_contents($file4clickedRow, json_encode($jsonTree4clickedRow));
		$object->message= $object->error? 'An error occured while trying to save the file.' : ('This row was '.($isArchive? 'unarchived' : 'archived').' successfully.');

		// If error here, die to not go further to prevent losing the clicked row
		if ($object->error) die(json_encode($object));
	}

	// In all cases, save all the rows that are not supposed to be archived/unarchived
	// die("\n".'Now saving all other rows in file '.$file4Rows);
	$jsonTree->rows= json_decode($_POST['rows']);
	$object->error= !file_put_contents($file4Rows, json_encode($jsonTree));

	// If failed while archiving/unarchiving died before reaching this line,
	// if failed while saving not clicked rows die giving the error message,
	// if succeeded and task was archiving/unarchiving message is retrieved from $object->message set above,
	// if succeeded and task was only saving message will just be 'file saved successfully'.
	$object->message= $object->error? ('An error occured while trying to save rows in the '.($isArchive? '' : 'archive ').'file.')
				    : ($object->message? $object->message : 'The file was saved successfully.');
	die(json_encode($object));
}
//=====================================================================================================//


//============================================== FUNCTIONS ============================================//
/**
 * @param int $rowType: 1=header, 2=row from json, 3= empty row
 */
function renderTableRows($headers, $rows, $rowType= 2)
{
	global $isArchive;

	$tr= '';
	if (!count($rows))// In case there is no registered row at all
	{
		$rows= array($headers);
		if ($rowType== 2) return '';
	}
	if ($rowType== 3) $rows= array($rows[0]);// Keep only one row to get the template for the last hidden empty row (used for js clone())
	foreach ($rows as $numRow => $row)
	{
		$td= '';
		$profit= 0;// Percentage
		$devtu= 0;// Theoretical
		$devtu_f= 0;// Final
		$completion= 0;

		foreach ($row as $cellNum => $cell)
		{
            $tdClass= isset($headers[$cellNum]->class)? $headers[$cellNum]->class : '';

            $cell= $rowType== 3? '' : $cell;
            $width= isset($headers[$cellNum]->width)? ' style="width:'.$headers[$cellNum]->width.'"' : '';

            $td.= "<td class=\"{$headers[$cellNum]->type} $tdClass\" $width><div>";

			if ($tdClass== 'tasks') $td.= renderTaskCell($cell);
			else switch ($headers[$cellNum]->type)
			{
				case 'text':
					$td.= '<input type="text" value="'.$cell.'"/>';
					break;
				case 'range':
					$val= $rowType== 3? '' : (int)$cell;
					$text= $rowType== 3? '-' : $cell;
					$td.= '<input type="range" value="'.$val.'" min="'.$headers[$cellNum]->range->min.'" max="'.$headers[$cellNum]->range->max.'" step="'.$headers[$cellNum]->range->step.'"/><span>'.$text.'</span>';
					break;
				case 'number':
					$td.= '<input type="number" min="'.$headers[$cellNum]->number->min.'" value="'.$cell.'" step="'.$headers[$cellNum]->number->step.'"/>';
					break;
				case 'date':
					$cell= !$cell && $headers[$cellNum]->default== 'today'? date('Y-m-d') : $cell;
					$td.= '<input type="date" value="'.$cell.'"/>';
					break;
				case 'textarea':
				default:
					$td.= "<textarea>$cell</textarea>";
					break;
				case 'select':
					$options= $headers[$cellNum]->select->options;
					$select= '';
					foreach ($options as $val => $opt)
					{
						$select.= '<option value="'.$val.'"'.($cell==$val? ' selected="selected"' : '').'>'.$opt.'</option>';
					}
					$td.= "<select>$select</select>";
					break;
			}
			$td.= '</div></td>';

			if ($tdClass== 'devtu') $devtu= floatval($cell);
			if ($tdClass== 'devtu_f') $devtu_f= floatval($cell);
			elseif ($tdClass== 'completion') $completion= intval($cell);

		}

		if ($completion== 100 && $devtu && $devtu_f) $profit= round((1-$devtu_f/$devtu)*100);

		$tr.= "<tr>
					<td style=\"width:10px\" class=\"noContent handle".($profit? ' profit i-tag' : '')."\" data-profit=\"".($profit> 0 ? '+'.$profit : $profit)."%\">
						<div>
							<span class=\"handle\"></span>
							<input type=\"checkbox\" class=\"toggle\"/>
							<label class=\"i-minus\" title=\"Mask\"></label>
							<button class=\"archive i-".($isArchive? 'unarchive' : 'archive')."\" title=\"".($isArchive? 'Unarchive' : 'Archive')."\"/></button>
						</div>
					</td>
					$td
				</tr>";
	}
	if ($rowType== 3) $tr.= "<tr class=\"hidden\">
								<td style=\"width:10px\" class=\"noContent handle\">
									<div>
										<span class=\"handle\"></span>
										<input type=\"checkbox\" class=\"toggle\"/>
										<label class=\"i-minus\" title=\"Mask\"></label>
										<button class=\"archive i-".($isArchive? 'unarchive' : 'archive')."\" title=\"".($isArchive? 'Unarchive' : 'Archive')."\"></button>
									</div>
								</td>
								$td
							</tr>";
	return $tr;
}

function renderTaskCell($tasks)
{
	if (!$tasks)
	{
		$task= new StdClass();
		$task->done= 0;
		$task->text= '';
		$task->charge= '';
		$tasks= array($task);
	}

	$tasksHTML= '<div class="tasks">';
	foreach ($tasks as $k => $task)
	{
		if (isset($task->subject)) $subject= $task->subject;
		elseif (isset($task->charge)) $tasksHTML.= createTask($task->done, $task->text, $task->charge);
		else $tasksHTML.= createTitle($task->text);
	}
	$tasksHTML.= createTask(null, null, null, 1).'</div>';

	$subjectHTML= '<div class="subject">
						<input type="checkbox"'.(isset($subject)? ' checked="checked"' : '').'/>
						<div>
							<label class="i-info"></label>
							<input type="text" value="'.(isset($subject)? $subject : '').'"/>
						</div>
				   </div>';

	return $subjectHTML.$tasksHTML;
}

function createTitle($text= '')
{
	return "<div class=\"title\">
				<span class=\"handle\"></span>
				<textarea>$text</textarea>
			</div>";
}

function createTask($done= 0, $text= '', $charge= '', $hidden= 0)
{
	return "<div".($hidden? ' class="hidden"' : '').">
				<span class=\"handle\"></span>
				<input type=\"checkbox\"".($done? ' checked="checked"' : '')." data-value=\"".(float)$done."\"/>
				<label></label>
				<textarea>$text</textarea>
				<input type=\"number\" min=\"0\" step=\"0.1\" value=\"$charge\"/>
			</div>";
}

//=====================================================================================================//
?><!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title><?php echo $jsonTree->todoName ?></title>
	<link href="css/styles.css" rel="stylesheet" type="text/css" media="all" />
	<script src="js/jquery.js"></script>
	<script src="js/jquery.ui.js"></script>
	<script src="js/behavior.js"></script>
</head>
<body class="<?php echo $isArchive? 'archive' : '' ?>">
	<div id="lightbox">
		<div class="inner"></div>
	</div>
	<div id="messageWrapper"><div id="message"></div></div>
	<div id="trashWrapper">
		<div id="trash"><span class="count"></span></div>
	</div>
	<div id="all">
		<div class="page">
			<div id="tableWrapper">
			<table id="mainTable" cellspacing="0" cellpadding="0">
				<header><?php echo $jsonTree->todoName ?> </header>
				<tr><th style="width:10px" class="noContent handle"></th>
					<?php
					// don't affect $headers with possible deletions made on $headersTmp
					$headersTmp= $headers;

					foreach ($headersTmp as $cellNum => $cell)
					{
						// if colspan is defined, skip the following header cell by unsetting it
						if (isset($cell->colspan)) unset($headersTmp[$cellNum+1]);
						if (!isset($headersTmp[$cellNum])) continue;

						echo $th= '<th style="width:'.$cell->width.'"'.(isset($cell->colspan)? " colspan=\"$cell->colspan\"" : '').'>'.(isset($cell->icon)? "<span class=\"$cell->icon\"></span><br />" : '').$cell->text.'</th>';
					} ?>
				</tr>
				<?php echo renderTableRows($headers, $rows).renderTableRows($headers, $rows, 3); ?>
			</table>
			<div class="buttons">
				<div class="left">
					<button id="toggleAll" class="i-eye-close" title="Hide selected rows"> Hide all</button>
					<a href="<?php echo $isArchive? SELF : (SELF.'?archive=1'); ?>" class="i-<?php echo $isArchive? 'return-left' : 'redo' ?>"> See <?php echo $isArchive? 'current' : 'archived' ?> TODO</a>
				</div>
				<div class="center">
					<button id="newRow" class="i-plus"> Add a row</button>
				</div>
				<div class="right">
					<button id="save" class="i-valid"> Save</button>
				</div>
			</div>
			</div>
			<br class="clear"/>
		</div>
	</div>
</body>
</html>