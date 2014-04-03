/*global Backbone, jQuery, _, ENTER_KEY, ESC_KEY, Showdown */

(function ($) {
	'use strict';

    // User View
	// --------------

	// The DOM element for a thread item...
	app.UserView = Backbone.View.extend({

		//... is a list tag.
        el: '#user',

        headerTemplate: _.template($('#user-header-template').html()),
        subHeaderTemplate: _.template($('#user-subheader-template').html()),

		// The ThreadView listens for changes to its model, re-rendering. Since there's
		// a one-to-one correspondence between a **Thread** and a **ThreadView** in this
		// app, we set a direct reference on the model for convenience.
		initialize: function () {

            this.$header = this.$('header h1');
            this.$footer = this.$('footer');
            this.$main = this.$('#user');
            this.$tMain = $('#user-main');

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
                // todo - change to 'no messages found' error
                // app.milPalabrasRouter.navigate('', {trigger: true});
                alert('no messages found')
            }

            // this.$el.html(this.template(this.model.toJSON()));
			return this;
		},

        // Add a single thread item to the list by creating a view for it, and
        // appending its element to the `<ul>`.
        addOneMessageToDisplay: function (message) {
            var msgView = new app.UserMessageView({ model: message });
            this.$tMain.append(msgView.render().el);
        }

    });
})(jQuery);
