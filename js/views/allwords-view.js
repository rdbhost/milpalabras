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
            'click li':               'showByLetter'
        },

        initialize: function(opts) {

            this.$rightCol = this.$el.find('.right-col');

            this.collection = null;
            var this_ = this;

            $(document).on('mouseover', '.WL', function(ev) {
                $(this).qtip({
                    content: {
                        text: function(ev, api) {

                                this_.wordHelp(ev, api);
                                return 'loading...';
                            }
                    },
                    style: {classes: 'qtip-bootstrap'},
                    show: {
                        solo: true,
                        ready: true,
                        delay: 150
                    },
                    position: {
                        my: 'top right',
                        at: 'bottom left',
                        adjust: {method: 'shift'},
                        target: 'event'
                    }
                }, ev);
            });
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

        wordHelp: function(ev, api) {

            var $tgt = $(ev.target),
                $defcont = $tgt.closest('div.defcontainer'),
                $lemma = $defcont.prevAll('.lemma').first(),
                form = $tgt.text(),
                word = $lemma.text();

            return this._wordHelp($tgt, word, form, api);
        },

        _wordHelp: function($tgt, word, form, api) {

            var this_ = this;

            setTimeout(function() {

                if (word) {

                    var p = app.translations.getFormsByLemma(word);

                    p.then(function(wordHash) {

                        var dom,
                            wordFormHash = wordHash[form];

                        if ( !wordFormHash ) {

                            api.set('content.text', '~not found~');
                            return;
                        }

                        if (form === 'verb') {
                            var withDefaults = app.complete_verb_table(wordFormHash);
                            dom = this_.hoverVerbTemplate({a: withDefaults});
                        }
                        else {
                            var wordstr = _.values(wordFormHash).join(', ');
                            dom = this_.hoverMiscTemplate({'wordstr': wordstr});
                        }

                        api.set('content.text', dom);

                    })
                        .fail(function(err) {

                            api.set('content.text', 'ERROR '+err);
                            //
                        });
                }
                else {
                    api.set('content.text', 'ERROR');
                }
            }, 5);
        }
    });
})(jQuery);
