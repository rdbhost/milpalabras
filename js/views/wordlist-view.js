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

		// Re-render the words in the wordlist
		render: function (partialWord) {

            var that = this;

            if ( partialWord ) {

                this.$el.closest('ul').show();
                this.$el.empty();
                $('#definition-hover-left').hide();

                var p = app.thousand_words.prefixLimited(partialWord, 25);

                p.then(function(wordList, rsp, opt) {

                    if ( wordList.length ) {

                        that.$el.removeClass('oops');
                        _.forEach(wordList.models, function(m) {
                            that.addOneWordToDisplay(m);
                        });
                    }
                    else if ( partialWord.length > 1 ) {

                        var shorterPartial = partialWord.substr(0, partialWord.length-1);

                        var _r = that.render(shorterPartial);
                        that.$el.addClass('oops');
                        return _r;
                    }
                })
            }
            else {

                that.$el.closest('ul').hide();
            }

			return this;
		},

        // Add a single thread item to the list by creating a view for it, and
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
                pos = $(ev.target).offset(),
                $hover = $('#definition-hover-left');

            var pw = app.thousand_words.findOne(word.toLowerCase());
            pw.then(function(resp) {

                if (resp) {

                    var lemma = resp.attributes.lemmas[0];

                    var pt = app.translations.findOne(lemma.toLowerCase());

                    pt.then(function(resp) {

                        if ( resp ) {

                            var attrs = resp.attributes;
                            $hover.find('.def-lemma').text(lemma);
                            $hover.find('.def-forms').text(attrs.forms.join(', '));
                            $hover.find('.def-definition').text(attrs.definition);

                            $hover.css({'top': pos.top-30, 'right': 680});
                            $hover.show();
                        }
                    });
                    pt.fail(function(err) {

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
