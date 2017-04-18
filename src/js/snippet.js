//======================= Dependencies =======================//
//=require jquery/dist/jquery.js
//============================================================//

//========================== READY ===========================//
var onReady = function()
{
    if ($('pre').length) initCodeEditors();
};
//============================================================//


//========================= FUNCTIONS ========================//
// Wrap any <pre> if no existing code-wrapper.
var wrapPre = function($pre)
{
    return $pre.wrap('<div class="code-wrapper ' + $pre.attr('class') + '"/>').parent();
};

/**
 * Add a tab system to navigate through each code editor.
 *
 * @param {object} target   The current code editor <pre>.
 * @param {object} wrapper  The container in which to create the tabs system.
 * @return void.
 */
var addTab = function($target, $wrapper)
{
    var targetTag    = $target[0].tagName.toLowerCase(),
        type         = $target.data('type'),
        label        = $target.data('label'),
        preUniqueId  = $target.data('uid'),
        checked      = $target.data('active') !== undefined ? '  checked' : '',
        $wrapper     = $wrapper || $target.parent(),
        wrapperIndex = $wrapper.data('index'),
        langHtml     = '',
        languages    = {txt: 'plain text', js: 'javascript', css: 'css', html: 'html', php: 'php'},
        i            = 0;

    for (var l in languages)
    {
        i++;
        langHtml += '<input type="radio" name="language' + preUniqueId + '" id="language' + preUniqueId + i
                  + '" class="hidden" value="' + l + '"' + (type === l || (!type && l === 'txt') ? ' checked' : '') + '>'
                  + '<label for="language' + preUniqueId + i + '">' + languages[l] + '</label> ';
    }

    $target
        .before(
            '<input type="radio" data-type="' + type + '" id="' + targetTag + preUniqueId + '"' + checked
            + ' name="codeWrapper' + wrapperIndex + '">' + '<label for="' + targetTag + preUniqueId
            + '" data-uid="' + preUniqueId + '"><span contenteditable class="code-label">' + (label ? label : type) + '</span>'
            + '<span class="languages"><strong>Languages:</strong>'
            + langHtml
            + '</span></label>');
};

/**
 * Home made simple syntax highlighter for JS, CSS and HTML.
 * Just cz it's fun to do. :)
 * Will parse content in every <pre> tag that has a known data-type (so html, css, js only)
 * to wrap chars and words with spans.
 *
 * @return void.
 */
