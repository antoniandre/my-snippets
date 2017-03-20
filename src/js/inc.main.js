$(document).ready(function()
{
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

    if (typeof onReady === 'function') onReady();
});