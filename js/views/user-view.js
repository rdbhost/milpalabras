/*global Backbone, jQuery, _, ENTER_KEY, ESC_KEY, Showdown */

(function ($) {
	'use strict';

    app.UserMessageView = Backbone.View.extend({

        tagName: 'tbody',
        className: "message-body",

        template: _.template($('#user-message-template').html()),

        // Re-render the titles of the thread item.
        render: function () {

            var data = this.model.toJSON();
            data.makeHtml = app.TopicView.htmlGenerator;

            this.$el.html(this.template(data));
            this.$el.show();

            return this;
        }
    });

    // User View
	// --------------

	// The DOM element for a thread item...
	app.UserView = Backbone.View.extend({

		//... is a list tag.
        el: '#user',

        headerTemplate: _.template($('#user-header-template').html()),
        subHeaderTemplate: _.template($('#user-subheader-template').html()),

        nullTemplate: _.template($('#null-message-template').html()),
        hoverTemplate: _.template($('#hover-template').html()),

        // The DOM events specific to an item.
        events: { },

        // The ThreadView listens for changes to its model, re-rendering. Since there's
		// a one-to-one correspondence between a **Thread** and a **ThreadView** in this
		// app, we set a direct reference on the model for convenience.
		initialize: function () {

            this.$header = this.$('header h1');
            this.$footer = this.$('footer');
            this.$main = this.$('#user');
            this.$uMain = $('#user-main');

            // this.listenTo(this, 'dictionaryHelp', this.dictionaryHelp);
            var this_ = this;

            this.$tMain.tooltip({
                items: '.DL',
                content: function(resp) {

                    return this_.dictionaryHelp(this, resp);
                }
            });

        },

		// Re-render the titles of the thread item.
		render: function () {

            $('.page').hide();
            this.$el.show();

            if ( app.thread.models.length ) {

                this.$main.show();

                // Add all items in the **threads** collection at once.
                var user = app.thread.models[0].get('author'),
                    hd = this.subHeaderTemplate({'user': user});
                this.$uMain.empty();
                this.$uMain.append(hd);
                app.thread.each(this.addOneMessageToDisplay, this);

                this.$header.html(this.headerTemplate({
                    user: user
                }));

                $('time.timeago').each(function() {
                    var dt = $(this).attr('datetime').split('.');
                    $(this).text(moment(dt[0]+' Z').fromNow());
                });
            }
            else  {
                this.$uMain.empty();
                this.$uMain.html(this.nullTemplate());
            }

            // this.$el.html(this.template(this.model.toJSON()));
			return this;
		},

        // Add a single thread item to the list by creating a view for it, and
        // appending its element to the `<ul>`.
        addOneMessageToDisplay: function (message) {
            var msgView = new app.UserMessageView({ model: message });
            this.$uMain.append(msgView.render().el);
        },

        dictionaryHelp: function(this_, resp) {

            app.ThreadView.prototype.dictionaryHelp.call(this, this_, resp);
        }

    });
})(jQuery);
