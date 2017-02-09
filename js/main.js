$(document).ready(function()
{
    if ($('.snippets-list').length)
    {
        $('.thegrid').grid(
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
                330:
                {
                    cellsPerRow: 1,
                    cellHeight: 160
                },
            }
        });

        $('.new-snippet form').on('submit', function()
        {
            var name = $(this).find('input[type="text"]').val().replace(' ', '-');
            this.action = this.action.replace('new', removeDiacritics(name).replace(/\W/g, ''));
        })
    }

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
});




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
    var wrapperIndex = -1;

    // Loop through all the <pre> tags, wrap them with a code-wrapper if not yet done and apply syntax hilighting.
    $('pre').each(function(i)
    {
        var pre             = $(this),
            wrapper         = pre.parents('.code-wrapper'),
            existingWrapper = wrapper.length,
            preIndex        = pre.prevAll('pre').length,
            numberOfPre     = wrapper.find('pre').length,// Number of code editors in the same code-wrapper.
            type            = pre.data('type'),
            label           = pre.data('label'),
            dataLabel       = label ? ' data-label="' + label + '"' : '',
            html            = this.innerHTML || '',
            tabIndex         = i + '-' + type,
            checked         = pre.data('active') !== undefined || !existingWrapper ? '  checked' : '';

        // Wrap any <pre> if no existing code-wrapper.
        if (!existingWrapper)
        {
            wrapper = pre.wrap('<div class="code-wrapper ' + pre.attr('class') + '"/>').parent();
            numberOfPre = wrapper.find('pre').length;
            preIndex = pre.prevAll('pre').length;
        }


        // If first pre of code-wrapper.
        if (preIndex === 0) wrapperIndex++;


        // Create the tab system.
        wrapper.find('pre').eq(0).before(
            '<input type="radio" data-type="' + type + '" name="code-wrapper' + wrapperIndex
            + '" id="pre' + tabIndex + '"' + checked + '><label for="pre' + tabIndex + '">' + (label ? label : type) + '</label>');


        // If last pre of code-wrapper.
        if (preIndex === numberOfPre - 1)
        {
            // If the attribute 'data-result' is present on .code-wrapper then run the given html + css + js in an iframe.
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
                    .prepend('<input type="radio" data-type="result" name="code-wrapper' + wrapperIndex + '" id="result' + i + '" />'
                           + '<label for="result' + i + '">result</label>')
                    .append('<iframe data-type="result"></iframe>')
                    .find('iframe')[0].contentDocument.write(contents);
            }

            // Add a new code editor.
            wrapper.find('pre').eq(0).before(
                '<input type="radio" name="code-wrapper' + wrapperIndex + '" id="addCode' + i + '" data-increment="" />'
              + '<label class="add" for="addCode' + i + '">+</label>');
        }

        if (pre.is('[contenteditable="true"]')) new codeEditor(this);
    });

    $('.code-wrapper .add').on('click', function()
    {
        tabIndex++;
        $(this).before('<input type="radio" name="code-wrapper' + wrapperIndex + '" id="addCode' + tabIndex + '" />'
                     + '<label for="addCode' + tabIndex + '" contenteditable="true">Label</label>');
        $(this).siblings('pre:last').after('<pre class="i-code" contenteditable="true" data-type=""/>');
    })
};


function getIndex(node)
{
    var n = 0;
    while (node = node.previousSibling) n++;

    return n;
}

