//======================= Dependencies =======================//
//=require jquery/dist/jquery.js
//=require code-editor.js
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
//============================================================//


//=========================== MAIN ===========================//
//=require inc.main.js
//============================================================//