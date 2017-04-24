//======================= Dependencies =======================//
//=require jquery/dist/jquery.js
//============================================================//

//========================== READY ===========================//
var onReady = function()
{
    if (!$('pre').length) $('.code-wrapper').append("<pre contenteditable='true' data-type='txt' data-label='Text' data-active/>");
    initCodeEditors();
};
//============================================================//


//========================= FUNCTIONS ========================//
// Wrap any <pre> if no existing code-wrapper.
var wrapPre = function($pre)
{
    return $pre.wrap('<div class="code-wrapper ' + $pre.attr('class') + '"/>').parent();
};


/**
 *
 */
var initCodeEditors = function()
{
    var wrapperIndex = -1;

    // Loop through all the <pre> tags, wrap them with a code-wrapper if not yet done and apply syntax highlighting.
    $('pre').each(function(i)
    {
        var $pre        = $(this),
            $wrapper    = $pre.parents('.code-wrapper').length ? $pre.parents('.code-wrapper') : wrapPre($pre),
            preIndex    = $pre.prevAll('pre').length,// Index of that pre relative to its wrapper.
            numberOfPre = $wrapper.find('pre').length,// Number of code editors in the same code-wrapper.
            html        = this.innerHTML || '';

        // If first pre of code-wrapper.
        if (preIndex === 0)
        {
            $wrapper.attr('data-index', wrapperIndex++);
            // Add a button to add a new code editor.
            $wrapper.append('<label class="add" data-increment="' + numberOfPre + '">+</label>');
        }

        if ($pre.is('[contenteditable="true"]')) new codeEditor(this);
    });
};


/**
 * Syntax highlighter Class for JS, CSS, HTML, PHP and SQL languages.
 * Purpose is to parse content in given <pre> tag that has a known language (e.g.  data-type="html", css, js, etc.)
 * and colorize the words, ponctuation, etc.
 *
 * @param {DOM object} editor The given wrapper to transform to a code editor with syntax hilighting.
 * @param {object} options The settings to apply on the code editor.
 * @return void.
 */
