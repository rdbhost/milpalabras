/*global Backbone, jQuery, _, ENTER_KEY, ESC_KEY, Showdown */

(function ($) {
	'use strict';

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

        initialize: function () {
            this.listenTo(this, 'dictionaryHelp', this.dictionaryHelp);
        },

        // The DOM events specific to an item.
		events: {
            'mouseenter .DL':         'hoverhelpIn',
            'mouseleave .DL':         'hoverhelpOut',
            'dictionaryHelp':         'dictionaryHelp'
		},

        hoverTemplate: _.template($('#hover-left-template').html()),

        // Re-render the words in the wordlist
		render: function (partialWord) {

            var this_ = this;

            if ( partialWord ) {

                this.$el.closest('ul').show();
                this.$el.empty();
                $('#definition-hover-left').hide();

                var p = app.thousand_words.prefixLimited(partialWord, 35);

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
                        return _r;
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

        hoverTimer: null,
        hoverhelpIn: function(ev) {

            var that = this;
            this.hoverTimer = setTimeout(function() {
                that.trigger('dictionaryHelp', ev);
                that.hoverTimer = null;
            }, 500);
        },
        hoverhelpOut: function(ev) {

            if (this.hoverTimer) {
                window.clearTimeout(this.hoverTimer);
                this.hoverTimer = null;
            }
            else {

                var $hover = $('#definition-hover-left');
                $hover.hide();
            }
        },

        dictionaryHelp: function(ev) {

            var word = $(ev.target).text(),
                posY = $(ev.target).offset().top - $(document).scrollTop(),
                that = this;

            var pw = app.thousand_words.findingOne(word.toLowerCase());
            pw.then(function(resp) {

                if (resp) {

                    var lemmas = resp.attributes.lemmas,
                        forms = resp.attributes.pos,
                        subForms = resp.attributes.posd,
                        subPromises = [], pt, pMaster;

                    _.each(lemmas, function(lemma, i) {

                        var def = $.Deferred(),
                            form = forms[i],
                            subForm = subForms[i],
                            ptmp = app.translations.findingOne(lemma.toLowerCase());

                        ptmp.then(function(resp) {

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

                    pMaster.then(function() {

                        var data = {'word': word, defs: []};
                        _.each(arguments, function(attrs) {

                            if (attrs)
                                data.defs.push(attrs);
                        });

                        var tpl = that.hoverTemplate(data);
                        $('#definition-hover-left').remove();
                        $('body').append(tpl);
                        var $hover = $('#definition-hover-left'),
                            size = $hover.height();
                        $hover.css({'top': Math.round(posY-size+44), 'right': 683});
                        $hover.show();
                    });
                    pMaster.fail(function(err) {

                        alert('fail ' + err[0] + ' ' + err[1]);
                    })
                }
            });
            pw.fail(function(err) {

                alert('fail ' + err[0] + ' ' + err[1]);
            });
        }

    });
})(jQuery);
