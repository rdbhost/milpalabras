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
            data.makeHtml = app.MessageView.htmlGenerator;

            this.$el.html(this.template(data));
            this.$el.show();

            return this;
        }
    });

    // Suspended View
	// --------------

	// The DOM element for a thread item...
	app.SuspendedView = Backbone.View.extend({

		//... is a list tag.
        el: '#suspended',

        headerTemplate: _.template($('#suspended-header-template').html()),
        hoverTemplate: _.template($('#hover-template').html()),

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

            // this.listenTo(this, 'dictionaryHelp', this.dictionaryHelp);
            var this_ = this;

            this.$tMain.on('mouseover', '.DL', function(ev) {
                $(this).qtip({
                    content: {
                        text: function(ev, api) {

                            this_.dictionaryHelp(ev, api);
                            return 'loading...';
                        }
                    },
                    style: {classes: 'qtip-bootstrap'},
                    show: {
                        solo: true,
                        ready: true,
                        delay: 150
                    },
                    position: {
                        my: 'top left',
                        at: 'bottom right',
                        adjust: {method: 'shift'},
                        target: 'event'
                    }
                }, ev);
            });

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

                $('time.timeago').each(function() {
                    var dt = $(this).attr('datetime').split('.');
                    $(this).text(moment(dt[0]+' Z').fromNow());
                });
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

                msgModel.deleteMsg({success: function() {
                        app.recentPostCt -= 1;
                    }
                });
                // app.thread.remove(msgModel);
                if ( msgModel.attributes.message_id === msgModel.attributes.thread_id ) {
                    var tmps = app.threads.where({'thread_id': msgModel.attributes.thread_id});
                    if ( tmps )
                        app.threads.remove(msgModel);
                }
                msgModel.purgeTailingDeletes();

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
        },

        dictionaryHelp: function(ev, api) {

            return app.ThreadView.prototype.dictionaryHelp.call(this, ev, api);
        }

    });
})(jQuery);
