$(document).ready(function()
{
    if ($.fn.grid) $('.thegrid').grid(
    {
        cellHeight: 200,
        cellsPerRow: 7,
        breakpoints:
        {
            1199:
            {
                cellsPerRow: 5,
                cellHeight: 180
            },
            767:
            {
                cellsPerRow: 4,
            },
            479:
            {
                cellsPerRow: 2,
                cellHeight: 160
            },
        }
    });

    // Close an open code-section on escape key press.
    $(window).on('keyup', function(e)
    {
        // Pressed escape key.
        if (e.which === 27 && $('#see-the-code').is(':checked'))
        {
            $('#see-the-code').prop('checked', false);
            return false;
        }
    });

    if ($('pre').length) syntaxHighlighter();
    if ($('pre[contenteditable="true"]').length) $('pre[contenteditable="true"]').each(function(){new codeEditor(this);});
});




/**
 * Re-htmlize a string. So replace every '&lt;' and '&gt;' with '<' and '>'.
 *
 * @return string: html content.
 */
String.prototype.htmlize = function()
{
    return this.replace(/&(l|g)t;/g, function(a){return {l: '<', g: '>'}[a]});
};


/**
 * Home made simple syntax highlighter for JS, CSS and HTML.
 * Just cz it's fun to do. :)
 * Will parse content in every <pre> tag that has a known data-type (so html, css, js only)
 * to wrap chars and words with spans.
 *
 * @return void.
 */
var syntaxHighlighter = function()
{
    var lastTreatedWrapper = 0, wrapperIndex = -1;
    $('pre').each(function(i)
    {
        var pre = $(this),
            wrapper = pre.parents('.code-wrapper'),
            type = pre.data('type');

        if (wrapper.length && wrapperIndex !== lastTreatedWrapper)
        {
            wrapperIndex++;
            lastTreatedWrapper = wrapperIndex;

            if (wrapper.data('result'))
            {
                var html = wrapper.find('pre[data-type="html"]').html().htmlize(),
                    js = wrapper.find('pre[data-type="js"]').html(),
                    css = wrapper.find('pre[data-type="css"]').html().htmlize(),
                    contents = '<html><head><link rel="stylesheet" type="text/css" href="../css/grid.css">'
                    + '<script src="../bower_components/jquery/dist/jquery.min.js"></script>'
                    + '<script src="../bower_components/jquery.easing/js/jquery.easing.min.js"></script>'
                    + '<script src="../js/grid.js"></script>'
                    + '<style>' + css + '</style></head><body>'
                    + html
                    + '<script>' + js + '</script>'
                    + '</body></html>';
                wrapper
                    .prepend('<input type="radio" data-type="result" name="code-wrapper' + wrapperIndex + '" id="result' + i + '" /><label for="result' + i + '">result</label>')
                    .append('<iframe data-type="result"></iframe>')
                    .find('iframe')[0].contentDocument.write(contents);
            }
        }

        var html = '',
            radioId = i + '-' + type,
            checked = pre.data('active') !== undefined ? '  checked' : '';


        if (this.innerHTML)
        {
            if (html = colorizeText(this.innerHTML, type)) this.innerHTML = html;
        }

        if (wrapper.length) wrapper.prepend(
            '<input type="radio" data-type="' + type + '" name="code-wrapper' + wrapperIndex
            + '" id="pre' + radioId + '"' + checked + '><label for="pre' + radioId + '">' + type + '</label>');
        else {pre.wrap('<div class="code-wrapper no-tabs ' + pre.attr('class') + '" data-type="' + type + '"/>')}
    });
};

