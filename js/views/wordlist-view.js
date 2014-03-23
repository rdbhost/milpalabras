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

		// The ThreadView listens for changes to its model, re-rendering. Since there's
		// a one-to-one correspondence between a **Thread** and a **ThreadView** in this
		// app, we set a direct reference on the model for convenience.
		initialize: function () {

		},

		// Re-render the titles of the thread item.
		render: function (partialWord) {

            if ( partialWord ) {

                this.$el.show();
                this.$el.empty();

                var wordList = app.thousand_words.startsWith(partialWord);

                if ( wordList.length ) {

                    var this_ = this;
                    _.forEach(wordList, function(m) {
                        this_.addOneWordToDisplay.call(this_, m);
                    });
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