var codeEditor = function(editor, options)
{
    // Static vars.
    codeEditor.knownLanguages = codeEditor.knownLanguages || ['js', 'css', 'php', 'html', 'sql'];
    codeEditor.ready = codeEditor.ready || false;
    codeEditor.uid = codeEditor.uid + 1 || 1;

    var self = this;
    // Public vars.
    self.options   = $.extend({cssColors: true}, options);
    self.editor    = editor instanceof jQuery ? editor[0] : editor;
    self.$editor   = $(self.editor);
    self.$wrapper  = self.$editor.parent();
    self.uid       = codeEditor.uid;
    self.language  = null;// Set in self.init().
    self.caretInfo = null;

    // Private vars.
    var inProgress      = false,// Debounce.
        debounceTimerId = null,
        isLanguageKnown = function(language){return self.language && codeEditor.knownLanguages.indexOf(self.language) > -1;},
        languageIsKnown = false;// Set in self.init().

    self.updateLanguage = function()
    {
        self.language   = self.$editor.attr('data-type');
        languageIsKnown = isLanguageKnown(self.language);
    };

    /**
     * Add a tab system to navigate through each code editor.
     *
     * @param {object} target   The current code editor <pre>.
     * @param {object} wrapper  The container in which to create the tabs system.
     * @return void.
     */
    var addTab = function($target, $wrapper, uid, edit)
    {
        var targetTag    = $target[0].tagName.toLowerCase(),
            type         = $target.data('type'),
            label        = $target.data('label'),
            checked      = $target.data('active') !== undefined ? '  checked' : '',
            $wrapper     = $wrapper || $target.parent(),
            wrapperIndex = $wrapper.data('index'),
            langHtml     = '',
            languages    = {txt: 'plain text', js: 'javascript', css: 'css', html: 'html', php: 'php'},
            i            = 0;

        $target.attr('data-uid', uid);

        for (var l in languages)
        {
            i++;
            langHtml += '<input type="radio" name="language' + uid + '" id="language' + uid + i
                    + '" class="hidden" value="' + l + '"' + (type === l || (!type && l === 'txt') ? ' checked' : '') + '>'
                    + '<label for="language' + uid + i + '">' + languages[l] + '</label> ';
        }

        $target
            .before(
                '<input type="radio" data-type="' + type + '" id="' + targetTag + uid + '"' + checked
                + ' name="codeWrapper' + wrapperIndex + '">' + '<label for="' + targetTag + uid
                + '" data-uid="' + uid + '"><span contenteditable class="code-label">' + (label ? label : type) + '</span>'
                + '<span class="languages"><strong>Languages:</strong>'
                + langHtml
                + '</span></label>');

        if (edit)
        {
            $('#' + targetTag + uid).click()
                .siblings('label').find('.code-label').focus().select();
        }
    };

    /**
     *
     */
    self.debounceColorizing = function()
    {
        clearTimeout(debounceTimerId);
        debounceTimerId = null;

        if (!inProgress)
        {
            inProgress = true;

            // First check if carret is in the code editor and if so capture its position.
            self.caretInfo = getCaretInfo(self.editor);
            // console.log(self.caretInfo);

            // DO the syntax hilighting of the content placed in the active code editor.
            self.colorizePreContent();

            // Move caret to correct position after changing the code editor content.
            // Don't try to place carret if selection is outside the code editor.
            if (self.caretInfo) self.setCaret();

            setTimeout(function(){inProgress = false;}, 100);
        }
        else debounceTimerId = setTimeout(function(){self.debounceColorizing()}, 200);
    };

    self.colorizeText = function(text)
    {
        var string = self.editor.innerHTML
                        .replace(/<br>/g, '\n')// Convert <br> tag from pressing 'enter' to a linebreak.
                        .stripTags()
                        .unhtmlize()
                        /*.replace(/&amp;/g, '&')*/;

        if (self.language === 'javascript') self.language = 'js';// Alias.
        if (isLanguageKnown(self.language))
        {
            var regexBasics =
                {
                    quote:       /("(?:\\"|[^"])*")|('(?:\\'|[^'])*')/,// Match simple and double quotes by pair.
                    comment:     /(\/\/.*|\/\*[\s\S]*?\*\/)/,// Comments blocks (/* ... */) or trailing comments (// ...).
                    htmlTag:     /(<[^>]*>)/,
                    ponctuation: /(!==?|(?:[\[\](){}.:;,+\-?=]|&lt;|&gt;)+|&&|\|\|)/,// Ponctuation not in html tag.
                },
                dictionnary =
                {
                    html:
                    {
                        quote:       regexBasics.quote,
                        comment:     /(&lt;!--[\s\S]*?--&gt;)/,
                        tag:         /(&lt;\/?)([a-z]\w*)(.*?)(\/?&gt;)/,
                        // Treated inside tag because javascript does not support lookbehind,
                        // so be more specific inside tag first match:
                        // ponctuation: /([=/]+|&lt;\/?|\/?&gt;)/,
                        // tagName: /([a-z]\w+)\b/,
                        // attribute:   /([a-zA-Z\-]+)(?=\s*(?:=|\/?&gt;))/,
                    },
                    css:
                    {
                        quote:       regexBasics.quote,
                        comment:     /(\/\*[\s\S]*?\*\/)/,
                        pseudo:      /(:(?:hover|active|focus|visited|before|after|(?:first|last|nth)-child))/,
                        "selector keyword vendor":  /(@-(?:moz|o|webkit|ms)-(?=keyframes\s))/,
                        "selector keyword":  /((?:@(?:import|media|font-face|keyframes)|screen|print|and)(?=[\s({])|keyframes|\s(?:ul|ol|li|table|div|pre|p|a|img|br|hr|h[1-6]|em|strong|span|html|body|iframe|video|audio|input|button|form|label|fieldset|small|abbr|i|dd|dt)\b)/,
                        selector:    /((?:[.#-\w\*+ >:,~\n]|&gt;)+)(?=\s*\{)/,// Any part before '{'.
                        "attribute keyword vendor": /(-(?:moz|o|webkit|ms)-(?=transform|transition|user-select|animation|background-size))/,
                        "attribute keyword": /\b(content|float|display|position|top|left|right|bottom|(?:(?:max|min)-)?width|(?:(?:max|min|line)-)?height|font(?:-(?:family|style|size|weight|variant|stretch))?|vertical-align|color|opacity|visibility|z-index|transform|transition|animation|background(?:-(?:color|position|image|repeat|size))?|(?:padding|margin|border)(?:-(?:top|left|right|bottom))?|border(?:-radius)|white-space|text-(?:align|transform|decoration|shadow)|overflow(?:-(?:x|y))?|letter-spacing|box-(?:sizing|shadow)|stroke|outline|user-select)(?=\s*:)/,
                        "value keyword vendor": /(-(?:moz|o|webkit|ms)-(?=linear-gradient))/,
                        "value keyword":     /\b(inline-block|inline|block|absolute|relative|static|fixed|inherit|none|auto|hidden|visible|top|left|right|bottom|center|pre|wrap|nowrap|(?:upper|lower)case|capitalize|linear(?:-gradient)|ease(?:-in)?(?:-out)?|all|infinite|cubic-bezier|(?:no-)?repeat|repeat(?:-x|-y)|contain|cover|!important|url|inset)(?=\s*[,;}(]|\s+[\da-z])/,
                        number:      /(-?(?:\.\d+|\d+(?:\.\d+)?))/,
                        color:       /(transparent|#(?:[\da-f]{6}|[\da-f]{3})|rgba?\([\d., ]*\))/,
                        // ponctuation: /([:,;{}@#()]+)/,// @todo Why can't use this one if text contains '<' or '>' ??
                        htmlentity: /(&.*?;)/,
                        ponctuation: /([:,;{}@#()]+|&lt;|&gt;)/,
                        attribute:   /([a-zA-Z\-]+)(?=\s*:)/,
                        unit:        /(px|%|r?em|m?s|deg)(?=(?:\s*[;,{}}]|\s+[\-\da-z#]))/
                    },
                    js:
                    {
                        quote:       regexBasics.quote,
                        comment:     regexBasics.comment,
                        // htmlTag:     regexBasics.htmlTag,
                        number:      /\b(\d+(?:\.\d+)?|null)\b/,
                        boolean:     /\b(true|false)\b/,
                        keyword:     /\b(new|getElementsBy(?:Tag|Class|)Name|getElementById|arguments|if|else|do|return|case|default|function|typeof|undefined|instanceof|this|document|window|while|for|switch|in|break|continue|length|var|(?:clear|set)(?:Timeout|Interval)|Math(?=\.))(?=\W)/,
                        ponctuation: /(!==?|(?:[\[\](){}:;,+\-%*\/?=]|&lt;|&gt;)+|\.+(?![a-zA-Z])|&amp;&amp;|\|\|)/,// Override default since '.' can be part of js variable.
                        variable:    /(\.?[a-zA-Z]\w*)/,
                        htmlentity: /(&.*?;)/,
                        dollar:      /(\$|jQuery)(?=\W|$)/,// jQuery or $.
                    },
                    php:
                    {
                        quote:       regexBasics.quote,
                        comment:     regexBasics.comment,
                        ponctuation: regexBasics.ponctuation,
                        number:      /\b(\d+(?:\.\d+)?|null)\b/,
                        boolean:     /\b(true|false)\b/,
                        keyword:     /\b(define|echo|die|print_r|var_dump|if|else|do|return|case|default|function|\$this|while|for|switch|in|break|continue)(?=\W|$)/,
                        variable:    /(?:(?=\W))(\$\w+)/
                    },
                    sql:
                    {
                        quote:       regexBasics.quote,
                        comment:     regexBasics.comment,
                        ponctuation: regexBasics.ponctuation,
                        number:      /\b(\d+(?:\.\d+)?|null)\b/,
                        boolean:     /\b(true|false)\b/,
                        keyword:     /\b(\*|CREATE|ALL|DATABASE|TABLE|GRANT|PRIVILEGES|IDENTIFIED|FLUSH|SELECT|UPDATE|DELETE|INSERT|FROM|WHERE|(?:ORDER|GROUP) BY|LIMIT|(?:(?:LEFT|RIGHT|INNER|OUTER) |)JOIN|AS|ON|COUNT|CASE|TO|IF|WHEN|BETWEEN|AND|OR|CONCAT)(?=\W|$)/
                    }
                },
                classMap = [],
                regexPattern = '';


            for (var Class in dictionnary[self.language])
            {
                classMap.push(Class);
                if (Class === 'quote') classMap.push(Class);// Add twice cause 2 captures in quote regexp.
                if (self.language === 'html' && Class === 'tag') classMap.push(Class, Class, Class);

                regexPattern += (regexPattern ? '|' : '') + dictionnary[self.language][Class].source;
            }

            string = string.replace(new RegExp(regexPattern, 'g'), function()
            {
                var match, Class,
                    // "arguments.length - 2" because the function is called with arguments like so:
                    // function(strMatch, c1, c2, ..., cn, matchOffset, sourceString){}. With c = the captures.
                    dictionnaryMatches = Array.prototype.slice.call(arguments, 1, arguments.length - 2);

                for (var i = 0; i < dictionnaryMatches.length; i++)
                {
                    if (dictionnaryMatches[i])
                    {
                        match = dictionnaryMatches[i];
                        Class = classMap[i];

                        break;
                    }
                }

                if (Class === 'quote')   match = (arguments[1] || arguments[2]).unhtmlize().stripTags();
                if (Class === 'comment') match = match.unhtmlize().stripTags();
                if (Class === 'tag' && self.language === 'html')
                {
                    var tagPieces = dictionnaryMatches.slice(3);

                    return '<span class="ponctuation">' + tagPieces[0] + '</span>'
                            + '<span class="tag-name">' + tagPieces[1] + '</span>'
                            + (tagPieces[2]||'').replace(/\s*([a-z]\w+)=("|')(.*?)\2/g, function()
                            {
                                return ' <span class="attribute">' + arguments[1] + '</span><span class="ponctuation">=</span>'
                                        + '<span class="quote">' + arguments[2] + arguments[3] + arguments[2] + '</span>'
                            })
                            + '<span class="ponctuation">' + tagPieces[3] + '</span>';
                }
                if (Class === 'color' && self.language === 'css' && self.options.cssColors)
                {
                    var styles = ' style="background-color:' + match + ';color: #' + (isColorDark(match) ? 'fff' : '000') + '"';
                }
                if (Class === 'variable' && match[0] === '.' && self.language === 'js')
                {
                    /**
                     * @todo don't apply variable color if char before '.' is not '\w'.
                     */
                    return '<span class="ponctuation">.</span><span class="objAttr">' + match.substr(1) + '</span>';
                }

                return '<span class="' + Class + '"' + (styles !== undefined ? styles : '') + '>' + match + '</span>';
            });
        }

        return string;
    };

    self.colorizePreContent = function()
    {
        self.editor.innerHTML = self.colorizeText();

        // Make sure each piece of text is wrap in an html tag for the selection detection to work flowlessly.
        $.each(self.editor.childNodes, function(){if (this.nodeType === 3) $(this).wrap('<span/>')});
    };

    self.refresh = function()
    {
        // When switching language, reinit the content to plain text (remove syntax highlight html) with
        // (self.editor.innerText || self.editor.textContent), then unhtmlize to convert '<' and '>' to htmlentities.
        self.editor.innerHTML = (self.editor.innerText || self.editor.textContent).unhtmlize();

        self.updateLanguage();
        if (languageIsKnown) self.debounceColorizing();
    };

    /**
     * Now that the editor content has been syntax highlighted, the html changed and the caret position got lost.
     * So find the caret by comparing the pure text strings before and after syntax highlight by looping through
     * each tag until the caret is found.
     */
    self.setCaret = function()
    {
        var newTextBefore = '',
            nodeIndex     = -1,
            currentNodeText, newCaretOffset, range, sel, textNode;

        // console.log(self.caretInfo)
        // debugger;
        while (newTextBefore < self.caretInfo.plainTextBefore)
        {
            nodeIndex++;
            newTextBefore += self.editor.childNodes[nodeIndex].innerHTML.htmlize();
        }
        if (nodeIndex < 0) nodeIndex = 0;

        // NodeIndex should never be -1 here. If it is the function is called whereas it should not be.
        currentNodeText = self.editor.childNodes[nodeIndex].innerHTML.htmlize();
        newCaretOffset  = currentNodeText.length - (newTextBefore.length - self.caretInfo.plainTextBefore.length);

        // Place the cursor.
        range = document.createRange();
        sel = window.getSelection();
        textNode = self.editor.childNodes[nodeIndex].firstChild;
        range.setStart(textNode, Math.min(newCaretOffset, textNode.length));
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);

        self.editor.focus();
    };

    self.bindInstanceEvents = function()
    {
        self.$editor
            //.on('mouseup', function(e){console.log(getCaretInfo(self.editor));})
            // IE9-
            /*.on('keyup keypress', function(e)
            {
                var cond = e.type === 'keyup' ?
                        (e.which === 8 || e.which === 13)// 8 = <backspace>, 13 = <enter>.
                        : (String.fromCharCode(e.charCode));// Only trigger recolorizing if the key prints something.
                console.log(e.type, e.which);

                if (cond) self.debounceColorizing();
            });*/
            // IE 10+
            .on('input', function(e)
            {
                if (languageIsKnown) self.debounceColorizing();
            })
            .on('refresh', function(){self.refresh();})
            .on('paste', function(e)
            {
                var clipboardData, pastedData;

                // Stop data actually being pasted into div.
                // e.stopPropagation();
                // e.preventDefault();
                console.log(e)

                // Get pasted data via clipboard API.
                clipboardData = e.originalEvent.clipboardData || window.clipboardData;
                pastedData = clipboardData.getData('Text');

                // Do whatever with pasted data.
                // alert('Paste not developed yet :)\n\n\n' + pastedData);
            });
    };

    codeEditor.init = function()
    {
        codeEditor.ready = true;

        $('.code-wrapper .add').on('click', function()
        {
            var $newPre  = $('<pre class="i-code" contenteditable="true" data-type="txt" data-label="Label"/>');

            $(this).siblings('pre:last').after($newPre);

            // Init a new code editor on the new created tab.
            new codeEditor($newPre, {new: true});
        });

        // On saving edits.
        // For each pre get the code, label and type and send them to the php script for saving into JSON.
        $('.code-form').on('submit', function(e)
        {
            e.preventDefault();
            var codes = [];

            $('pre').each(function(i)
            {
                codes.push(
                {
                    label: $(this).attr('data-label'),
                    language: $(this).attr('data-type'),
                    code: this.innerHTML.stripTags().htmlize()
                });
            });
            $.post(location, 'codes=' + JSON.stringify(codes));

            return false;
        })
        // On modify label of current editor.
        // Update matching <pre> data-label attribute.
        .on('input', '.code-label', function(e)
        {
            var uid  = $(this).parents('label').data('uid');

            $('pre[data-uid=' + uid + ']').attr('data-label', this.innerHTML);
        })
        // On changing the language of current editor (select in dropdown list).
        .on('change', '.languages input', function(e)
        {
            var uid  = $(this).parents('label').data('uid');

            $('pre[data-uid=' + uid + ']')
                .attr('data-type', this.value)
                .trigger('refresh');
        });
    };

    var init = function()
    {
        // Create the tab system.
        addTab(self.$editor, self.$wrapper, self.uid, self.options.hasOwnProperty('new'));

        self.updateLanguage();

        // Apply syntax highlighting if there is content in the <pre>.
        if (self.editor.innerHTML && languageIsKnown) self.colorizePreContent();

        if (!codeEditor.ready) codeEditor.init();
        self.bindInstanceEvents();
    }();
};





/**
 * Get the index of a node relative to a collection of siblings.
 * Faster than jQuery's function.
 *
 * @param {object} node
 * @return {integer} the node index.
 */
function getIndex(node)
{
    var n = 0;
    while (node = node.previousSibling) n++;

    return n;
}


function getCaretInfo(element)
{
    //=============== Get the selection ===============//
    var caretOffset = 0,
        sel = window.getSelection ? window.getSelection() : document.selection;

    var selectionNode   = sel.baseNode ? (sel.baseNode.parentNode !== element ? sel.baseNode.parentNode : sel.baseNode) : null,
        nodeIndex       = selectionNode ? getIndex(selectionNode) : 0,
        nodeText        = sel.baseNode ? sel.baseNode.textContent : '',
        plainTextBefore = '';

    // Don't calculate the caret position if there is no selection or if selected node is outside the element.
    // When inputting content in empty editor the selection node will be the editor itself.
    if (!selectionNode || (!$(element).find(selectionNode).length && !$(element).is(selectionNode))) return null;

    if (window.getSelection && sel.rangeCount > 0)
    {
        var range = sel.getRangeAt(0),
            preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        caretOffset = preCaretRange.toString().length;
    }
    else if (sel.type != "Control")
    {
        var textRange = sel.createRange(),
            preCaretTextRange = document.body.createTextRange();
        preCaretTextRange.moveToElementText(element);
        preCaretTextRange.setEndPoint("EndToEnd", textRange);
        caretOffset = preCaretTextRange.text.length;
    }
    //=================================================//

    // Get all the plain text from start until the caret - no html tags: they are stripped once after the loop.
    // First loop through all the nodes until reaching the caret selection node.
    // console.log('selection node:', selectionNode, nodeIndex, nodeText)
    for (var i = 0; i < nodeIndex; i++)
    {
        if (element.childNodes[i]) plainTextBefore += element.childNodes[i][element.childNodes[i].nodeType === 3 ? 'nodeValue' : 'innerHTML'];
        else break;
    }

    // Once the node of the selection caret is reached, add the text before caret to the total text before caret var.
    var nodeTextBeforeCaret = element.childNodes[nodeIndex] && element.childNodes[nodeIndex].innerHTML ?
                              element.childNodes[nodeIndex].innerHTML.htmlize().substr(0, sel.anchorOffset) : '';

    // And htmlize to convert htmlentities to a single character.
    // ! \ This is very important for placing the caret at the right position after syntax highlighting.
    plainTextBefore = plainTextBefore.stripTags().htmlize() + nodeTextBeforeCaret;

    return {
        posInNode: Math.max(sel.anchorOffset, sel.focusOffset),// select range from left or right keep the end of range.
        posInFullPlainText: caretOffset,
        node: selectionNode,
        nodeIndex: nodeIndex,
        nodeText: nodeText,
        // nodeTextBefore: nodeText.substr(0, Math.max(sel.anchorOffset, sel.focusOffset)),
        plainTextBefore: plainTextBefore,
        // selectedText: .substr(caretOffset, Math.max(sel.anchorOffset, sel.focusOffset));
    };
};


var isColorDark = function(colorString)
{
    var rgbColor, hexColor, rDark, gDark, bDark;

    if (rgbColor = colorString.match(/rgba?\((.*),\s*(.*),\s*(.*)[^)]*\)/))
    {
        rDark = parseInt(rgbColor[1]) <= 100;
        gDark = parseInt(rgbColor[2]) <= 100;
        bDark = parseInt(rgbColor[3]) <= 100;
    }
    else if (hexColor = colorString.match(/#([\da-f]{3}(?:[\da-f]{3})?)/))
    {
        var has3chars = hexColor[1].length === 3;
        rDark = parseInt(hexColor[1][0]) <= 9;
        gDark = parseInt(hexColor[1][has3chars ? 1 : 2]) <= 9;
        bDark = parseInt(hexColor[1][has3chars ? 2 : 4]) <= 9;
    }

    // #00f blue is also a dark color...
    return (rDark && gDark && bDark) || (rDark && gDark && !bDark) || (!rDark && gDark && bDark);
};


String.prototype.stripTags = function()
{
    return this.replace(/<\/?\w+[^>]*\/?>/g, '');
};


/**
 * Re-htmlize a string. So replace every '&lt;' and '&gt;' with '<' and '>'.
 *
 * @return string: html content.
 */
String.prototype.htmlize = function()
{
    return this.replace(/&(lt|gt|amp);/g, function(m0, m1){return {lt: '<', gt: '>', amp: '&'}[m1]});
};


String.prototype.unhtmlize = function()
{
    return this.replace(/[<>]/g, function(m){return {'<': '&lt;', '>': '&gt;'}[m]})
};
//============================================================//


//=========================== MAIN ===========================//
//=require inc.main.js
//============================================================//