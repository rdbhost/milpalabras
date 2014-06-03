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
            data.makeHtml = app.MessageView.htmlGenerator;

            this.$el.html(this.template(data));
            this.$el.show();

            return this;
        }
    }/* ,
    { // class properties

        markdown: new Showdown.converter()
    }*/);

    // User View
	// --------------

	// The DOM element for a thread item...
	app.UserView = Backbone.View.extend({

		//... is a list tag.
        el: '#user',

        headerTemplate: _.template($('#user-header-template').html()),
        subHeaderTemplate: _.template($('#user-subheader-template').html()),

        nullTemplate: _.template($('#null-message-template').html()),

        // The DOM events specific to an item.
        events: {
            'mouseenter .DL':         'hoverhelpIn',
            'mouseleave .DL':         'hoverhelpOut',
            'dictionaryHelp':         'dictionaryHelp'
        },

        // The ThreadView listens for changes to its model, re-rendering. Since there's
		// a one-to-one correspondence between a **Thread** and a **ThreadView** in this
		// app, we set a direct reference on the model for convenience.
		initialize: function () {

            this.$header = this.$('header h1');
            this.$footer = this.$('footer');
            this.$main = this.$('#user');
            this.$tMain = $('#user-main');

            this.listenTo(this, 'dictionaryHelp', this.dictionaryHelp);

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
                this.$tMain.empty();
                this.$tMain.append(hd);
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
            var msgView = new app.UserMessageView({ model: message });
            this.$tMain.append(msgView.render().el);
        },

        hoverTimer: null,
        hoverHideTimer: null,
        hoverhelpIn: function(ev) {

            app.ThreadView.prototype.hoverhelpIn.call(this, ev);
        },
        hoverhelpOut: function(ev) {

            app.ThreadView.prototype.hoverhelpOut.call(this, ev);
        },

        dictionaryHelp: function(ev) {

            app.ThreadView.prototype.dictionaryHelp.call(this, ev);
        }

    });
})(jQuery);