var initCodeEditors = function()
{
    var wrapperIndex = -1,
        preUniqueId  = 0;

    // Loop through all the <pre> tags, wrap them with a code-wrapper if not yet done and apply syntax highlighting.
    $('pre').each(function(i)
    {
        var $pre        = $(this).attr('data-uid', ++preUniqueId),
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

        // Create the tab system.
        addTab($pre, $wrapper);

        // If last pre of code-wrapper.
        /*if (preIndex === numberOfPre - 1)
        {
            // If the attribute 'data-result' is present on .code-wrapper then run the given html + css + js in an iframe.
            if ($wrapper.data('result'))
            {
                var html     = ($wrapper.find('pre[data-type="html"]').html() ||'').stripTags().htmlize(),
                    js       = ($wrapper.find('pre[data-type="js"]').html()   ||'').stripTags(),
                    css      = ($wrapper.find('pre[data-type="css"]').html()  ||'').htmlize().stripTags(),
                    contents = '<html><head><link rel="stylesheet" type="text/css" href="../../grid/css/grid.css">'
                             + '<script src="../bower_components/jquery/dist/jquery.min.js"></script>'
                             + '<script src="../bower_components/jquery.easing/js/jquery.easing.min.js"></script>'
                             + '<script src="../../grid/js/grid.js"></script>'
                             + '<style>' + css + '</style></head><body>'
                             + html
                             + '<script>' + js + '</script>'
                             + '</body></html>',
                    $iframe  = $wrapper.append('<iframe data-type="result"></iframe>').find('iframe');
                $iframe[0].contentDocument.write(contents);

                addTab($iframe, preIndex + 'i', $wrapper);
            }
        }*/

        if ($pre.is('[contenteditable="true"]')) new codeEditor(this);
    });

    $('.code-wrapper .add').on('click', function()
    {
        var $wrapper = $(this).parent(),
            $newPre  = $('<pre class="i-code" contenteditable="true" data-type="txt" data-label="Label" data-uid="' + (++preUniqueId) + '"/>');

        $(this).siblings('pre:last').after($newPre);

        addTab($newPre, $wrapper);

        $newPre.trigger('click').trigger('focus');
    });


    // On saving edits.
    // For each pre get the code, label and type and send them to the php script for saving into JSON.
    $('.code-form').on('submit', function(e)
    {
        e.preventDefault();
        var codes = [];

        $('pre').each(function(i)
        {
            codes.push({label: $(this).attr('data-label'), language: $(this).attr('data-type'), code: this.innerHTML.stripTags()});
        });
        $.post(location, 'codes=' + JSON.stringify(codes));

        return false;
    })
    // On modify label of current editor.
    // Update matching <pre> data-label attribute.
    .on('input', '.code-label', function(e)
    {
        var preUniqueId  = $(this).parents('label').data('uid');
        $('pre[data-uid=' + preUniqueId + ']').attr('data-label', this.innerHTML);
    })
    // On changing the language of current editor (select in dropdown list).
    .on('change', '.languages input', function(e)
    {
        var newLanguage = this.value,
            tabToggler  = $('input#' + $(this).parents('label').attr('for')),
            oldLanguage = tabToggler.attr('data-type'),
            matchingPre = $('pre[data-type=' + oldLanguage + ']');

        matchingPre.add(tabToggler).attr('data-type', newLanguage);
        matchingPre.trigger('refresh');
    });
};


/**
 * Class.
 *
 * @param {DOM Object} editor
 */
