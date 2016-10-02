/*global Backbone $ */

(function ($) {
	'use strict';

    function setGlobalHelp() {
        $('*[data-help]').qtip({
            content: {attr: 'data-help'},
            style: {classes: 'qtip-bootstrap'},
            show: {solo: true},
            position: {
                my: 'top center',
                at: 'bottom center',
                adjust: {method: 'shift'}
            }
        });
    }

    setGlobalHelp();

})(jQuery);
