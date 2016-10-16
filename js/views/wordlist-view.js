/*global Backbone, jQuery, _, ENTER_KEY, ESC_KEY, Showdown */

(function ($) {
	'use strict';

    var OK_WORDS_LIMIT = 24;

    // Word Item View
    // --------------

    app.WordView = Backbone.View.extend({

        tagName: 'li',
        className: 'wordlist',

        template: _.template($('#okword-template').html()),

        // Re-render the titles of the thread item.
        render: function () {

            var data = this.model.toJSON();
            this.$el.html(this.template(data));

            return this;
        }
    });

	// The DOM element for a thread item...
	app.WordListView = Backbone.View.extend({

		//... is a list tag.
        el: 'ul.okwords',

        // The DOM events specific to an item.
		events: { },

        hoverTemplate: _.template($('#hover-template').html()),

        initialize: function () {

            var this_ = this;

            this.$el.on('mouseover', '.DL', function(ev) {
                $(this).qtip({
                    content: {
                        text: function(ev, api) {

                            this_.dictionaryHelp(ev, api);
                        }
                    },
                    style: {classes: 'qtip-bootstrap'},
                    show: {
                        solo: true,
                        ready: true,
                        delay: 150,
                        effect: false
                    },
                    position: {
                        my: 'center right',
                        at: 'center left',
                        adjust: {method: 'shift'},
                        target: 'event'
                    }
                }, ev);
            });
        },

        // Re-render the words in the wordlist
		render: function (partialWord) {

            var this_ = this;

            if ( partialWord ) {

                this.$el.closest('ul').show();
                this.$el.empty();

                var p = app.thousand_words.prefixLimited(partialWord, OK_WORDS_LIMIT);

                p.then(function(wordList, rsp, opt) {

                    if ( wordList.length ) {

                        this_.$el.removeClass('oops');
                        _.forEach(wordList.models, function(m) {
                            this_.addOneWordToDisplay(m);
                        });
                    }
                    else if ( partialWord.length > 1 ) {

                        var shorterPartial = partialWord.substr(0, partialWord.length-1);

                        var _r = this_.render(shorterPartial);
                        this_.$el.addClass('oops');
                    }
                })
            }
            else {

                this_.$el.closest('ul').hide();
            }

			return this;
		},

        // Add a single word item to the list by creating a view for it, and
        // appending its element to the `<ul>`.
        addOneWordToDisplay: function (word) {
            var wordView = new app.WordView({ model: word });
            this.$el.append(wordView.render().el);
        },

        dictionaryHelp: function(ev, api) {

            var word = $(ev.target).text(),
                that = this;

            setTimeout(function() {

                var pw = app.thousand_words.findingOne(word.toLowerCase());
                pw.then(function (resp) {

                    if (resp) {

                        var lemmas = resp.attributes.lemmas,
                            forms = resp.attributes.pos,
                            subForms = resp.attributes.posd,
                            subPromises = [], pt, pMaster;

                        _.each(lemmas, function (lemma, i) {

                            var def = $.Deferred(),
                                form = forms[i],
                                subForm = subForms[i],
                                ptmp = app.translations.findingOne(lemma.toLowerCase());

                            ptmp.then(function (resp) {

                                if (resp) {

                                    var attrs = _.clone(resp.attributes),
                                        formItem = _.findWhere(attrs.forms, {'form': form});
                                    attrs.form = form;
                                    attrs.subform = subForm;
                                    attrs.definitions = formItem.definitions;
                                    delete attrs.forms;
                                    def.resolve(attrs);
                                }
                                else {
                                    def.resolve({});
                                }
                            });

                            subPromises.push(def.promise());
                        });
                        pMaster = $.when.apply($, subPromises);

                        pMaster.then(function () {

                            var data = {'word': word, defs: []};
                            _.each(arguments, function (attrs) {

                                if (attrs)
                                    data.defs.push(attrs);
                            });

                            var tpl = that.hoverTemplate(data);

                            api.set('content.text', tpl);

                        });
                        pMaster.fail(function (err) {

                            api.set('content.text', 'ERROR ' + err);
                            alert('fail ' + err[0] + ' ' + err[1]);
                        })
                    }
                });
                pw.fail(function (err) {

                    api.set('content.text', 'ERROR ' + err);
                    alert('fail ' + err[0] + ' ' + err[1]);
                });
            }, 1);
        }
    });
})(jQuery);
