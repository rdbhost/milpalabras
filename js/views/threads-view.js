/*global Backbone, jQuery, _, ENTER_KEY */

(function ($) {

	'use strict';

    app.TopicView = Backbone.View.extend({

        tagName: 'tr',

        template: _.template($('#topic-item-template').html()),

        // Re-render the titles of the thread item.
        render: function () {

            var data = this.model.toJSON();
            data.makeHtml = app.MessageView.markdown.makeHtml;

            this.$el.html(this.template(data));
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

        // The DOM events specific to an item.
        events: {
            'click .add-topic-button': 'showAddMessageForm'
        },

        // At initialization we bind to the relevant events on the `Threads` and 'Messages'
		// collection, when items are added or changed. Kick things off by
		// loading preexisting threads
		initialize: function () {

			this.$footer = this.$('footer');
			this.$main = this.$('#topics');
			this.$list = $('#topic-list');

			this.listenTo(app, 'add', this.addOneThread);
            this.listenTo(app, 'show:index', this.render);
			this.listenTo(app, 'change:completed', this.filterOne);
		},

		// Re-rendering the App just means refreshing the statistics -- the rest
		// of the app doesn't change.
		render: function () {

            var threadCount = app.threads.length;

            $('.page').hide();
            this.$el.show();

			if (app.threads.length) {

				this.$main.show();
				this.$footer.show();

                // Add all items in the **threads** collection at once.
                this.$list.empty();
                app.threads.each( this.addOneThread, this );

                if (app.userId) {

                    $('#login-to-create-warn').hide();
                    $('.add-topic-button').removeAttr('disabled');
                }
                else {

                    $('#login-to-create-warn').show();
                    $('.add-topic-button').attr('disabled', 'disabled');
                }

                $('time.timeago').each(function() {
                    var dt = $(this).attr('datetime').split('.');
                    $(this).text(moment(dt[0]+' Z').fromNow());
                });
			}
            else {
				this.$main.hide();
				this.$footer.hide();
			}
		},

        showAddMessageForm: function(ev) {

            var nullMsg = new app.Message({
                thread_id: undefined,
                message_id: undefined,
                author: app.userId
            });

            if (app.editView)
                app.editView.cleanup();
            app.editView = new app.EditView({ model: app.cachedMessages['t'] || nullMsg });
            app.editView.render();
        },

        // Add a single thread item to the list by creating a view for it, and
		// appending its element to the `<ul>`.
		addOneThread: function (thread) {

            var gravs = _.uniq(thread.attributes.avatars);
            gravs = _.uniq(gravs);

            if (gravs.length > 5) {
                gravs.splice(1, gravs.length-3);
            }
            thread.attributes.avatars = gravs;
			var topicView = new app.TopicView({ model: thread });
			this.$list.append(topicView.render().el);
		}

	});
})(jQuery);
