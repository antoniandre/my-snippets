<?php
define('SELF', $_SERVER['PHP_SELF']);

/**
* ChecklistManager
*/
class ChecklistManager
{
	const dir = 'data/';
	public $checklists = [];
	public $currentChecklist = null;
	
	function __construct()
	{
		$this->checklists = $this->listChecklists();
		$checklistId = isset($_GET['id']) && $_GET['id'] !== 'new' ? (int)$_GET['id'] : null;

		if ($checklistId) $this->currentChecklist = new Checklist(self::dir.$this->checklists[$checklistId]->file);
		elseif (isset($_GET['id']) && $_GET['id'] == 'new') $this->currentChecklist = $this->newChecklist();
	}

	function listChecklists()
	{
		$checklists = [];
		$files = scandir(self::dir);
		foreach (array_diff($files, ['..', '.']) as $k => $file) if (preg_match("/^.*\.json/i", $file))
		{
			$json = json_decode(file_get_contents(self::dir."/$file"));
			$checklists[$json->id] = new StdClass();
			$checklists[$json->id]->name = $json->name;
			$checklists[$json->id]->file = $file;
		}
		return $checklists;
	}

	function makeNewId()
	{
		$maxId = 0;
		foreach ($this->checklists as $id => $checklists)
		{
			$maxId = $id > $maxId ? $id : $maxId;
		}
		return $maxId+1;
	}

	function renderlistOfChecklists()
	{
		$list = '';
	  	foreach ($this->checklists as $id => $checklist)
		{
			$list .= "<li><a href=\"".SELF."?id=$id\">{$checklist->name}</a></li>";
		}
		return $list;
	}

	function renderlistOfGlyphs($col)
	{
		$fontFile = file_get_contents('css/fonts/todo.svg');
		preg_match_all("~<glyph unicode=\"(&#\d+;)\"~", $fontFile, $matches);
		foreach($matches[1] as $match) $glyphs[] = $match;

		$list = '';
	  	foreach ($glyphs as $id => $glyph)
		{
			$list .= "<input type=\"radio\" id=\"glyph$id\" name=\"settings[col$col][glyph]\""
			         .($this->currentChecklist->headers[$col]->icon == html_entity_decode($glyph) ? " checked" : '')
			         ."><label for=\"glyph$id\" class=\"glyph\" data-icon=\"$glyph\"></label>";
		}
		return $list;
	}

	function newChecklist()
	{
		$id = $this->makeNewId();
		$this->checklists[$id] = new StdClass();
		$this->checklists[$id]->name = "New checklist";
		$this->checklists[$id]->file = "new-checklist.json";
		$json = '{"name":"New checklist","id":"'.$id.'",
				  "headers":[{"text":"Column 1","class":"col1","width":"33%","type":"textarea","icon":"Q"},
							 {"text":"Tasks","class":"tasks","width":"33%","type":"textarea","icon":"Q"},
							 {"text":"Column 3","class":"col3","width":"33%","type":"textarea","icon":"Q"}],
				  "rows":[],
				  "archivedRows":[],
				  "settings":[]}';
		file_put_contents(self::dir.$this->checklists[$id]->file, $json);
		return new Checklist(self::dir.$this->checklists[$id]->file);
	}
}


/**
* Checklist
*/
class Checklist
{
	public $id = 0;
	public $file = "";
	public $name = "";
	public $isArchive = false;
	public $headers = null;
	public $rows = null;
	public $archivedRows = null;
	const defaultSettings = ["addTaskLabel" => "Add task", "addTitleLabel" => "Add title", "showTaskCharge" => 0];
	public $settings = null;

	function __construct($file)
	{
		$this->file = $file;
		$json = $this->readFile();
		$this->id = $json->id;
		$this->name = $json->name;
		$this->isArchive = isset($_GET['archive']) && $_GET['archive'];
		$this->headers = $json->headers;
		$this->rows = $json->rows;
		$this->archivedRows = $json->archivedRows;
		$this->settings = new StdClass();

		foreach (self::defaultSettings as $key => $defaultValue)
		{
			$this->settings->$key = !isset($json->settings->$key) ? $defaultValue : $json->settings->$key;
		}
	}

	function isArchive()
	{
		return $this->isArchive;
	}