var codeEditor = function(editor, params)
{
    var self = this;
    self.params    = $.extend({cssColors: true}, params);
    self.editor    = editor instanceof jQuery ? editor[0] : editor;
    self.$editor   = $(self.editor);
    self.language  = null;// Set in self.init().
    self.caretInfo = null;

    var inProgress      = false,// Debounce.
        debounceTimerId = null,
        knownLanguages  = ['js', 'javascript', 'css', 'php', 'html', 'sql'],
        isLanguageKnown = function(language){return self.language && knownLanguages.indexOf(self.language) > -1;}
        languageIsKnown = false,// Set in self.init().
        updateLanguage  = function()
        {
            self.language   = self.$editor.attr('data-type');
            languageIsKnown = isLanguageKnown(self.language);
        },
        bindEvents = function()
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

                    if (cond) debounceColorizing(self);
                });*/
                // IE 10+
                .on('input', function(e)
                {
                    if (languageIsKnown) debounceColorizing(self);
                })
                .on('refresh', function(){self.refresh();})
                .on('paste', function(e)
                {
                    var clipboardData, pastedData;

                    // Stop data actually being pasted into div.
                    e.stopPropagation();
                    e.preventDefault();
                    console.log(e)

                    // Get pasted data via clipboard API.
                    clipboardData = e.originalEvent.clipboardData || window.clipboardData;
                    pastedData = clipboardData.getData('Text');

                    // Do whatever with pasted data.
                    alert('Paste not developed yet :)\n\n\n' + pastedData);
                });
        },
        //!\ Takes 'self' as parameter because by declaring the debounceColorizing() function as a var (private) and not in self,
        // the method will be overwritten by each following instance and the 'self' inside that function would be the last occurance of them.
        // Another solution is to declare debounceColorizing in self, but doing will allow external use like a public method.
        // Third option is to use prototype... @todo: try that.
        debounceColorizing = function(self)
        {
            clearTimeout(debounceTimerId);
            debounceTimerId = null;

            if (!inProgress)
            {
                inProgress = true;

                self.caretInfo = getCaretInfo(self.editor);
                // console.log(self.caretInfo);
                self.colorizePreContent();
                if (self.caretInfo) self.setCaret();

                setTimeout(function(){inProgress = false;}, 100);
            }
            else debounceTimerId = setTimeout(function(){debounceColorizing(self)}, 200);
        };

    self.colorizeText = function(text)
    {
        var string = self.editor.innerHTML.replace(/<br>/g, '\n').stripTags().replace(/&amp;/g, '&');

        // console.group('Colorizing');
        // console.count('colorize');
        // console.log(self.editor.innerHTML)
        switch (self.language)
        {
            // case 'html':
            //     string = string.replace(/&lt;(\/?)(\w+) ?(.*?)&gt;/mg, function()
            //     {
            //         var attributes = '';

            //         if (arguments[3])
            //         {
            //             var attrs = arguments[3].split(' ');
            //             for (var i = 0, l = attrs.length; i < l; i++)
            //             {
            //                 attributes += ' ' + attrs[i].replace(
            //                     /((?:\w|-)+)=('|"|)(.*?)\2/,
            //                     '<span class="attribute">$1</span>'
            //                     + '<span class="ponctuation">=</span>'
            //                     + '<span class="quote">"$3"</span>');
            //             }
            //         }

            //         return '<span class="ponctuation">&lt;' + arguments[1] + '</span>'
            //                + '<span class="tag">' + arguments[2] + '</span>'
            //                + attributes + '<span class="ponctuation">&gt;</span>';
            //     });
            // break;
            case 'sql':
                string = string.replace(
                         /\b(\*|CREATE|ALL|DATABASE|TABLE|GRANT|PRIVILEGES|IDENTIFIED|FLUSH|SELECT|UPDATE|DELETE|INSERT|FROM|WHERE|(?:ORDER|GROUP) BY|LIMIT|(?:(?:LEFT|RIGHT|INNER|OUTER) |)JOIN|AS|ON|COUNT|CASE|TO|IF|WHEN|BETWEEN|AND|OR|CONCAT)(?=\W)/ig, function()
                         {
                            return '<span class="keyword">' + arguments[1].toUpperCase() + '</span>';
                         });
            break;
            case 'javascript':// Alias.
                self.language = 'js';
            case 'css':
            case 'php':
            case 'js':
                var regexBasics =
                    {
                        quote:      /("(?:\\"|[^"])*")|('(?:\\'|[^'])*')/,// Match simple and double quotes by pair.
                        comment:    /(\/\/.*|\/\*[\s\S]*?\*\/)/,// Comments blocks (/* ... */) or trailing comments (// ...).
                        htmlTag:    /(<[^>]*>)/,
                        ponctuation: /(!==?|(?:[\[\](){}.:;,+\-?=]|&lt;|&gt;)+|&&|\|\|)/,// Ponctuation not in html tag.
                    },
                    dictionnary =
                    {
                        html:
                        {
                            quote:       regexBasics.quote,
                            comment:     /(<!--[\s\S]*?-->)/,
                            tag:         /(\d)\s+/,
                            ponctuation: /([=/<>]+)/,
                            attribute:   /([a-zA-Z\-]+)(?=\s*(?:=|\/?>))/,
                        },
                        css:
                        {
                            quote:       regexBasics.quote,
                            comment:     regexBasics.comment,
                            selector:    /(?:^|\b)((?:[.#-\w\*+ >:,]|&gt;)+)(?=\s*\{)/,// Any part before '{'.
                            "keyword selector":  /(@(?:import|media|font-face|keyframe)|screen|print|and)(?=[\s({])/,
                            "keyword attribute": /(content|float|display|position|top|left|right|bottom|(?:(?:max|min)-)?width|(?:(?:max|min|line)-)?height|font(?:-(?:family|style|size|weight|variant|stretch))?|vertical-align|color|opacity|visibility|transform|transition|animation|background(?:-(?:color|position|image|repeat|size))?|(?:padding|margin|border)(?:-(?:top|left|right|bottom))?|border(?:-radius)|white-space|text-(?:align|transform|decoration|shadow)|overflow(?:-(?:x|y))?|letter-spacing|box-(?:sizing|shadow))(?=\s*:)/,
                            "keyword value":     /(inline-block|inline|block|absolute|relative|static|fixed|inherit|none|auto|hidden|visible|top|left|right|bottom|center|pre|wrap|nowrap|(?:upper|lower)case|capitalize|linear|ease(?:-in)?(?:-out)?|cubic-bezier|(?:no-)?repeat|repeat(?:-x|-y)|contain|cover)(?=\s*[,;}(])/,
                            number:      /(-?(?:\.\d+|\d+(?:\.\d+)?))/,
                            color:       /(transparent|#(?:[\da-f]{6}|[\da-f]{3})|rgba?\([\d., ]*\))/,
                            ponctuation: /([:,;{}@#()])/,
                            attribute:   /([a-zA-Z\-]+)(?=\s*:)/,
                            unit:        /(px|%|r?em|m?s)(?=(?:\s*[;,}]|\s+[\-\d#]))/
                        },
                        js:
                        {
                            quote:       regexBasics.quote,
                            comment:     regexBasics.comment,
                            // htmlTag:     regexBasics.htmlTag,
                            number:      /\b(\d+(?:\.\d+)?|null)\b/,
                            boolean:     /\b(true|false)\b/,
                            keyword:     /\b(new|getElementsBy(?:Tag|Class|)Name|getElementById|arguments|if|else|do|return|case|default|function|typeof|undefined|instanceof|this|document|window|while|for|switch|in|break|continue|length|var|(?:clear|set)(?:Timeout|Interval))(?=\W)/,
                            ponctuation: /(!==?|(?:[\[\](){}:;,+\-?=]|&lt;|&gt;)+|\.|\.+(?![a-zA-Z])|&&|\|\|)/,// Override for '.' part of variable/
                            variable:    /(\.?[a-zA-Z]\w*)/,
                            dollar:      /(\$|jQuery)(?=\W|$)/,// jQuery or $.
                        },
                        php:
                        {
                            quote:       regexBasics.quote,
                            comment:     regexBasics.comment,
                            // htmlTag:     regexBasics.htmlTag,
                            ponctuation: regexBasics.ponctuation,
                            number:      /\b(\d+(?:\.\d+)?|null)\b/,
                            boolean:     /\b(true|false)\b/,
                            keyword:     /\b(define|echo|die|print_r|var_dump|if|else|do|return|case|default|function|\$this|while|for|switch|in|break|continue)(?=\W|$)/,
                            variable:    /(?:(?=\W))(\$\w+)/
                        }
                    },
                    classMap = [],
                    regexPattern = '';


                for (var Class in dictionnary[self.language])
                {
                    classMap.push(Class);
                    if (Class === 'quote') classMap.push(Class);// Add twice cause 2 captures in quote regexp.

                    regexPattern += (regexPattern ? '|' : '') + dictionnary[self.language][Class].source;
                }


                string = string//.unhtmlize()
                        .replace(new RegExp(regexPattern, 'g'), function()
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
                            // console.log('default', match, Class, classMap, dictionnaryMatches, dictionnary[self.language])

                            if (Class === 'quote')   match = (arguments[1] || arguments[2]).unhtmlize().stripTags();
                            if (Class === 'comment') match = match.unhtmlize().stripTags();
                            if (Class === 'color' && self.language === 'css' && self.params.cssColors)
                            {
                                // var color = findColorOpposite(match);
                                var color = isColorDark(match) ? '#fff' : '#000';
                                var styles = ' style="background-color:' + match + ';color: ' + color + '"';
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
            break;
        }
        // console.log(string)
        // console.groupEnd();
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
        // Reinit the content to default version (no syntax highlight).
        // self.$editor.text(self.$editor.text());
        self.editor.innerHTML = self.editor.innerText || self.editor.textContent;

        updateLanguage();
        if (languageIsKnown) debounceColorizing();
    };

    /**
     * Now that the editor content has been syntax highlighted, the html changed and the caret position got lost.
     * So find the caret by comparing the pure text strings before and after syntax highlight by looping through
     * each tag until the caret is found.
     */
    self.setCaret = function()
    {
        var newTextBefore = '',
            nodeIndex     = 0,
            currentNodeText, newCaretOffset, range, sel, textNode;

        // console.log(nodeIndex, self.editor.childNodes.length, self.editor.childNodes[0], self.editor.childNodes[0].nodeType, self.editor.childNodes[nodeIndex], newTextBefore, self.caretInfo.plainTextBefore)
        while (newTextBefore < self.caretInfo.plainTextBefore)
        {
            newTextBefore += self.editor.childNodes[nodeIndex].innerHTML.htmlize();
            nodeIndex++;
        }
        nodeIndex--;
        if (nodeIndex < 0) nodeIndex = 0;

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

    var init = function()
    {
        updateLanguage();

        // Apply syntax highlighting if there is content in the <pre>.
        if (self.editor.innerHTML && languageIsKnown) self.colorizePreContent();

        bindEvents();
    }();
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

    var selectionNode   = sel.baseNode ? sel.baseNode.parentNode : null,
        nodeIndex       = selectionNode ? getIndex(selectionNode) : 0,
        nodeText        = sel.baseNode ? sel.baseNode.textContent : '',
        plainTextBefore = '';

    // Don't calculate the caret position if there is no selection or if selected node is outside the element
    if (!sel.baseNode || sel.baseNode === element || selectionNode === element) return null;

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
    for (var i = 0; i < nodeIndex; i++) plainTextBefore += element.childNodes[i].innerHTML;

    // Once the node of the selection caret is reached, add the text before caret to the total text before caret var.
    var nodeTextBeforeCaret = element.childNodes[nodeIndex] ?
                              element.childNodes[nodeIndex].innerHTML.htmlize().substr(0, sel.anchorOffset) : '';

    // And htmlize to convert htmlentities to a single character.
    // ! \ This is very important for placing the caret at the right position after syntax highlighting.
    plainTextBefore = plainTextBefore.stripTags().htmlize() + nodeTextBeforeCaret;

    return {
        posInNode: Math.max(sel.anchorOffset, sel.focusOffset),// select range from left or right keep the end of range.
        posInFullPlainText: caretOffset,
        // node: selectionNode,
        nodeIndex: nodeIndex,
        nodeText: nodeText,
        // nodeTextBefore: nodeText.substr(0, Math.max(sel.anchorOffset, sel.focusOffset)),
        plainTextBefore: plainTextBefore,
        // selectedText: .substr(caretOffset, Math.max(sel.anchorOffset, sel.focusOffset));
    };
};


/*var findColorOpposite = function(colorString)
{
    var rgbColor, hexColor, r, g, b, color;

    if (rgbColor = colorString.match(/rgba?\((.*),\s*(.*),\s*(.*)[^)]*\)/))
    {
        r = 255 - parseInt(rgbColor[1]);
        g = 255 - parseInt(rgbColor[2]);
        b = 255 - parseInt(rgbColor[3]);
        color = 'rgb(' + r + ',' + g + ',' + b + ')';
    }
    else if (hexColor = colorString.match(/#([\da-f]{3}(?:[\da-f]{3})?)/))
    {
        var hexMap = '0123456789abcdef'.split(''),
            newHex = '';

        for (var i = 0, l = hexColor[1].length; i < l; i++)
        {
            newHex += (hexMap[16 - (hexMap.indexOf(hexColor[1][i]) + 1)]);
        };
        color = '#' + newHex;
    }

    return color;
};*/


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
//============================================================//


//=========================== MAIN ===========================//
//=require inc.main.js
//============================================================//