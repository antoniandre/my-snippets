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

var addTab = function($target, targetIndex, $wrapper)
{
    var targetTag    = $target[0].tagName.toLowerCase(),
        type         = $target.data('type'),
        label        = $target.data('label'),
        checked      = $target.data('active') !== undefined ? '  checked' : '',
        $wrapper     = $wrapper || $target.parent(),
        wrapperIndex = $wrapper.data('index');

    $wrapper.find('label.add')
        .before(
            '<input type="radio" data-type="' + type + '" id="' + targetTag + targetIndex + '"' + checked
            + ' name="codeWrapper' + wrapperIndex + '">' + '<label for="' + targetTag + targetIndex
            + '"><span contenteditable class="code-label">' + (label ? label : type) + '</span>'
            + '<span class="languages">Languages:<br>'
            + '<label for="language' + targetIndex + '1">plain-text</label> '
            + '<input type="radio" name="language' + targetIndex + '" id="language' + targetIndex + '1" value="txt"><br>'
            + '<label for="language' + targetIndex + '2">js</label> '
            + '<input type="radio" name="language' + targetIndex + '" id="language' + targetIndex + '2" value="js"><br>'
            + '<label for="language' + targetIndex + '3">css</label> '
            + '<input type="radio" name="language' + targetIndex + '" id="language' + targetIndex + '3" value="css"><br>'
            + '<label for="language' + targetIndex + '4">html</label> '
            + '<input type="radio" name="language' + targetIndex + '" id="language' + targetIndex + '4" value="html"><br>'
            + '<label for="language' + targetIndex + '5">php</label> '
            + '<input type="radio" name="language' + targetIndex + '" id="language' + targetIndex + '5" value="php">'
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
    var wrapperIndex = -1;

    // Loop through all the <pre> tags, wrap them with a code-wrapper if not yet done and apply syntax highlighting.
    $('pre').each(function(i)
    {
        var $pre        = $(this),
            $wrapper    = $pre.parents('.code-wrapper').length ? $pre.parents('.code-wrapper') : wrapPre($pre),
            preIndex    = $pre.prevAll('pre').length,
            numberOfPre = $wrapper.find('pre').length,// Number of code editors in the same code-wrapper.
            html        = this.innerHTML || '';

        // If first pre of code-wrapper.
        if (preIndex === 0)
        {
            $wrapper.attr('data-index', wrapperIndex++);
            // Add a button to add a new code editor.
            $wrapper.find('pre').eq(0).before('<label class="add" data-increment="' + numberOfPre + '">+</label>');
        }

        // Create the tab system.
        addTab($pre, preIndex, $wrapper);

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
        var tabIndex = $(this).data('increment'),
            $wrapper = $(this).parent();

        $(this).siblings('pre:last').after('<pre class="i-code" contenteditable="true" data-type="plain-text" data-label="Label"/>');

        addTab($(this).siblings('pre:last'), tabIndex, $wrapper);
        $(this)
            .prev().trigger('click').trigger('focus');

        $(this).data('increment', tabIndex + 1);
    });


    // On saving edits.
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
    .on('change', '.code-label', function(e)
    {
        var label        = this.value,
            tabToggler   = $('input#' + $(this).parents('label').attr('for')),
            codeLanguage = tabToggler.attr('data-type'),
            matchingPre  = $('pre[data-type=' + codeLanguage + ']');

        matchingPre.add(tabToggler).attr('data-label', label);
    })
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
 * @param {*} editor
 */
var codeEditor = function(editor)
{
    var self = this;
    self.editor    = editor instanceof jQuery ? editor[0] : editor;
    self.$editor   = $(editor);
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

                    if (cond) debounceColorizing();
                });*/
                // IE 10+
                .on('input', function(e)
                {
                    if (languageIsKnown) debounceColorizing();
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

                    // Do whatever with pasteddata.
                    alert('Paste not developed yet :)\n\n\n' + pastedData);
                });
        };

    var debounceColorizing = function()
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
        else debounceTimerId = setTimeout(function(){debounceColorizing()}, 200);
    };

    self.colorizeText = function(text)
    {
        var string = self.editor.innerHTML.stripTags().replace(/&amp;/g, '&');

        // console.group('Colorizing');
        // console.count('colorize');
        console.log(string)
        switch (self.language)
        {
            case 'html':
                string = string.replace(/&lt;(\/?)(\w+) ?(.*?)&gt;/mg, function()
                {
                    var attributes = '';

                    if (arguments[3])
                    {
                        var attrs = arguments[3].split(' ');
                        for (var i = 0, l = attrs.length; i < l; i++)
                        {
                            attributes += ' ' + attrs[i].replace(
                                /((?:\w|-)+)=('|"|)(.*?)\2/,
                                '<span class="attribute">$1</span>'
                                + '<span class="ponctuation">=</span>'
                                + '<span class="quote">"$3"</span>');
                        }
                    }

                    return '<span class="ponctuation">&lt;' + arguments[1] + '</span>'
                           + '<span class="tag">' + arguments[2] + '</span>'
                           + attributes + '<span class="ponctuation">&gt;</span>';
                });
            break;
            case 'css':
                string = string
                .replace(/((?:\/\*\s*))*([^{]+)\s*{\s*([^}]+)\s*}\s*(?:\*\/)*\s*/mg, function()
                {
                    // If commented don't parse inner.
                    if ((arguments[1]||'').indexOf('/*') > -1)
                        return '\n<span class="comment">/* '+ arguments[2] + '{\n    ' + arguments[3] + '\n} */</span>';

                    if (arguments[3])
                    {
                        var properties = '', props = arguments[3].replace(/^;+?(.*).+?$/, '$1').split(';');

                        for (var i = 0, l = props.length; i < l; i++)
                        {
                            var prop = props[i].trim();
                            if (prop)
                            {
                                properties += '\n    ' + prop.replace(
                                    /\s*([^:]+)\s*:\s*([^;]+)\s*;?\s*/, function()
                                    {
                                        return '<span class="attribute">'
                                                + arguments[1]
                                                + '</span>'
                                                + '<span class="ponctuation">: </span>'
                                                + '<span class="value">'
                                                + arguments[2]
                                                    .replace(/([(),])/g, '<span class="ponctuation">$1</span>')
                                                + '</span><span class="ponctuation">;</span>';
                                    });
                            }
                        }
                    }

                    return '\n<span class="selector">' + arguments[2].trim().replace(/(:(?:before|after))/, '<span class="keyword">$1</span>') + '</span>'
                        +' <span class="ponctuation">{</span>' + properties + '\n<span class="ponctuation">}</span>';
                })
                // Wrap extra comments.
                .replace(/(\/\*\s*(?:.(?!<[^>]+>))*?\s*\*\/\s*)/mg, '\n<span class="comment">$1</span>').trim();
            break;
            case 'sql':
                string = string.replace(
                         /\b(\*|CREATE|ALL|DATABASE|TABLE|GRANT|PRIVILEGES|IDENTIFIED|FLUSH|SELECT|UPDATE|DELETE|INSERT|FROM|WHERE|(?:ORDER|GROUP) BY|LIMIT|(?:(?:LEFT|RIGHT|INNER|OUTER) |)JOIN|AS|ON|COUNT|CASE|TO|IF|WHEN|BETWEEN|AND|OR|CONCAT)(?=\W)/ig, function()
                         {
                            return '<span class="keyword">' + arguments[1].toUpperCase() + '</span>';
                         });
            break;
            case 'php':
                string = string.replace(/\b(define|echo|print_r|var_dump)(?=\W)/ig, '<span class="keyword">$1</span>');
            break;
            case 'js':
            case 'javascript':
                var regexParts =
                    [
                        /\b(\d+|null)\b/,// Number or null.
                        /\b(true|false)\b/,// Booleans.
                        /\b(new|getElementsBy(?:Tag|Class|)Name|getElementById|arguments|if|else|do|return|case|default|function|typeof|undefined|instanceof|this|document|window|while|for|switch|in|break|continue|length|var|(?:clear|set)(?:Timeout|Interval))(?=\W)/,// Keywords.
                        /(?:(?=\W))(\$|jQuery)(?=\W|$)/// jQuery or $.
                    ],
                    // http://stackoverflow.com/a/41867753/2012407
                    regexParts2 =
                    [
                        /("(?:\\"|[^"])*")|('(?:\\'|[^'])*')/,// Quotes.
                        /(\/\/.*|\/\*[\s\S]*?\*\/)/,// Comments blocks (/* ... */) or trailing comments (// ...).
                        /(<[^>]*>)/,// Html tags.
                        /((?:[\[\](){}|.:;,+\-?=]|&lt;|&gt;)+)/// Ponctuation not in html tag.
                    ],
                    regexPattern  = new RegExp(regexParts.map(function(x){return x.source}).join('|'), 'g'),
                    regexPattern2 = new RegExp(regexParts2.map(function(x){return x.source}).join('|'), 'g');

                string = string//.unhtmlize()
                        .replace(regexPattern, function()
                        {
                            var m = arguments,
                                Class = '';

                            switch(true)
                            {
                                // Numbers and 'null'.
                                case (m[1]):
                                    m = m[1];
                                    Class = 'number';
                                    break;

                                // True or False.
                                case (Boolean)(m[2]):
                                    m = m[2];
                                    Class = 'bool';
                                    break;

                                // True or False.
                                case (Boolean)(m[3]):
                                    m = m[3];
                                    Class = 'keyword';
                                    break;

                                // $ or 'jQuery'.
                                case (Boolean)(m[4]):
                                    m = m[4];
                                    Class = 'dollar';
                                    break;
                            }

                            return '<span class="' + Class + '">' + m + '</span>';
                        })
                        .replace(regexPattern2, function()
                        {
                            var m = arguments,
                                Return = '';

                            switch(true)
                            {
                                // Quotes.
                                case (Boolean)(m[1] || m[2]):
                                    Return = '<span class="quote">' + (m[1] || m[2]).stripTags() + '</span>';
                                    break;

                                // Comments.
                                case (Boolean)(m[3]):
                                    Return = '<span class="comment">' + (m[3]).stripTags() + '</span>';
                                    break;

                                // Html tags.
                                case (Boolean)(m[4]):
                                    Return = m[4];
                                    break;

                                // Ponctuation.
                                case (Boolean)(m[5] && !m[4]):
                                    Return = '<span class="ponctuation">' + m[5] + '</span>';
                                    break;
                            }

                            return Return;
                        });
            break;
        }
        console.log(string)
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

        while (newTextBefore < self.caretInfo.plainTextBefore)
        {
            newTextBefore += self.editor.childNodes[nodeIndex].innerHTML.htmlize();
            nodeIndex++;
        }

        currentNodeText = self.editor.childNodes[nodeIndex - 1].innerHTML.htmlize();
        newCaretOffset  = currentNodeText.length - (newTextBefore.length - self.caretInfo.plainTextBefore.length);

        // Place the cursor.
        range = document.createRange();
        sel = window.getSelection();
        textNode = self.editor.childNodes[nodeIndex - 1].firstChild;
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

    // Don't calculate the caret position if there is no selection or if selected node is outside the element
    if (!sel.baseNode || sel.baseNode === element) return null;

    var selectionNode   = sel.baseNode.parentNode,
        nodeIndex       = getIndex(selectionNode),
        nodeText        = sel.baseNode.textContent,
        plainTextBefore = '';

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
    for (var i = 0; i < nodeIndex; i++) plainTextBefore += element.childNodes[i].innerHTML;

    // Once the node of the selection caret is reached, add the text before caret to the total text before caret var.
    var nodeTextBeforeCaret = element.childNodes[nodeIndex].innerHTML.htmlize().substr(0, sel.anchorOffset);

    // And htmlize to convert htmlentities to a single character.
    // ! \ This is very important for placing the caret at the right position after syntax highlighting.
    plainTextBefore = plainTextBefore.htmlize() + nodeTextBeforeCaret;

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
//============================================================//


//=========================== MAIN ===========================//
//=require inc.main.js
//============================================================//