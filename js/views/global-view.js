/*global Backbone $ */

(function ($) {
	'use strict';

    function setGlobalHelp() {
        $(document).on('mouseover', '*[data-help]', function(ev) {
            $(this).qtip({
//        $('*[data-help]').qtip({
                content: {attr: 'data-help'},
                style: {classes: 'qtip-bootstrap'},
                show: {solo: true, ready: true},
                position: {
                    my: 'top center',
                    at: 'bottom center',
                    adjust: {method: 'shift'}
                }
            })
        });
    }

    setGlobalHelp();

})(jQuery);
