/*global Backbone, jQuery, _, ENTER_KEY */

(function ($) {

	'use strict';

    app.TopicView = Backbone.View.extend({

        tagName: 'tr',

        template: _.template($('#topic-item-template').html()),

        // Re-render the titles of the thread item.
        render: function () {

            this.$el.html(this.template(this.model.toJSON()));
            this.$el.show();

            return this;
        }
    });


    // The Application
	// ---------------

	// Our overall **ThreadsView** is the top-level piece of UI.
	app.ThreadsView = Backbone.View.extend({

		// Instead of generating a new element, bind to the existing skeleton of
		// the App already present in the HTML.
		el: '#topics',

		// Our template for the line of statistics at the bottom of the app.
		statsTemplate: _.template($('#stats-template').html()),

        // The DOM events specific to an item.
        events: {
            'click #add-topic-button': 'showAddTopicForm'
        },

        // At initialization we bind to the relevant events on the `Threads` and 'Messages'
		// collection, when items are added or changed. Kick things off by
		// loading preexisting threads
		initialize: function () {

            this.$input = this.$('#new-message');
			this.$footer = this.$('footer');
			this.$main = this.$('#topics');
			this.$list = $('#topic-list');

			this.listenTo(app, 'add', this.addOneThread);
			// this.listenTo(app.threads, 'reset', this.addAll);
            this.listenTo(app, 'show:index', this.render);
			this.listenTo(app, 'change:completed', this.filterOne);
			// this.listenTo(app, 'all', this.render);
		},

		// Re-rendering the App just means refreshing the statistics -- the rest
		// of the app doesn't change.
		render: function () {

            var threadCount = app.threads.length;
			// var remaining = app.threads.remaining().length;

            $('.page').hide();
            this.$el.show();

			if (app.threads.length) {

				this.$main.show();
				this.$footer.show();

                // Add all items in the **threads** collection at once.
                this.$list.empty();
                app.threads.each(this.addOneThread, this);

                this.$footer.html(this.statsTemplate({
					completed: threadCount
				}));
			}
            else {
				this.$main.hide();
				this.$footer.hide();
			}
		},

        showAddTopicForm: function(ev) {

            var nullMsg = new app.Message({
                thread_id: undefined,
                message_id: undefined,
                author: app.userId
            });
            var edView = new app.EditView({ model: nullMsg });
            edView.render();
        },

        // Add a single thread item to the list by creating a view for it, and
		// appending its element to the `<ul>`.
		addOneThread: function (thread) {
			var topicView = new app.TopicView({ model: thread });
			this.$list.append(topicView.render().el);
		}

	});
})(jQuery);
