/*global Backbone, jQuery, _, ENTER_KEY, ESC_KEY, Showdown */

(function ($) {
	'use strict';

    app.AllWordsView = Backbone.View.extend({

        el: '#allwords',

        template: _.template($('#allwords-word-template').html()),
        hoverMiscTemplate: _.template($('#allwords-hover-misc-template').html()),
        hoverVerbTemplate: _.template($('#allwords-hover-verb-template').html()),

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

        // Re-render the words list
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
            var p = app.translations.getFirst1KDefCollection(ltr),
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
                // window.console.log('hiding hover (hhO)');
                $hover.hide();
            }
        },

        wordHelp: function(ev) {

            var $tgt = $(ev.target),
                $defcont = $tgt.closest('div.defcontainer'),
                $lemma = $defcont.prevAll('.lemma').first(),
                form = $defcont.find('span').text(),
                word = $lemma.text();

            this._wordHelp($tgt, word, form);
        },

        _setPosition: function($hover, posX, posY, sizeH, sizeW) {
            var offset = (sizeH > 100) ? 95 : 55;
            $hover.css({'top': Math.round(posY)-sizeH+offset, 'left': Math.round(posX-sizeW)});
        },

        _wordHelp: function($tgt, word, form) {

            var that = this,
                posY = $tgt.offset().top - $(document).scrollTop(),
                posX = $tgt.offset().left;

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

            if (word) {

                var $hover = $('#help-hover'),
                    p = app.translations.getFormsByLemma(word);

                p.then(function(wordHash) {

                    var dom, $hover,
                        wordFormHash = wordHash[form];

                    if (form === 'verb') {
                        var withDefaults = app.complete_verb_table(wordFormHash);
                        dom = that.hoverVerbTemplate({a: withDefaults});
                    }
                    else {
                        var wordstr = _.values(wordFormHash).join(', ');
                        dom = that.hoverMiscTemplate({'wordstr': wordstr});
                    }

                    $('#help-hover').remove();
                    $('body').append(dom);
                    $hover = $('#help-hover');

                    that._setPosition($hover, posX, posY, $hover.height(), $hover.width());
                    $hover.show();

                    poll();
                });
            }
        }

    });
})(jQuery);
