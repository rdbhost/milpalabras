/*global Backbone, jQuery, _, ENTER_KEY, ESC_KEY, Showdown */

(function ($) {
	'use strict';

    // Word Item View
    // --------------

    app.WordView = Backbone.View.extend({

        tagName: 'ul',

        template: _.template($('#okword-template').html()),

        // Re-render the titles of the thread item.
        render: function () {

            var data = this.model.toJSON();
            this.$el.html(this.template(data));
            this.$el.show();

            return this;
        }
    });

	// The DOM element for a thread item...
	app.WordListView = Backbone.View.extend({

		//... is a list tag.
        el: '#okwords',

		// The DOM events specific to an item.
		events: {
		},

		// Re-render the words in the wordlist
		render: function (partialWord) {

            if ( partialWord ) {

                this.$el.show();
                this.$el.empty();

                var wordList = app.thousand_words.prefixLimited(partialWord, 9);

                if ( wordList.length ) {

                    this.$el.removeClass('oops');
                    var this_ = this;
                    _.forEach(wordList.models, function(m) {
                        this_.addOneWordToDisplay(m);
                    });
                }
                else if ( partialWord.length > 1 ) {

                    var shorterPartial = partialWord.substr(0, partialWord.length-1);

                    var _r = this.render(shorterPartial);
                    this.$el.addClass('oops');
                    return _r;
                }
            }
            else {

                this.$el.hide();
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
