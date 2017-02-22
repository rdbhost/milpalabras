/*global Backbone, jQuery, _, ENTER_KEY, ESC_KEY, Showdown */

(function ($) {
	'use strict';

    app.AllWordsView = Backbone.View.extend({

        el: '#allwords',

        template: _.template($('#allwords-word-template').html()),
        hoverMiscTemplate: _.template($('#hover-misc-template').html()),
        hoverVerbTemplate: _.template($('#hover-verb-template').html()),

        // The DOM events specific to an item.
        events: {
            'click li': 'showByLetter'
        },

        initialize: function(opts) {

            this.$rightCol = this.$el.find('.right-col');

            this.collection = null;
            var this_ = this;

            $('#allwords').tooltip({
                items:  '.WL',
                content: function(resp) {
                    this_.wordHelp(this, resp);
                }
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

        wordHelp: function(this_, resp) {

            var $tgt = $(this_),
                $defcont = $tgt.closest('div.defcontainer'),
                $lemma = $defcont.prevAll('.lemma').first(),
                form = $tgt.text(),
                word = $lemma.text();

            return this._wordHelp($tgt, word, form, resp);
        },

        _wordHelp: function($tgt, word, form, resp) {

            var this_ = this;

            setTimeout(function() {

                if (word) {

                    var p = app.translations.getFormsByLemma(word);

                    p.then(function(wordHash) {

                        var dom,
                            wordFormHash = wordHash[form];

                        if ( !wordFormHash ) {

                            resp('~not found~');
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

                        resp(dom);

                    })
                        .fail(function(err) {

                            resp('ERROR '+err);
                            //
                        });
                }
                else {
                    resp('ERROR');
                }
            }, 5);
        }
    });
})(jQuery);
