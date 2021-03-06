
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
    codeEditor.codeLanguages     = codeEditor.codeLanguages || ['js', 'css', 'php', 'html', 'xml', 'sql'];
    codeEditor.ready             = codeEditor.ready || false;
    codeEditor.uid               = codeEditor.uid + 1 || 1;

    var self       = this;
    // Public vars.
    self.options   = $.extend({cssColors: true}, options);
    self.editor    = editor instanceof jQuery ? editor[0] : editor;
    self.$editor   = $(self.editor);
    self.$wrapper  = self.$editor.parent();
    self.uid       = codeEditor.uid;
    self.language  = null;// Set in self.init().
    self.textMode  = null;// Rich text.
    self.caretInfo = null;
    self.selRange  = null;

    // Private vars.
    var inProgress      = false,// Debounce.
        debounceTimerId = null,
        isLanguageKnown = function(language){return self.language && codeEditor.codeLanguages.indexOf(self.language) > -1;},
        isTextMode      = function(language){return self.language && self.language === 'txt';},
        languageIsKnown = false;// Set in self.init().

    self.updateLanguage = function()
    {
        self.language   = self.$editor.attr('data-type');
        self.textMode   = isTextMode(self.language);
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
            languages    = {txt: 'rich text', js: 'javascript', css: 'css', html: 'html', xml: 'xml', php: 'php'},
            i            = 0;

        $target.attr('data-uid', uid);

        // List all the available languages in a dropdown menu.
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
                + ' name="codeWrapper' + wrapperIndex + '">' + '<span class="label-wrapper" data-uid="' + uid + '">'
                + '<label for="' + targetTag + uid + '"></label><span contenteditable class="code-label">'
                + (label ? label : type) + '</span>'
                + '<span class="languages"><strong>Languages:</strong>'
                + langHtml
                + '</span><span class="remove i-cross-o-filled"></span></span>');

        // Focus on the tab label if user just added it.
        if (edit)
        {
            $('#' + targetTag + uid).click()
                .siblings('.label-wrapper').find('.code-label').focus().select();
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
                    number:      /(-?(?:\.\d+|\d+(?:\.\d+)?))/,
                    boolean:     /\b(true|false)\b/,
                },
                dictionnary =
                {
                    xml:
                    {
                        quote:       regexBasics.quote,
                        comment:     /(&lt;!--[\s\S]*?--&gt;)/,
                        tag:         /(&lt;\/?)([a-zA-Z\-\:]+)(.*?)(\/?&gt;)/,
                        // Treated inside tag because javascript does not support lookbehind,
                        // so be more specific inside tag first match:
                        // ponctuation: /([=/]+|&lt;\/?|\/?&gt;)/,
                        // tagName: /([a-z]\w+)\b/,
                        // attribute:   /([a-zA-Z\-]+)(?=\s*(?:=|\/?&gt;))/,
                    },
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
                        "attribute keyword vendor": /(-(?:moz|o|webkit|ms)-(?=transform|transition|user-select|animation|background-size|box-shadow))/,
                        "attribute keyword": /\b(content|float|display|position|top|left|right|bottom|(?:(?:max|min)-)?width|(?:(?:max|min|line)-)?height|font(?:-(?:family|style|size|weight|variant|stretch))?|vertical-align|color|opacity|visibility|z-index|transform(?:-(?:origin|style|delay|duration|property|timing-function))?|transition(?:-(?:delay|duration))?|animation(?:-(?:name|delay|duration|direction|fill-mode))?|background(?:-(?:color|position|image|repeat|size))?|(?:padding|margin|border)(?:-(?:top|left|right|bottom))?|border(?:-radius)|white-space|text-(?:align|transform|decoration|shadow|indent)|overflow(?:-(?:x|y))?|letter-spacing|box-(?:sizing|shadow)|stroke(?:-(?:width|opacity|dasharray|dashoffset|linecap|linejoin))?|fill|speak|outline|user-select|cursor)(?=\s*:)/,
                        "value keyword vendor": /(-(?:moz|o|webkit|ms)-(?=linear-gradient))/,
                        "value keyword":     /\b(inline-block|inline|block|absolute|relative|static|fixed|inherit|initial|none|auto|hidden|visible|top|left|right|bottom|center|middle|baseline|pre|wrap|nowrap|(?:upper|lower)case|capitalize|linear(?:-gradient)?|ease(?:-in)?(?:-out)?|all|infinite|cubic-bezier|(?:translate|rotate)(?:[X-Z]|3d)?|skew[XY]?|scale|(?:no-)?repeat|repeat(?:-x|-y)|contain|cover|!important|url|inset|pointer|flex)(?=\s*[,;}(]|\s+[\da-z])/,
                        number:      regexBasics.number,
                        color:       /(transparent|#(?:[\da-fA-F]{6}|[\da-fA-F]{3})|rgba?\([\d., ]*\))/,
                        // ponctuation: /([:,;{}@#()]+)/,// @todo Why can't use this one if text contains '<' or '>' ??
                        htmlentity: /(&.*?;)/,
                        ponctuation: /([:,;{}@#()]+|&lt;|&gt;)/,
                        attribute:   /([a-zA-Z\-]+)(?=\s*:)/,
                        unit:        /(px|pt|%|r?em|m?s|deg|vh|vw|vmin|vmax)(?=(?:\s*[;,{}}\)]|\s+[\-\da-z#]))/
                    },
                    json:
                    {
                        quote:       regexBasics.quote,
                        comment:     regexBasics.comment,
                        number:      regexBasics.number,
                        boolean:     regexBasics.boolean,
                        ponctuation: /([\[\](){}:;,\-]+)/,// Override default to simplify.
                    },
                    js:
                    {
                        quote:       regexBasics.quote,
                        comment:     regexBasics.comment,
                        number:      /\b(\d+(?:\.\d+)?|null)\b/,
                        boolean:     regexBasics.boolean,
                        keyword:     /\b(new|getElementsBy(?:Tag|Class|)Name|getElementById|arguments|if|else|do|return|case|default|function|typeof|undefined|instanceof|this|document|window|while|for|switch|in|break|continue|length|var|(?:clear|set)(?:Timeout|Interval)|Math(?=\.)|Date)(?=\W)/,
                        ponctuation: /(!==?|(?:[\[\](){}:;,+\-%*\/?=]|&lt;|&gt;)+|\.+(?![a-zA-Z])|&amp;&amp;|\|\|)/,// Override default since '.' can be part of js variable.
                        variable:    /(\.?[a-zA-Z]\w*)/,
                        htmlentity:  /(&.*?;)/,
                        dollar:      /(\$|jQuery)(?=\W|$)/,// jQuery or $.
                    },
                    php:
                    {
                        quote:       regexBasics.quote,
                        comment:     regexBasics.comment,
                        ponctuation: regexBasics.ponctuation,
                        number:      regexBasics.number,
                        boolean:     regexBasics.boolean,
                        keyword:     /\b(define|echo|die|print_r|var_dump|if|else|do|return|case|default|function|\$this|while|for|switch|in|break|continue)(?=\W|$)/,
                        variable:    /(?:(?=\W))(\$\w+)/
                    },
                    sql:
                    {
                        quote:       regexBasics.quote,
                        comment:     regexBasics.comment,
                        ponctuation: regexBasics.ponctuation,
                        number:      /\b(\d+(?:\.\d+)?|null)\b/,
                        boolean:     regexBasics.boolean,
                        keyword:     /\b(\*|CREATE|ALL|DATABASE|TABLE|GRANT|PRIVILEGES|IDENTIFIED|FLUSH|SELECT|UPDATE|DELETE|INSERT|FROM|WHERE|(?:ORDER|GROUP) BY|LIMIT|(?:(?:LEFT|RIGHT|INNER|OUTER) |)JOIN|AS|ON|COUNT|CASE|TO|IF|WHEN|BETWEEN|AND|OR|CONCAT)(?=\W|$)/
                    }
                },
                classMap = [],
                regexPattern = '';


            for (var Class in dictionnary[self.language])
            {
                classMap.push(Class);
                if (Class === 'quote') classMap.push(Class);// Add twice cause 2 captures in quote regexp.
                if ((self.language === 'html' || self.language === 'xml') && Class === 'tag')
                    classMap.push(Class, Class, Class);

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
                if (Class === 'tag' && (self.language === 'html' || self.language === 'xml'))
                {
                    var tagPieces            = dictionnaryMatches.slice(3),
                        xmlAttributesRegex   = /\s*([a-zA-Z\-:]+)=("|')(.*?)\2/g,
                        htmlAttributesRegex  = /\s*([a-zA-Z\-]+)=("|')(.*?)\2/g,
                        renderAttributesList = function()
                        {
                            return ' <span class="attribute">' + arguments[1] + '</span><span class="ponctuation">=</span>'
                                + '<span class="quote">' + arguments[2] + arguments[3] + arguments[2] + '</span>'
                        };

                    return '<span class="ponctuation">' + tagPieces[0] + '</span>'
                            + '<span class="tag-name">' + tagPieces[1] + '</span>'
                            + (tagPieces[2]||'').replace(self.language === 'xml' ?
                                                         xmlAttributesRegex : htmlAttributesRegex, renderAttributesList)
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
        if (self.textMode) self.initWysiwyg();
    };

    /**
     * Now that the editor content has been syntax highlighted, the html changed and the caret position got lost.
     * So find the caret by comparing the pure text strings before and after syntax highlight by looping through
     * each tag until the caret is found.
     */
    self.setCaret = function(callback)
    {
        var newTextBefore = '',
            nodeIndex     = -1,
            currentNodeText, newCaretOffset, sel, textNode;

        while (newTextBefore < self.caretInfo.plainTextBefore)
        {
            nodeIndex++;
            // newTextBefore += self.editor.childNodes[nodeIndex].innerHTML.htmlize();
            newTextBefore += self.editor.childNodes[nodeIndex].nodeType === 3 ?
                             self.editor.childNodes[nodeIndex].textContent
                           : self.editor.childNodes[nodeIndex].innerHTML.htmlize();
        }
        // if (nodeIndex < 0) nodeIndex = 0;

        currentNodeText = self.editor.childNodes[nodeIndex].nodeType === 3 ?
                          self.editor.childNodes[nodeIndex].textContent
                        : self.editor.childNodes[nodeIndex].innerHTML.htmlize();
        newCaretOffset = currentNodeText.length - (newTextBefore.length - self.caretInfo.plainTextBefore.length);

        // Place the cursor.
        self.selRange = document.createRange();
        sel = window.getSelection();

        if (typeof callback === 'function')
        {
            sel.focusNode.textContent = sel.focusNode.textContent.replaceAt(self.caretInfo.selectionMin, self.caretInfo.selectionLength, callback);
            self.$editor.html($.parseHTML(self.$editor.html().htmlize()));
        }

        textNode = self.editor.childNodes[nodeIndex].nodeType === 3 ?
                   self.editor.childNodes[nodeIndex]
                 : self.editor.childNodes[nodeIndex].firstChild;

        self.selRange.setStart(textNode, Math.min(newCaretOffset, textNode.textContent.length));
        self.selRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(self.selRange);

        self.editor.focus();
    };
    self.setCaret2 = function(callback)
    {
        var newTextBefore = '',
            nodeIndex     = -1,
            currentChild  = null,
            currentNodeText, newCaretOffset, sel, textNode;
        while (newTextBefore < self.caretInfo.plainTextBefore)
        {
            console.log(self.caretInfo.plainTextBefore, newTextBefore)
            nodeIndex++;
            // newTextBefore += self.editor.childNodes[nodeIndex].innerHTML.htmlize();
            newTextBefore += self.editor.childNodes[nodeIndex].nodeType === 3 ?
                             self.editor.childNodes[nodeIndex].textContent
                           : self.editor.childNodes[nodeIndex].innerHTML.htmlize();
        }
        if (nodeIndex < 0) nodeIndex = 0;

        // NodeIndex should never be -1 here. If it is the function is called whereas it should not be.
        currentNodeText = self.editor.childNodes[nodeIndex].nodeType === 3 ?
                          self.editor.childNodes[nodeIndex].textContent
                        : self.editor.childNodes[nodeIndex].innerHTML.htmlize();
        newCaretOffset  = currentNodeText.length - (newTextBefore.length - self.caretInfo.plainTextBefore.length);

        // Place the cursor.
        self.selRange = document.createRange();
        sel = window.getSelection();

        // if (typeof callback === 'function') sel.focusNode = $(callback(sel.focusNode.value))[0];
        if (typeof callback === 'function')
        {
            // sel.focusNode
            /*if (sel.focusNode.nodeType === 3)
            sel.focusNode.parentNode.innerHTML = sel.focusNode.parentNode.innerHTML.substr(0, self.caretInfo.selectionMin)
                                    + '<strong>'
                                    + sel.focusNode.parentNode.innerHTML.substr(self.caretInfo.selectionMin, self.caretInfo.selectionLength)
                                    + '</strong>'
                                    + sel.focusNode.parentNode.innerHTML.substr(self.caretInfo.selectionMin + self.caretInfo.selectionLength);
            else
            sel.focusNode.innerHTML = sel.focusNode.innerHTML.substr(0, self.caretInfo.selectionMin)
                                    + '<strong>'
                                    + sel.focusNode.innerHTML.substr(self.caretInfo.selectionMin, self.caretInfo.selectionLength)
                                    + '</strong>'
                                    + sel.focusNode.innerHTML.substr(self.caretInfo.selectionMin + self.caretInfo.selectionLength);*/
            sel.focusNode.textContent = sel.focusNode.textContent.replaceAt(self.caretInfo.selectionMin, self.caretInfo.selectionLength, function(text){return '<strong>' + text + '</strong>';});
            self.$editor.html($.parseHTML(self.$editor.html().htmlize()));
            console.log(self.editor.textContent, $.parseHTML(self.editor.textContent))
            // console.log(self.caretInfo.selectionMin, self.caretInfo.selectionLength, sel.focusNode, sel.focusNode.parentNode.innerHTML.replaceAt(self.caretInfo.selectionMin, self.caretInfo.selectionLength, function(text){return '<strong>' + text + '</strong>';}))
            // console.log(sel.focusNode.parentNode.childNodes[self.caretInfo.nodeIndex], sel.focusNode.parentNode, $.parseHTML(sel.focusNode.textContent.replaceAt(self.caretInfo.selectionMin, self.caretInfo.selectionLength, function(text){return '<strong>' + text + '</strong>';})));
            // $(sel.focusNode).parent().html(sel.focusNode.textContent.replaceAt(self.caretInfo.selectionMin, self.caretInfo.selectionLength, function(text){return '<strong>' + text + '</strong>';}));
            // sel.focusNode.parentNode.childNodes[self.caretInfo.nodeIndex] = $('<div>test</div>')[0]//$.parseHTML(sel.focusNode.textContent.replaceAt(self.caretInfo.selectionMin, self.caretInfo.selectionLength, function(text){return '<strong>' + text + '</strong>';}));
        }

        textNode = self.editor.childNodes[nodeIndex];
        debugger;
        self.selRange.setStart(textNode, Math.min(newCaretOffset, textNode.length));
        self.selRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(self.selRange);

        self.editor.focus();
    };

    self.getSelRange = function()
    {
        var sel = getSel(), range;

        if (window.getSelection && sel.rangeCount > 0) range = sel.getRangeAt(0);
        else if (sel.type != "Control" && sel.type != "None") range = sel.createRange();

        return self.selRange = range;
    };

    self.placeCaretAfter = function(node)
    {
        var delNode = false;
        if (node === undefined)
        {
            delNode = true;
            node = $('#caret')[0];
        }
        var sel = getSel();
        range = document.createRange();
        range.setStartAfter(node);
        // node.before('.');
        if (delNode) node.remove();
        range.collapse(true);

        sel.removeAllRanges();
        sel.addRange(range);
        self.selRange = range;
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
                // console.log(e)

                // Get pasted data via clipboard API.
                clipboardData = e.originalEvent.clipboardData || window.clipboardData;
                pastedData = clipboardData.getData('Text');

                // Do whatever with pasted data.
                // alert('Paste not developed yet :)\n\n\n' + pastedData);
            });
    };

    self.initWysiwyg = function()
    {
        self.$wrapper.addClass('wysiwyg');
        self.addWysiwygControls();
        // self.$editor.html('<p>' + self.$editor.html() + '</p>');
        self.wysiwygBindEvents();
    };

    self.findActiveButtons = function()
    {
        var $n = $(self.selRange.endContainer);

        for (var buttonId in wysiwygButtons)
        {
            var button          = wysiwygButtons[buttonId],
                $wysywygButtons = self.$wrapper.find('.wysiwyg-buttons');
            if (button.selector)
            {
                var isActive = $n.is(button.selector) || $n.parents(button.selector).length;
                $wysywygButtons.children('.' + buttonId)[isActive ? 'addClass' : 'removeClass']('active');
                console.warn(button.selector, isActive, buttonId, self.selRange.endContainer)
            }
        }
    };

    self.wysiwygBindEvents = function()
    {
        $('.wysiwyg-button')
        .on('click', function(e)
        {
            e.preventDefault();
            var range      = self.getSelRange(),
                ancestor   = range.commonAncestorContainer.nodeType === 3
                           ? range.commonAncestorContainer.parent
                           : range.commonAncestorContainer,
                wysiwygBtn = wysiwygButtons[$(this).attr('data-action')];


            // Cancel event if selection is inexistant or out of editor.
            if (!self.$editor.find(range.commonAncestorContainer).length
                && !range.commonAncestorContainer === self.editor) return false;

            // If clicked button is in a submenu, update wysiwygBtn.
            if (wysiwygBtn.menu)
            {
                wysiwygBtnId = $(($(e.target).is('.wysiwyg-button') ? e.target
                             : e.target.parentNode)).attr('data-action'),
                wysiwygBtn   = wysiwygBtn.menu[wysiwygBtnId];
            }

            // If the button has a tpl wysiwygBtn.actionBefore() is called in alterWysiwygContent().
            if (!wysiwygBtn.tpl && typeof wysiwygBtn.actionBefore === 'function') wysiwygBtn.actionBefore();

            // If the button has a tpl or defined alterSelection function.
            if (wysiwygBtn.tpl || typeof wysiwygBtn.alterSelection === 'function')
            {
                self.alterWysiwygContent(wysiwygBtn);
            }
            if (typeof wysiwygBtn.actionAfter === 'function') wysiwygBtn.actionAfter();


            // Move caret to correct position after changing the code editor content.
            // Place the cursor.
            self.placeCaretAfter();
            self.findActiveButtons();
            self.editor.focus();
        });

        self.$editor
        .on('keydown', function(e)
        {
            self.metaKeyDown = e.ctrlKey || e.metaKey ? e.which : null;
            self.getSelRange();

            console.warn('lalala', e.which, self.metaKeyDown);
            if (self.metaKeyDown)
            {
                var trigger = null;
                switch(self.metaKeyDown)
                {
                    case 66:// b
                        trigger = 'bold';
                        e.preventDefault();
                        break;
                    case 73:// i
                        trigger = 'italic';
                        e.preventDefault();
                        break;
                    case 85:// u
                        trigger = 'underline';
                        break;
                    case 83:// s
                        trigger = 'strikethrough';
                        e.preventDefault();
                        break;
                }
                if (trigger) self.$wrapper.find('.wysiwyg-button.' + trigger).trigger('click', true);
            }
        })
        /*.on('keypress', function(e)
        {
            console.warn('lalala', e.which, self.metaKeyDown);
        })*/.on('keyup', function(e)
        {
            self.getSelRange();
            console.warn('lalala', e.which, self.metaKeyDown);
            /*if (self.metaKeyDown)
            {
                var trigger = null;
                switch(self.metaKeyDown)
                {
                    case 66:// b
                        trigger = 'bold';
                        break;
                    case 73:// i
                        trigger = 'italic';
                        break;
                    case 85:// u
                        trigger = 'underline';
                        break;
                }
                if (trigger) self.$wrapper.find('.wysiwyg-button.' + trigger).trigger('click');
            }
            else*/ switch(e.which)
            {
                // Arrows.
                case 37:
                case 38:
                case 39:
                case 40:
                    self.findActiveButtons();
                    break;
                case 83:// s.
                    e.preventDefault();
                    break;
            }
        })
        .on('click', function(e)
        {
            self.getSelRange();
            self.findActiveButtons();
        });
    };

    self.addWysiwygControls = function()
    {
        var buttonsHtml = '';

        for (var buttonId in wysiwygButtons)
        {
            var button = wysiwygButtons[buttonId], menuHtml = '';

            if (button.menu)
            {
                menuHtml += '<ul class="menu">';
                for (var itemId in button.menu)
                {
                    var item = button.menu[itemId];
                    menuHtml += '<li><a href="javascript:;" class="wysiwyg-button '
                              + itemId + '" role="button" aria-label="' + item.title
                              + '" title="' + item.title
                              + '" data-action="' + itemId + '" tabindex="-1">' + item.label
                              + '</a></li>';
                }
                menuHtml += '</ul>';

                buttonsHtml += '<div class="wysiwyg-button ' + buttonId + '" role="button" aria-label="'
                             + button.title+ '" title="'
                             + button.title+ '" data-action="' + buttonId + '"><a href="javascript:;" tabindex="-1">'
                             + button.label + '</a>' + menuHtml + '</div>';
            }
            else
            {
                // If the button has a template generate a selector to easily find if caret is
                // in such node and activate the button accordingly.
                if (button.tpl)
                {
                    var btn = $(button.tpl)[0];
                    button.selector = btn.nodeName.toLowerCase();
                    if (btn.className) button.selector += '.' + (btn.className || '').replace(' ', '.');
                }

                buttonsHtml += '<a href="javascript:;" class="wysiwyg-button '
                              + buttonId + '" role="button" aria-label="' + button.title
                              + '" title="' + button.title
                              + '" data-action="' + buttonId + '" tabindex="-1">' + button.label + '</a>';
            }
        }
        self.$wrapper.append('<div class="wysiwyg-buttons">' + buttonsHtml + '</div>')
    };

    self.alterWysiwygContent = function(wysiwygBtn)
    {
        var range = self.selRange,
            commonAncestor = range.commonAncestorContainer,
            isCommonAncestorTextNode = commonAncestor.nodeType === 3,
            textBefore = '',
            textAfter = '',
            textSelected = '',
            startNodeIndex = getIndex(range.startContainer),
            endNodeIndex = getIndex(range.endContainer),
            tpl = wysiwygBtn.tpl;// Create a copy not to alter original.
        commonAncestor = isCommonAncestorTextNode ? commonAncestor.parentNode : commonAncestor;

        // If the button has a defined actionBefore function.
        if (typeof wysiwygBtn.actionBefore === 'function')
        {
            // If the function returns a string then update the tpl with it.
            var newTpl = wysiwygBtn.actionBefore(tpl);
            if (newTpl && typeof newTpl === 'string') tpl = newTpl;
            // console('tpl:', newTpl, tpl);
        }
        var piecesToInject = (tpl || '').split('{text}');

        console.group('loop')
        for (var i = 0, l = commonAncestor.childNodes.length; i < l; i++)
        {
            console.count("loop "+i);
            var currNode = commonAncestor.childNodes[i],
                isTextNode = currNode.nodeType === 3,
                currNodeText = currNode[isTextNode ? 'textContent' : 'outerHTML'];
            console.log('currNode:', currNode, 'currNodeText:', currNodeText, 'isTextNode:', isTextNode);

            // Before selection node.
            if (i < startNodeIndex) textBefore += currNodeText;

            // Selection start node.
            if (i === startNodeIndex)
            {
                console.warn('Selection start node')

                // Text before selection.
                /*if (isTextNode) */textBefore += currNodeText.substr(0, range.startOffset);
                // else textBefore += currNodeText.substr(0, getTextPositionInHTML(currNodeText, range.startOffset));

                // Text from selection start to min(end of node, end of selection).
                // startNodeIndex can be equal to endNodeIndex (in simple case with almost flat html).
                // .substr(start, length) != .substring(start, end).
                /*if (isTextNode) */textSelected += currNodeText.substring(range.startOffset, i === endNodeIndex ? range.endOffset : currNodeText.length);
                /*else
                {
                    textSelected += currNodeText.substr(getTextPositionInHTML(currNodeText, range.startOffset), i === endNodeIndex ? getTextPositionInHTML(currNodeText, range.endOffset) : currNodeText.length);
                    console.log(getTextPositionInHTML(currNodeText, range.startOffset), getTextPositionInHTML(currNodeText, range.endOffset), currNodeText.substr(getTextPositionInHTML(currNodeText, range.startOffset), i === endNodeIndex ? getTextPositionInHTML(currNodeText, range.endOffset) : currNodeText.length));
                }*/
                console.log("textBefore:", textBefore, "textSelected:", textSelected, "range.startOffset:", range.startOffset, "range.endOffset:", range.endOffset)
            }

            // Nodes between selection start and end.
            if (i > startNodeIndex && i < endNodeIndex) textSelected += currNodeText;

            // selection end container (node or text-node).
            if (i === endNodeIndex)
            {
                console.warn('Selection end node')
                console.log(currNodeText.substring(0, getTextPositionInHTML(currNodeText, range.startOffset)));
                // textSelected += currNodeText.substr(0, range.endOffset);

                if (i !== startNodeIndex)
                /*if (isTextNode) */textSelected += currNodeText.substring(i === startNodeIndex ? range.startOffset : 0, range.endOffset);
                /*else
                {
                    textSelected += currNodeText.substr(0, getTextPositionInHTML(currNodeText, range.endOffset));
                }*/
                console.log(textSelected)

                // Text after selection.
                textAfter += currNodeText.substr(range.endOffset);
            }

            // After selection end container.
            if (i > endNodeIndex) textAfter += currNodeText;
        }
        console.groupEnd();

        var selAndCaret = '';
        if (wysiwygBtn.alterSelection)
            selAndCaret += wysiwygBtn.alterSelection(textSelected) + '<i id="caret"></i>';
        else if (piecesToInject[1])
            selAndCaret += textSelected + piecesToInject[1] + '<i id="caret"></i>';

        $(commonAncestor).html(textBefore + piecesToInject[0] + selAndCaret + textAfter);
    };

    codeEditor.init = function()
    {
        codeEditor.ready = true;

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
            $.post(location, 'codes=' + encodeURIComponent(JSON.stringify(codes)));

            return false;
        })

        .on('click', '.code-wrapper .add', function()
        {
            var $newPre  = $('<pre class="i-code" contenteditable="true" data-type="txt" data-label="Label"/>');

            $(this).before($newPre);

            // Init a new code editor on the new created tab.
            new codeEditor($newPre, {new: true});
        })

        // On modify label of current editor.
        // Update matching <pre> data-label attribute.
        .on('input', '.code-label', function(e)
        {
            var uid  = $(this).parents('.label-wrapper').data('uid');

            $('pre[data-uid=' + uid + ']').attr('data-label', this.innerHTML);
        })

        // On changing the language of current editor (select in dropdown list).
        .on('change', '.languages input', function(e)
        {
            var uid  = $(this).parents('.label-wrapper').data('uid');

            $('pre[data-uid=' + uid + ']')
                .attr('data-type', this.value)
                .trigger('refresh');
        })

        .on('click', '.remove', function(e)
        {
            var labelWrapper = $(this).parents('.label-wrapper'),
                uid          = labelWrapper.data('uid');

            labelWrapper.add(labelWrapper.prev()).add(labelWrapper.siblings('pre[data-uid=' + uid + ']')).remove();
        });
    };

    var init = function()
    {
        // Create the tab system.
        addTab(self.$editor, self.$wrapper, self.uid, self.options.hasOwnProperty('new'));

        self.updateLanguage();

        if (self.textMode) self.initWysiwyg();
        // Apply syntax highlighting if there is content in the <pre>.
        else if (self.editor.innerHTML && languageIsKnown) self.colorizePreContent();

        if (!codeEditor.ready) codeEditor.init();
        self.bindInstanceEvents();
    }();
};

/**
 * An object of wysiwyg buttons to add to the editor.
 */
var wysiwygButtons =
{
    bold:          {label: '<strong>b</strong>', title: 'Bold', tpl: '<strong>{text}</strong>'},
    italic:        {label: '<em>i</em>', title: 'Italic', tpl: '<em>{text}</em>'},
    underline:     {label: '<span>u</span>', title: 'Underline', tpl: '<span class="underline">{text}</span>'},
    strikethrough: {label: '<span>s</span>', title: 'Strikethrough', tpl: '<span class="strikethrough">{text}</span>'},
    link:          {label: '<span class="i-link">a</span>', title: 'Insert a link', tpl: '<a href="{href}">{text}</a>', actionBefore: function(tpl){return tpl.replace('{href}', prompt('Link source:'))}},
    image:         {label: '<span class="i-image">img</span>', title: 'Insert an image', tpl: '<figure><img src="{src}" alt="{text}"/></figure>', actionBefore: function(tpl){return tpl.replace('{src}', prompt('Image source:'));}},
    ul:            {label: '<span>ul</span>', title: 'Insert an unordered list', tpl: '<ul><li>{text}</li></ul>'},
    ol:            {label: '<span>ol</span>', title: 'Insert an ordered list', tpl: '<ol><li>{text}</li></ol>'},
    video:         {label: '<span class="i-video">video</span>', title: 'Insert a video', tpl: '<figure><iframe src="{src}"></iframe></figure>', actionBefore: function(tpl){return tpl.replace('{src}', prompt('Video youtube source:'));}},
    hrule:         {label: '<span>hr</span>', title: 'Insert an horizontal rule', tpl: '<hr/>'},
    sourcecode:    {label: '<span>&lt;/&gt;</span>', title: 'View source code'},
    plaintext:     {label: '<span>x</span>', title: 'Remove formatting', alterSelection: function(sel)
                    {
                        return sel.stripTags();
                    }
                   },
    formatting:    {label: '<span>f</span>', title: 'Formatting',
                    menu:
                    {
                        h1: {label: '<h1>Header 1</h1>', title: 'Insert a header 1', tpl: '<h1>{text}</h1>'},
                        h2: {label: '<h2>Header 2</h2>', title: 'Insert a header 2', tpl: '<h2>{text}</h2>'},
                        h3: {label: '<h3>Header 3</h3>', title: 'Insert a header 3', tpl: '<h3>{text}</h3>'},
                        h4: {label: '<h4>Header 4</h4>', title: 'Insert a header 4', tpl: '<h4>{text}</h4>'},
                        h5: {label: '<h5>Header 5</h5>', title: 'Insert a header 5', tpl: '<h5>{text}</h5>'},
                        h6: {label: '<h6>Header 6</h6>', title: 'Insert a header 6', tpl: '<h6>{text}</h6>'},
                        p: {label: '<span>Paragraph</span>', title: 'Insert a paragraph', tpl: '<p>{text}</p>'},
                        quote: {label: '<span class="quote"><span class="i-quote-l"></span>Quote<span class="i-quote-r"></span></span>', title: 'Insert a quote', tpl: '<span class="quote"><span class="i-quote-l"></span>{text}<span class="i-quote-r"></span></span>'},
                    }},
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

function getSel(){return window.getSelection ? window.getSelection() : document.selection};


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
    // debugger;
    //=================================================//

    var preHtml = element.innerHTML,
        preText = element.textContent,
        selectionText = sel.toString(),
        rangeContainerNode = range.commonAncestorContainer,
        rangeStartNode = range.startContainer,
        rangeEndNode = range.endContainer;
    console.log(preCaretRange, range.toString(), preHtml, preText)

    for (var i = 0, l = rangeContainerNode.childNodes.length; i < l; i++)
    {
        if (rangeContainerNode.childNodes[i] === rangeStartNode)
        {

        }
        else if (rangeContainerNode.childNodes[i] === rangeEndNode)
        {

        }
    }

    // Once the node of the selection caret is reached, add the text before caret to the total text before caret var.
    // var nodeTextBeforeCaret = element.childNodes[nodeIndex] && element.childNodes[nodeIndex].innerHTML ?
    //                           element.childNodes[nodeIndex].innerHTML.htmlize().substr(0, sel.anchorOffset) : '';
    var elText = element.childNodes[nodeIndex].nodeType === 3 ? element.childNodes[nodeIndex].textContent : element.childNodes[nodeIndex].innerHTML.htmlize();
        nodeTextBeforeCaret = elText ? elText.substr(0, sel.anchorOffset) : '';

    // And htmlize to convert htmlentities to a single character.
    // ! \ This is very important for placing the caret at the right position after syntax highlighting.
    plainTextBefore = plainTextBefore.stripTags().htmlize() + nodeTextBeforeCaret;

    return {
        posInNode: Math.max(sel.anchorOffset, sel.focusOffset),// select range from left or right keep the end of range.
        posInFullPlainText: caretOffset,
        node: selectionNode,
        range: range,
        nodeIndex: nodeIndex,
        nodeText: nodeText,
        selectionLength: Math.abs(sel.anchorOffset - sel.focusOffset),
        selectionMin: Math.min(sel.anchorOffset, sel.focusOffset),
        // nodeTextBefore: nodeText.substr(0, Math.max(sel.anchorOffset, sel.focusOffset)),
        plainTextBefore: plainTextBefore,
        // selectedText: .substr(caretOffset, Math.max(sel.anchorOffset, sel.focusOffset));
    };
};

function getCaretInfo170619(element)
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
    // var nodeTextBeforeCaret = element.childNodes[nodeIndex] && element.childNodes[nodeIndex].innerHTML ?
    //                           element.childNodes[nodeIndex].innerHTML.htmlize().substr(0, sel.anchorOffset) : '';
    var elText = element.childNodes[nodeIndex].nodeType === 3 ? element.childNodes[nodeIndex].textContent : element.childNodes[nodeIndex].innerHTML.htmlize();
        nodeTextBeforeCaret = elText ? elText.substr(0, sel.anchorOffset) : '';

    // And htmlize to convert htmlentities to a single character.
    // ! \ This is very important for placing the caret at the right position after syntax highlighting.
    plainTextBefore = plainTextBefore.stripTags().htmlize() + nodeTextBeforeCaret;

    return {
        posInNode: Math.max(sel.anchorOffset, sel.focusOffset),// select range from left or right keep the end of range.
        posInFullPlainText: caretOffset,
        node: selectionNode,
        nodeIndex: nodeIndex,
        nodeText: nodeText,
        selectionLength: Math.abs(sel.anchorOffset - sel.focusOffset),
        selectionMin: Math.min(sel.anchorOffset, sel.focusOffset),
        // nodeTextBefore: nodeText.substr(0, Math.max(sel.anchorOffset, sel.focusOffset)),
        plainTextBefore: plainTextBefore,
        // selectedText: .substr(caretOffset, Math.max(sel.anchorOffset, sel.focusOffset));
    };
};


var getTextPositionInHTML = function(htmlString, posInPlainText)
{
    var posInHtml = 0, posInText = 0, isInTag = false;
    for (var i = 0, l = htmlString.length; i < l; i++)
    {
        var char = htmlString[i];
        if (char === '<') isInTag = true;
        if (char === '>') isInTag = false;
        console.log(char, posInText, posInHtml, isInTag);
        if (!isInTag) posInText++;
        posInHtml++;
        if (posInText === posInPlainText) break;
    }
    return posInHtml;
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


String.prototype.replaceAt = function(position, length, text)
{
    var endPos  = position + length,
        before  = this.substr(0, position),
        capture = this.substr(position, length),
        after   = this.substr(endPos);
        text    = typeof text === 'function' ? text(capture) : text;
    return before + text + after;
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
    // return this.toString();
};


String.prototype.unhtmlize = function()
{
    return this.replace(/[<>]/g, function(m){return {'<': '&lt;', '>': '&gt;'}[m]})
};