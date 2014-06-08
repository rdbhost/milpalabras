/*global Backbone, jQuery, _, ENTER_KEY, ESC_KEY, Showdown */

(function ($) {
	'use strict';

    app.AllWordsView = Backbone.View.extend({

        el: '#allwords',

        template: _.template($('#allword-word-template').html()),

        // The DOM events specific to an item.
        events: {
            'click li':               'showByLetter',
            'mouseenter .WL':         'hoverhelpIn',
            'mouseleave .WL':         'hoverhelpOut'
        },

        initialize: function(opts) {

            this.$rightCol = this.$el.find('.right-col');

            this.collection = null;
            this.listenTo(this, 'wordHelp', this.wordHelp);
        },

        // Re-render the titles of the thread item.
        render: function () {

            var that = this;
            if ( this.collection ) {
                that.$rightCol.empty();
                _.each(this.collection, function(d, i) {
                    that.$rightCol.append(that.template(d.attributes));
                })
            }
            $('.page').hide();
            this.$el.show();

            return this;
        },

        showByLetter: function(ev) {

            var ltr = ev.target.innerText;
            var p = app.translations.getDefCollection(ltr),
                that = this;

            p.then(function(defCol) {
                that.collection = defCol.models;
                that.render();
            });
            p.fail(function(err) {
                alert(err);
            })
        },

        hoverTimer: null,
        hoverhelpIn: function(ev) {

            var that = this;
            this.hoverTimer = setTimeout(function() {
                that.trigger('wordHelp', ev);
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

        wordHelp: function(ev) {

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
                word = $tgt.text(),
                that = this;

            if (word) {

                var pos = $(ev.target).offset(),
                    $hover = $('#help-hover'),
                    p = app.translations.getFormsByLemma(word),
                    wordstr;

                p.then(function(words) {

                    wordstr = words.join(', ');
                    $hover.find('.hover-tooltip').html(wordstr.replace(/\s/g, ' '));
                    $hover.css({'top': pos.top-20, 'left': pos.left});
                    $hover.show();

                    poll();
                });
            }
        }

    });
})(jQuery);
