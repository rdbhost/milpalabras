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

		// The DOM events specific to an item.
		events: {
		},

		// Re-render the words in the wordlist
		render: function (partialWord) {

            var that = this;

            if ( partialWord ) {

                this.$el.closest('ul').show();
                this.$el.empty();

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
        }

    });
})(jQuery);
