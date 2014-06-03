/*global Backbone */

(function ($) {
	'use strict';

    app.GlobalView = Backbone.View.extend({

        el: 'body',

        // Delegated events for creating new items, and clearing completed ones.
        events: {
            'mouseenter [data-help]': 'hoverhelpIn',
            'mouseleave [data-help]': 'hoverhelpOut',
            'translateHelp':          'translateHelp'
        },

        initialize: function () {
            this.listenTo(this, 'translateHelp', this.translateHelp);
        },

        hoverTimer: null,
        hoverHideTimer: null,
        hoverhelpIn: function(ev) {

            var that = this;
            this.hoverTimer = setTimeout(function() {
                that.trigger('translateHelp', ev);
                that.hoverTimer = null;
            }, 500);
        },
        hoverhelpOut: function(ev) {

            if (this.hoverTimer) {
                window.clearTimeout(this.hoverTimer);
                this.hoverTimer = null;
            }
            else {

                var $hover = $('#help-hover');
                $hover.hide();
            }
        },

        translateHelp: function(ev) {

            function poll() {

                that.hoverHideTimer = setTimeout(function() {
                    if ($tgt.is(':visible'))

                        poll();

                    else {
                        $hover.hide();
                        window.clearTimeout(that.hoverHideTimer);
                        that.hoverHideTimer = null;
                    }
                }, 100);
            }

            var $tgt = $(ev.target),
                help = $tgt.attr('data-help'),
                that = this;

            if (help) {

                var pos = $(ev.target).offset(),
                    $hover = $('#help-hover');

                $hover.find('.hover-tooltip').text(help);
                $hover.css({'top': pos.top+20, 'left': pos.left});
                $hover.show();

                poll();
            }
        }

    });

})(jQuery);