	/**
	 * @param int $rowType: 1=header, 2=row from json, 3= empty row
	 */
	function renderTableRows($headers, $rows, $rowType = 2)
	{
		$tr = '';
		if (!count($rows))// In case there is no registered row at all
		{
			$rows = array($headers);
			if ($rowType == 2) return '';
		}

		if ($rowType == 3) {$rows = array($rows[0]);}// Keep only one row to get the template for the last hidden empty row (used for js clone())
		foreach ($rows as $numRow => $row)
		{
			$td = '';
			$profit = 0;// Percentage
			$devtu = 0;// Theoretical
			$devtu_f = 0;// Final
			$completion = 0;
			$isCompact = isset($row->properties->compact) && $row->properties->compact && $rowType !== 3;

			// If no row at all, template taken from header so convert to expected format.
			$cells = isset($row->cells) ? $row->cells : $row;

			foreach ($cells as $cellNum => $cell)
			{
				$tdClass = isset($headers[$cellNum]->class) ? $headers[$cellNum]->class : '';

	            $cell = $rowType== 3 ? '' : $cell;
	            $width = isset($headers[$cellNum]->width) ? ' style="width:'.$headers[$cellNum]->width.'"' : '';

	            $td .= "<td class=\"{$headers[$cellNum]->type} $tdClass\" $width><div>";

				if ($tdClass == 'tasks') $td .= $this->renderTaskCell($cell);
				else switch ($headers[$cellNum]->type)
				{
					case 'text':
						$td .= '<input type="text" value="'.$cell.'"/>';
						break;
					case 'range':
						$val = $rowType== 3 ? '' : (int)$cell;
						$text = $rowType== 3 ? '-' : $cell;
						$td .= '<input type="range" value="'.$val.'" min="'.$headers[$cellNum]->range->min.'" max="'.$headers[$cellNum]->range->max.'" step="'.$headers[$cellNum]->range->step.'"/><span>'.$text.'</span>';
						break;
					case 'number':
						$td .= '<input type="number" min="'.$headers[$cellNum]->number->min.'" value="'.$cell.'" step="'.$headers[$cellNum]->number->step.'"/>';
						break;
					case 'date':
						$cell = !$cell && $headers[$cellNum]->default== 'today' ? date('Y-m-d') : $cell;
						$td .= '<input type="date" value="'.$cell.'"/>';
						break;
					case 'textarea':
					default:
						$td .= "<textarea>$cell</textarea>";
						break;
					case 'select':
						$options = $headers[$cellNum]->select->options;
						$select = '';
						foreach ($options as $val => $opt)
						{
							$select .= '<option value="'.$val.'"'.($cell == $val ? ' selected="selected"' : '').'>'.$opt.'</option>';
						}
						$td .= "<select>$select</select>";
						break;
				}
				$td.= '</div></td>';

				if ($tdClass == 'devtu') $devtu = floatval($cell);
				if ($tdClass == 'devtu_f') $devtu_f = floatval($cell);
				elseif ($tdClass == 'completion') $completion = intval($cell);

			}

			if ($completion == 100 && $devtu && $devtu_f) $profit = round((1-$devtu_f/$devtu)*100);

			$tr .= "<tr".($isCompact ? ' class="compact"' : '').">
						<td style=\"width:10px\" class=\"noContent handle".($profit? ' profit i-tag' : '')."\" data-profit=\"".($profit> 0 ? '+'.$profit : $profit)."%\">
							<div>
								<span class=\"handle\"></span>
								<input type=\"checkbox\" class=\"toggle\"".($isCompact ? ' checked="checked"' : '')."/>
								".($isCompact ? '<label class="i-plus" title="Show"></label>' : '<label class="i-minus" title="Mask"></label>')."
								<button class=\"archive i-".($this->isArchive() ? 'unarchive' : 'archive')."\" title=\"".($this->isArchive() ? 'Unarchive' : 'Archive')."\"/></button>
							</div>
						</td>
						$td
					</tr>";
		}
		if ($rowType == 3) $tr .= "<tr class=\"hidden\">
									<td style=\"width:10px\" class=\"noContent handle\">
										<div>
											<span class=\"handle\"></span>
											<input type=\"checkbox\" class=\"toggle\"/>
											<label class=\"i-minus\" title=\"Mask\"></label>
											<button class=\"archive i-".($this->isArchive() ? 'unarchive' : 'archive')."\" title=\"".($this->isArchive() ? 'Unarchive' : 'Archive')."\"></button>
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
			$task = new StdClass();
			$task->done = 0;
			$task->text = '';
			$task->charge = '';
			$tasks = array($task);
		}

