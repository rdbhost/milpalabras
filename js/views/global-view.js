/*global Backbone $ */

(function ($) {
	'use strict';

    function setGlobalHelp() {

        $(document).tooltip({
            items: '*[data-help]',
            content: function(el) {
                return $(this).attr('data-help');
            }
        });
    }

    setGlobalHelp();

})(jQuery);