var colorizeText = function(string, language)
{
    switch (language)
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
            string = string
                    .replace(/([<>])/g, '<span class="ponctuation">$1</span>')
                    .replace(/(\/\/.*)/g, '<span class="comment">$1</span>')
                    .replace(/(\/\*[\s\S]*\*\/)/mg, '<span class="comment">$1</span>')
                    .replace(/(\b\d+|null\b)/g, '<span class="number">$1</span>')
                    .replace(/(\btrue|false\b)/g, '<span class="bool">$1</span>')
                    // Following will wrap any ' or " THAT ARE NOT INSIDE HTML TAG (e.g. <span class="ponctuation">).
                    // Javascript regex does not support lookbehinds. (T_T)
                    .replace(/(?!(?:.(?=[^<]))*>)("|')([^\1]*?)\1/g, '<span class="quote">"$2"</span>')
                    .replace(/\b(new|getElementsBy(?:Tag|Class|)Name|arguments|getElementById|if|else|do|null|return|case|default|function|typeof|undefined|instanceof|this|document|window|while|for|switch|in|break|continue|var|(?:clear|set)(?:Timeout|Interval))(?=\W)/g, '<span class="keyword">$1</span>')
                    .replace(/\$/g, '<span class="dollar">$</span>')
                    .replace(/([\[\](){}.:,+\-?;])/g, '<span class="ponctuation">$1</span>')
                    // Following will wrap '=' THAT ARE NOT INSIDE HTML TAG (e.g. <span class="ponctuation">).
                    // Javascript regex does not support lookbehinds. (T_T)
                    .replace(/(?!(?:.(?=[^<]))*>)=/g, '<span class="ponctuation">=</span>')
        break;
    }
    return string;
};

var codeEditor = function(editor)
{
    var self = this;
    self.editor = $(editor);
    self.language = self.editor.data('type');

    var bindEvents = function()
    {
        self.editor.on('mouseup', function(e)
        {
            showCaretPos(self.editor[0]);
        });
        self.editor.on('keyup', function(e)
        {
            var rawText = this.innerHTML.replace(/<\/?[^>]+\/?>/g, ''),
                caretPosition = getCaretCharacterOffsetWithin(self.editor[0]);
                // textWithCaret = [rawText.slice(0, caretPosition), '__CARET__', rawText.slice(caretPosition)].join('')

            // console.log(textWithCaret);

            // console.log(e.which)
            var ignoreKeys = [16,17,18,27,37,38,39,40,91,93];
            /*var char = String.fromCharCode((96 <= e.which && e.which <= 105) ? e.which-48 : e.which);
            self.editor.append(char);*/
            // console.log(this.innerHTML.replace(/<\/?[^>]+\/?>/g, ''));
            if (ignoreKeys.indexOf(e.which) === -1) this.innerHTML = colorizeText(rawText, self.language);

            setTimeout(function(){moveCaret(caretPosition, self.editor[0]);}, 1500);
        });
    };

    var init = function()
    {
        bindEvents();
    }();
};


function getCaretCharacterOffsetWithin(element)
{
    var caretOffset = 0;
    var doc = element.ownerDocument || element.document;
    var win = doc.defaultView || doc.parentWindow;
    var sel;
    if (typeof win.getSelection != "undefined") {
        sel = win.getSelection();
        if (sel.rangeCount > 0) {
            var range = win.getSelection().getRangeAt(0);
            var preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            caretOffset = preCaretRange.toString().length;
        }
    } else if ( (sel = doc.selection) && sel.type != "Control") {
        var textRange = sel.createRange();
        var preCaretTextRange = doc.body.createTextRange();
        preCaretTextRange.moveToElementText(element);
        preCaretTextRange.setEndPoint("EndToEnd", textRange);
        caretOffset = preCaretTextRange.text.length;
    }
    return caretOffset;
}

function showCaretPos(el)
{
    var caretPosEl = document.getElementById("caretPos");
    caretPosEl.innerHTML = "Caret position: " + getCaretCharacterOffsetWithin(el);
}

function moveCaret(charCount, element)
{
    var sel, range;
    var doc = element.ownerDocument || element.document;
    var win = doc.defaultView || doc.parentWindow;

    if (win.getSelection) {
        // IE9+ and other browsers
        sel = win.getSelection();
        if (sel.rangeCount > 0) {
            var textNode = sel.focusNode;
            var newOffset = charCount;
            sel.collapse(textNode, Math.min(textNode.length, newOffset));
        }
    } else if ( (sel = win.document.selection) ) {
        // IE <= 8
        if (sel.type != "Control") {
            range = sel.createRange();
            range.move("character", charCount);
            range.select();
        }
    }
    console.log('setting caret at '+newOffset, sel);
}