		$tasksHTML = '<div class="tasks">';
		foreach ($tasks as $k => $task)
		{
			if (isset($task->subject)) $subject = $task->subject;
			elseif (isset($task->charge) || isset($task->done)) $tasksHTML .= $this->createTask($task->done, $task->text, isset($task->charge) ? $task->charge : null);
			else $tasksHTML .= $this->createTitle($task->text);
		}
		$tasksHTML .= $this->createTask(null, null, null, 1).'</div>';

		$subjectHTML = '<div class="subject">
							<input type="checkbox"'.(isset($subject) ? ' checked="checked"' : '').'/>
							<div>
								<label class="i-info"></label>
								<input type="text" value="'.(isset($subject) ? $subject : '').'"/>
							</div>
					   </div>';

		return $subjectHTML.$tasksHTML;
	}

	function createTitle($text = '')
	{
		return "<div class=\"title\">
					<span class=\"handle\"></span>
					<textarea>$text</textarea>
				</div>";
	}

	function createTask($done = 0, $text = '', $charge = null, $hidden = 0)
	{
		$minHeight = (substr_count($text, "\n")+1)*1.55;// in em.
		return "<div".($hidden ? ' class="hidden"' : '').">
					<span class=\"handle\"></span>
					<input type=\"checkbox\"".($done ? ' checked="checked"' : '')." data-value=\"".(float)$done."\"/>
					<label></label>
					<textarea style=\"min-height:{$minHeight}em\">$text</textarea>"
					.($this->settings->showTaskCharge ? "<input type=\"number\" min=\"0\" step=\"0.1\" value=\"$charge\"/>" : '')
				."</div>";
	}

	function export()
	{
		$dirname = 'export/'.date('Ymd').' - '.($_POST['subject'] ? $_POST['subject'] : 'todo');
		if (!is_dir($dirname)) mkdir($dirname);

		$subject = $_POST['subject']? $_POST['subject'] : date('Ymd');
		$css = <<<EOT
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
		$content = '<!doctype html><html lang="fr"><head><meta charset="UTF-8"/><title>todo '.$subject.'</title><style>'.$css.'</style></head><body>'
				  .'<div id="all"><h1>todo '.$subject.'</h1>'.$_POST['content'].'</div></body></html>';
		file_put_contents("$dirname/todo.html", $content);
		$object = new StdClass();
		$object->error = false;
		$object->message = '<p>Now just move the new folder <code>'
						 .__DIR__."/$dirname"
						 .'</code> in its right place on the shared server at: '
						 .'<code>//FR-FP013.groupinfra.com/SOL/Projets/Pool-tma/Forfait/MAPI GROUP/02_LifeCycle/03_Etudes Techniques/Mapigroup/Cookie</code>.<br /><br />'
						 .'mv \''.__DIR__."/$dirname' '//FR-FP013.groupinfra.com/SOL/Projets/Pool-tma/Forfait/MAPI GROUP/02_LifeCycle/03_Etudes Techniques/Mapigroup/Cookie'"
						 .'</p>';

		die(json_encode($object));
	}

	/**
	 * Archive or unarchive a row.
	 * Compare the json_encoded selected row to everyjson_encoded row to find it.
	 * Then remove it from the source 'rows' or 'archivedRows' and append or prepend it to the target 'archivedRows' or 'rows'.
	 *
	 * @return String
	 */
	function archiveRow()
	{
		$row2move = json_decode($_POST['archive']);
		$srcRows = $this->isArchive() ? "archivedRows" : "rows";
		$targetRows = $this->isArchive() ? "rows" : "archivedRows";

		foreach ($this->$srcRows as $k => $row) if (json_encode($row) == json_encode($row2move))
		{
			unset($this->{$srcRows}[$k]);
			break;
		}
		//!\ After unsetting an array key, the indexes of the array are converted to strings automatically by PHP,
		//!\ causing a json_encode to replace the array by an object (javascript indexed array)!
		//!\ So the following line discards the string indexes.
		$this->$srcRows = array_values($this->$srcRows);

		// According to the archive or unarchive task, append or prepend the selected row.
		$this->isArchive() ? array_unshift($this->$targetRows, $row2move) : array_push($this->$targetRows, $row2move);

		$object = new StdClass();
		$object->error = !$this->writeFile();
		$object->message = $object->error ? 'An error occured while trying to save the file.' : ('This row was '.($this->isArchive() ? 'unarchived' : 'archived').' successfully.');

		// If error return the error message to the Javascript.
		die(json_encode($object));
	}

	function saveRows()
	{
		$object = new StdClass();
		$object->error = false;
		$object->message = '';

		$srcRows = $this->isArchive() ? "archivedRows" : "rows";

		// Update the rows in the Checklist class attribute with fresh user modified data.
		$this->$srcRows = json_decode($_POST['rows']);
		$object->error = !$this->writeFile();
		$object->message = $object->error ? ('An error occured while trying to save rows in the '.($this->isArchive() ? '' : 'archive ').'file.')
					     				  : 'The file was saved successfully.';
		die(json_encode($object));
	}

	function renderSettings()
	{
	}

	function saveSettings()
	{
		$object = new StdClass();
		$object->error = false;
		$object->message = '';
		$this->settings = json_decode($_POST['settings']);
print_r($this->settings);die;
		$object->error = !$this->writeFile();
		$object->message = $object->error ? ('An error occured while trying to save settings.')
					     				  : 'The settings was saved successfully.';
		die(json_encode($object));
	}

	function readFile()
	{
		// JSON file in which will save all the rows (archived/unarchived).
		return json_decode(file_get_contents($this->file));
	}

	function writeFile()
	{
		$jsonTree = new StdClass();
		$jsonTree->name = $this->name;
		$jsonTree->id = $this->id;
		$jsonTree->headers = $this->headers;
		$jsonTree->rows = $this->rows;
		$jsonTree->archivedRows = $this->archivedRows;
		$jsonTree->settings = $this->settings;

		// JSON file in which will save all the rows (archived/unarchived).
		return file_put_contents($this->file, json_encode($jsonTree));
	}
}

