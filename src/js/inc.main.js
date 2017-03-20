$(document).ready(function()
{
    // Close an open code-section on escape key press.
    $(window)
        .on('keydown', function(e)
        {
            // On ctrl+s. Has to be on keydown to prevent default.
            if (e.which === 83 && e.originalEvent.ctrlKey)
            {
                $('.code-form').trigger('submit');
                return false;
            }
        })
        .on('keyup', function(e)
        {
            // Pressed escape key.
            if (e.which === 27 && !e.originalEvent.altKey && $('#see-the-code').is(':checked'))
            {
                $('#see-the-code').prop('checked', false);
                return false;
            }
        });

    if (typeof onReady === 'function') onReady();
});