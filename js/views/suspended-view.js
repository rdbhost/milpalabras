/*global Backbone, jQuery, _, ENTER_KEY, ESC_KEY, Showdown */

(function ($) {
	'use strict';

    app.SuspendedMessageView = Backbone.View.extend({

        tagName: 'tbody',
        className: "message-body",

        template: _.template($('#suspended-message-template').html()),

        // Re-render the titles of the thread item.
        render: function () {

            var data = this.model.toJSON();
            data.makeHtml = app.UserMessageView.markdown.makeHtml;

            this.$el.html(this.template(data));
            this.$el.show();

            return this;
        }
    },
    { // class properties

        markdown: new Showdown.converter()
    });


    // Suspended View
	// --------------

	// The DOM element for a thread item...
	app.SuspendedView = Backbone.View.extend({

		//... is a list tag.
        el: '#suspended',

        headerTemplate: _.template($('#suspended-header-template').html()),

        nullTemplate: _.template($('#null-message-template').html()),


        // The DOM events specific to an item.
        events: {
            'click .delete':        'deleteMsg',
            'click .unflag':        'unflagMsg'
        },


        // The ThreadView listens for changes to its model, re-rendering. Since there's
		// a one-to-one correspondence between a **Thread** and a **ThreadView** in this
		// app, we set a direct reference on the model for convenience.
		initialize: function () {

            this.$header = this.$('header h1');
            this.$footer = this.$('footer');
            this.$main = this.$('#user');
            this.$tMain = $('#suspended-main');

		},

		// Re-render the titles of the thread item.
		render: function () {

            $('.page').hide();
            this.$el.show();

            if ( app.thread.models.length ) {

                this.$main.show();

                // Add all items in the **threads** collection at once.
                var user = app.thread.models[0].get('author');
                this.$tMain.empty();
                app.thread.each(this.addOneMessageToDisplay, this);

                this.$header.html(this.headerTemplate({
                    user: user
                }));

                $('time.timeago').timeago();
            }
            else  {

                this.$tMain.empty();
                this.$tMain.html(this.nullTemplate());
            }

            // this.$el.html(this.template(this.model.toJSON()));
			return this;
		},

        // Add a single thread item to the list by creating a view for it, and
        // appending its element to the `<ul>`.
        addOneMessageToDisplay: function (message) {
            var msgView = new app.SuspendedMessageView({ model: message });
            this.$tMain.append(msgView.render().el);
        },

        deleteMsg: function(ev) {


            var msgId = $(ev.target).data('messageid'),
                msgModel = app.thread.findWhere({'message_id': msgId});

            if ( msgModel ) {

                msgModel.destroy();
                app.thread.remove(msgModel);
                if ( msgModel.attributes.message_id === msgModel.attributes.thread_id ) {
                    var tmp = app.threads.find({'thread_id': msgModel.attributes.thread_d});
                    if ( tmp )
                        app.threads.remove(msgModel);
                }

                app.suspendedView.render();
            }

            ev.stopImmediatePropagation();
            return false;
        },

        unflagMsg: function(ev) {

            var msgId = $(ev.target).data('messageid'),
                msgModel = app.thread.findWhere({'message_id': msgId});

            if ( msgModel ) {

                msgModel.unSuppress();
                app.thread.remove(msgModel);
                app.suspendedView.render();
            }

            ev.stopImmediatePropagation();
            return false;
        }

    });
})(jQuery);