//================================================== MAIN =============================================//
$clm = new ChecklistManager();
$cl = $clm->currentChecklist;

if ($cl)
{
	if (isset($_POST['export'])) $cl->export();
	elseif (isset($_POST['rows']) && isset($_POST['archive']) && $_POST['archive']) $cl->archiveRow();
	elseif (isset($_POST['rows'])) $cl->saveRows();
	elseif (isset($_POST['saveSettings']) && isset($_POST['settings'])) $cl->saveSettings();
}
//=====================================================================================================//


//============================================== FUNCTIONS ============================================//
//=====================================================================================================//
?><!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Checklists<?php echo $cl ? (" - {$cl->name}".($cl->isArchive() ? ' archive' : '')) : '' ?></title>
	<link href="css/styles.css" rel="stylesheet" type="text/css" media="all" />
	<script src="js/jquery.js"></script>
	<script src="js/jquery.ui.js"></script>
	<script>
	var settings = <?php echo $cl ? json_encode($cl->settings) : 'null'; ?>;
	</script>
	<script src="js/behavior.js"></script>
</head>
<body class="<?php echo $cl && $cl->isArchive()? 'archive' : '' ?>">
	<div id="lightbox">
		<div class="inner"></div>
	</div>
	<div id="messageWrapper"><div id="message"></div></div>
	<div id="trashWrapper">
		<div id="trash"><span class="count"></span></div>
	</div>
	<div id="all">
		<div id="settingsPannel">
		<form action="" method="POST">
			<label for="settings" class="close i-cross" title="Close settings"></label>
			<p class="title">Settings</p>
			<?php if (!$cl)
			{
				echo '<p>Settings disabled, please select a checklist.</p>';
			}
			else
			{ ?>
				<div class="step step1">
					<p class="title">
						<strong>Step 1</strong>
						<span>Checklist name</span>
					</p>
					<p class="field">
						<label for="checklistName"><span>Name</span></label>
						<input type="text" id="checklistName" name="settings[name]" value="<?php echo $cl->name ?>" placeholder="Checklist name">
					</p>
				</div>
				<div class="step step2">
					<p class="title">
						<strong>Step 2</strong>
						<span>Columns definition</span>
					</p>
					<?php
					foreach ($cl->headers as $k => $header)
					{ ?>
						<div class="colDetails group">
							<strong>Column <?php echo $k+1 ?></strong><br>
							<p class="field">
								<label for="col1name">Name</label>
								<input type="text" id="col1name" name="settings[cols][<?php echo $k ?>][name]" value="<?php echo $header->text ?>" placeholder="Column name">
							</p>
							<p class="field">
								<label for="col1icon">Icon</label>
								<span class="glyphsList"><?php echo $clm->renderlistOfGlyphs($k); ?></span>
								<input type="hidden" name="settings[col1][glyph]">
							</p>
							<p class="field">
								<label for="col1type">Type</label>
								<select id="col1type">
									<option value="textarea">Textarea</option>
									<option value="text">Text</option>
									<option value="number">Number</option>
									<option value="date">Date</option>
									<option value="select">Select list</option>
								</select>
							</p>
						</div><?php
					}
					?>
				</div>
				<div class="step step3">
					<p class="title">
						<strong>Step 3</strong>
						<span>Check behavior & symbols</span>
					</p>
					<em>Drag only the symbols you need at the desired position in the drop zone.</em>
					<div class="dropzone">
						<div class="bg">
							<span>1</span><!-- 
							--><span>2</span><!-- 
							--><span>3</span><!-- 
							--><span>4</span><!-- 
							--><span>5</span><!-- 
							--><span>6</span>
						</div>
					</div>
					<div class="dragzone">
						<span class="symbol i-check"></span>
						<span class="symbol i-stopwatch"></span>
						<span class="symbol i-warning"></span>
						<span class="symbol i-hourglass"></span>
						<span class="symbol i-gift"></span>
						<span class="symbol i-cross"></span>
					</div>
				</div>
				<div class="step step4">
					<p class="title">
						<strong>Step 4</strong>
						<span>General</span>
					</p>
					<p class="field">
						<label for="addTaskLabel" class="large">Add item label</label>
						<input type="text" id="addTaskLabel" name="settings[addTaskLabel]" value="<?php echo $cl->settings->addTaskLabel ?>" placeholder="Add checkable item">
					</p>
					<p class="field">
						<label for="addTitleLabel" class="large">Add text label</label>
						<input type="text" id="addTitleLabel" name="settings[addTitleLabel]" value="<?php echo $cl->settings->addTitleLabel ?>" placeholder="Add text item">
					</p>
					<p><input type="checkbox" id="showTaskCharge"> <label for="showTaskCharge">Show task charge cells</label></p>
					<p><label for="showTaskCharge">Priority range: </label><input type="number" for="showTaskCharge" min="1"></p>
				</div>
				<button type="submit" name="saveSettings" class="i-check floatRight">Save</button>
				<?php
			} ?>
			</form>
		</div>
		<div class="pageWrapper">
			<button id="settings" class="i-gear" title="Settings"></button>
			<div class="page">
			<?php if (!$cl)
			{
				echo '<h1>Checklists</h1>';
				echo "<ul>";
				echo $clm->renderlistOfChecklists();		
				echo "<li><a href=\"?id=new\">Create new checklist</a></li>";
				echo "</ul>";
			}
			else
			{
				?><div id="tableWrapper">
					<table id="mainTable" cellspacing="0" cellpadding="0">
						<header><?php echo $cl->name.($cl->isArchive() ? ' archive' : '') ?> </header>
						<tr><th style="width:10px" class="noContent handle"></th>
							<?php
							// don't affect $headers with possible deletions made on $headersTmp
							$headersTmp = $cl->headers;

							foreach ($headersTmp as $cellNum => $cell)
							{
								// if colspan is defined, skip the following header cell by unsetting it
								if (isset($cell->colspan)) unset($headersTmp[$cellNum+1]);
								if (!isset($headersTmp[$cellNum])) continue;

								echo $th = '<th style="width:'.$cell->width.'"'.(isset($cell->colspan)? " colspan=\"$cell->colspan\"" : '').'>'.(isset($cell->icon)? "<span class=\"$cell->icon\" data-icon=\"$cell->icon\"></span><br />" : '').$cell->text.'</th>';
							} ?>
						</tr>
						<?php echo $cl->renderTableRows($cl->headers, $cl->isArchive() ? $cl->archivedRows : $cl->rows).$cl->renderTableRows($cl->headers, $cl->rows, 3); ?>
					</table>
					<div class="buttons">
						<div class="left">
							<button id="toggleAll" class="i-eye-close" title="Hide selected rows"> Hide all</button>
							<a href="<?php echo SELF.'?id='.$cl->id.($cl->isArchive() ? '' : '&archive=1'); ?>" class="i-<?php echo $cl->isArchive()? 'return-left' : 'redo' ?>"> See <?php echo $cl->isArchive()? 'current' : 'archived' ?> TODO</a>
						</div>
						<div class="center">
							<button id="newRow" class="i-plus"> Add a row</button>
						</div>
						<div class="right">
							<button id="save" class="i-valid"> Save</button>
						</div>
						<br class="clear"/>
					</div>
				</div>
				<a href="<?php echo SELF ?>" class="i-<?php echo $cl->isArchive()? 'return-left' : 'redo' ?>"> See all checklists.</a><?php
			} ?>
			</div>
		</div>
	</div>
</body>
</html>