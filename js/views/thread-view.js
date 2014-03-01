/*global Backbone, jQuery, _, ENTER_KEY, ESC_KEY, Showdown */

(function ($) {
	'use strict';

    app.MessageView = Backbone.View.extend({

        tagName: 'tbody',
        className: "message-body",

        template: _.template($('#message-template').html()),

        // Re-render the titles of the thread item.
        render: function () {

            this.model.attributes.body_markdown = app.MessageView.markdown.makeHtml(this.model.attributes.body);

            this.$el.html(this.template(this.model.toJSON()));
            this.$el.show();

            return this;
        }
    },
    { // class properties

        markdown: new Showdown.converter()
    });

    // Thread Item View
	// --------------

	// The DOM element for a thread item...
	app.ThreadView = Backbone.View.extend({

		//... is a list tag.
        el: '#thread',

        // Our template for the line of statistics at the bottom of the app.
        statsTemplate: _.template($('#stats-template').html()),

        headerTemplate: _.template($('#header-template').html()),

		// The DOM events specific to an item.
		events: {
            'click #add-post-button': 'showAddTopicForm'
		},

		// The ThreadView listens for changes to its model, re-rendering. Since there's
		// a one-to-one correspondence between a **Thread** and a **ThreadView** in this
		// app, we set a direct reference on the model for convenience.
		initialize: function () {

            this.$header = this.$('header h1');
            this.$footer = this.$('footer');
            this.$main = this.$('#thread');
            this.$tMain = $('#thread-main');

            this.listenTo(app.thread, 'reset', this.render);
		},

		// Re-render the titles of the thread item.
		render: function () {

            $('.page').hide();
            this.$el.show();

            if ( app.thread.length ) {

                this.$main.show();

                // Add all items in the **threads** collection at once.
                var hd = this.$tMain.find('#thead');
                this.$tMain.empty();
                this.$tMain.html(hd.html());
                app.thread.each(this.addOneMessageToDisplay, this);

                this.$header.html(this.headerTemplate({
                    topic: app.thread.models[app.thread.models.length-1].get('title')
                }));
                //this.$footer.html(this.statsTemplate({
                //    completed: app.thread.length
                //}));

                if (app.userId)
                    $('#add-post-button').removeAttr('disabled');
                else
                    $('#add-post-button').attr('disabled', 'disabled');

                $('time.timeago').timeago();
            }
            else  {
                // todo - change to 'no messages found' error
                app.milPalabrasRouter.navigate('', {trigger: true});
            }

            // this.$el.html(this.template(this.model.toJSON()));
			return this;
		},

        showAddTopicForm: function(ev) {

            var newMsg = new app.Message({
                thread_id: parseInt(app.thread.models[0].get('thread_id'), 10),
                message_id: undefined,
                author: app.userId
            });
            var edView = new app.EditView({ model: newMsg });
            edView.render();
        },

        // Add a single thread item to the list by creating a view for it, and
        // appending its element to the `<ul>`.
        addOneMessageToDisplay: function (message) {
            var msgView = new app.MessageView({ model: message });
            this.$tMain.append(msgView.render().el);
        }

    });
})(jQuery);