var codeEditor = function(editor)
{
    var self = this;
    self.editor = $(editor);
    self.language = self.editor.data('type');

    var colorizing = false,// Debounce.
        debounceTimerId = null,
        knownLanguages = ['js', 'javascript', 'css', 'php', 'html', 'sql'],
        languageIsKnown = self.language && knownLanguages.indexOf(self.language) > -1;

    var bindEvents = function()
    {
        self.editor
            .on('mouseup', function(e)
            {
                var i = 0, node = e.target;
                while (node = node.previousSibling) ++i;

                // console.log($(e.target).index(), i, getIndex(e.target));
                console.log(getCaretOffset(self.editor[0]), getCaretCharacterOffsetWithin(self.editor[0]));
            })
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
            });
    };

    var debounceColorizing = function()
    {
        clearTimeout(debounceTimerId);
        debounceTimerId = null;

        if (!colorizing)
        {
            colorizing = true;
            var rawText = self.editor[0].innerHTML.stripTags(),
                caretPosition = getCaretCharacterOffsetWithin(self.editor[0]);

            console.info(rawText)
            editor.innerHTML = colorizeText();

            dosetCaret(self.editor[0], caretPosition);
            setTimeout(function(){colorizing = false;}, 100);
        }
        else debounceTimerId = setTimeout(function(){debounceColorizing()}, 200);
    };

    var colorizeText = function()
    {
        var string = editor.innerHTML.stripTags();

        console.group('Colorizing');
        console.count('colorize');
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
                        /\b(\d+|null)\b/,
                        /\b(true|false)\b/,
                        /\b(new|getElementsBy(?:Tag|Class|)Name|getElementById|arguments|if|else|do|return|case|default|function|typeof|undefined|instanceof|this|document|window|while|for|switch|in|break|continue|length|var|(?:clear|set)(?:Timeout|Interval))(?=\W)/,
                        /(?:(?=\W))(\$|jQuery)(?=\W|$)/
                    ],
                    // http://stackoverflow.com/a/41867753/2012407
                    regexParts2 =
                    [
                        /("(?:\\"|[^"])*")|('(?:\\'|[^'])*')/,// Quotes.
                        /(\/\/.*|\/\*[\s\S]*?\*\/)/,// Comments blocks (/* ... */) or trailing comments (// ...).
                        /(<[^>]*>)/,// Html tags.
                        /((?:[\[\](){}.:;,+\-?=]|&lt;|&gt;)+)/// Ponctuation not in html tag.
                    ],
                    regexPattern  = new RegExp(regexParts.map(function(x){return x.source}).join('|'), 'g'),
                    regexPattern2 = new RegExp(regexParts2.map(function(x){return x.source}).join('|'), 'g');

                string = string.unhtmlize()
                        .replace(regexPattern, function()
                        {
                            var m = arguments,
                                Class = '';

                            switch(true)
                            {
                                // Numbers and 'null'.
                                case (Boolean)(m[1]):
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
        console.groupEnd();
        return string;
    };

    var init = function()
    {
        // Apply syntax highlighting if there is content in the <pre>.
        if (editor.innerHTML && languageIsKnown) editor.innerHTML = colorizeText();

        /*for (var i = 0, l = self.editor[0].childNodes.length; i < l; i++) {
            var node = self.editor[0].childNodes[i];
            if (node.nodeType === 3)
            {
                var txt = node;
                console.log(node)
                self.editor[0].childNodes[i] = document.createElement('span');
                self.editor[0].childNodes[i].innerHTML = txt;
            }
        }*/
        $.each(self.editor[0].childNodes, function(){if (this.nodeType === 3) $(this).wrap('<span/>')});
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
    return this.replace(/&(l|g)t;/g, function(m0, m1){return {l: '<', g: '>'}[m1]});
};
String.prototype.unhtmlize = function()
{
    return this.replace(/[<>]/g, function(m){return {'<': '&lt;', '>': '&gt;'}[m]})
};


function dosetCaret(element, caretPos)
{
    var charactersLength = 0,// Plain text caret position.
        node,
        caretOffset;
    // console.log(caretPos, 'given position');
    $.each(element.childNodes, function(){if (this.nodeType === 3) $(this).wrap('<span/>')});

    for (var i = 0, l = element.childNodes.length; i < l; i++)
    {
        node = element.childNodes[i];

        // Node can be a text node, if so there is no innerHtml.
        charactersLength += node.innerHTML ? node.innerHTML.length : node.length;
        if (charactersLength >= caretPos) {caretOffset = node.innerHTML.length - (charactersLength - caretPos);break;}
    }

    setCaret(element, i, caretOffset);
};

function getCaretOffset(element)
{
    var range = document.createRange(),
        sel = window.getSelection(),
        node = sel.baseNode.parentNode,
        offsetInNode = sel.baseOffset,
        nodeIndex = getIndex(node),
        caretOffset = 0;// Plain text caret position.

    for (var i = 0; i < nodeIndex; i++)
    {
        node = element.childNodes[i];
        caretOffset += node.innerHTML.length;
    }

    return caretOffset + offsetInNode;
};


function setCaret(el, node, caretOffset)
{
    var range = document.createRange(),
        sel = window.getSelection(),
        textNode = el.childNodes[node].firstChild;
    range.setStart(textNode, Math.min(caretOffset, textNode.length));
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    el.focus();
}


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

function getCharacterOffsetWithin(range, node)
{
    var treeWalker = document.createTreeWalker(
        node,
        NodeFilter.SHOW_TEXT,
        function(node) {
            var nodeRange = document.createRange();
            nodeRange.selectNode(node);
            return nodeRange.compareBoundaryPoints(Range.END_TO_END, range) < 1 ?
                NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        },
        false
    );

    var charCount = 0;
    while (treeWalker.nextNode()) {
        charCount += treeWalker.currentNode.length;
    }
    if (range.startContainer.nodeType == 3) {
        charCount += range.startOffset;
    }
    return charCount;
}

function removeDiacritics(str)
{
    var diacriticsMap =
    {
        'A': '\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F',
        'AA': '\uA732',
        'AE': '\u00C6\u01FC\u01E2',
        'AO': '\uA734',
        'AU': '\uA736',
        'AV': '\uA738\uA73A',
        'AY': '\uA73C',
        'B': '\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181',
        'C': '\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E',
        'D': '\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779',
        'DZ': '\u01F1\u01C4',
        'Dz': '\u01F2\u01C5',
        'E': '\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E',
        'F': '\u0046\u24BB\uFF26\u1E1E\u0191\uA77B',
        'G': '\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E',
        'H': '\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D',
        'I': '\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197',
        'J': '\u004A\u24BF\uFF2A\u0134\u0248',
        'K': '\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2',
        'L': '\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780',
        'LJ': '\u01C7',
        'Lj': '\u01C8',
        'M': '\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C',
        'N': '\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4',
        'NJ': '\u01CA',
        'Nj': '\u01CB',
        'O': '\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C',
        'OI': '\u01A2',
        'OO': '\uA74E',
        'OU': '\u0222',
        'P': '\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754',
        'Q': '\u0051\u24C6\uFF31\uA756\uA758\u024A',
        'R': '\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782',
        'S': '\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784',
        'T': '\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786',
        'TZ': '\uA728',
        'U': '\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244',
        'V': '\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245',
        'VY': '\uA760',
        'W': '\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72',
        'X': '\u0058\u24CD\uFF38\u1E8A\u1E8C',
        'Y': '\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE',
        'Z': '\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762',
        'a': '\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250',
        'aa': '\uA733',
        'ae': '\u00E6\u01FD\u01E3',
        'ao': '\uA735',
        'au': '\uA737',
        'av': '\uA739\uA73B',
        'ay': '\uA73D',
        'b': '\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253',
        'c': '\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184',
        'd': '\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A',
        'dz': '\u01F3\u01C6',
        'e': '\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD',
        'f': '\u0066\u24D5\uFF46\u1E1F\u0192\uA77C',
        'g': '\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F',
        'h': '\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265',
        'hv': '\u0195',
        'i': '\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131',
        'j': '\u006A\u24D9\uFF4A\u0135\u01F0\u0249',
        'k': '\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3',
        'l': '\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747',
        'lj': '\u01C9',
        'm': '\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F',
        'n': '\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5',
        'nj': '\u01CC',
        'o': '\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275',
        'oi': '\u01A3',
        'ou': '\u0223',
        'oo': '\uA74F',
        'p': '\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755',
        'q': '\u0071\u24E0\uFF51\u024B\uA757\uA759',
        'r': '\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783',
        's': '\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B',
        't': '\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787',
        'tz': '\uA729',
        'u': '\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289',
        'v': '\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C',
        'vy': '\uA761',
        'w': '\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73',
        'x': '\u0078\u24E7\uFF58\u1E8B\u1E8D',
        'y': '\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF',
        'z': '\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763'
    };

    for (var base in diacriticsMap) str = str.replace(new RegExp('/[' + diacriticsMap[base] + ']/g'), base);

    return str;
}