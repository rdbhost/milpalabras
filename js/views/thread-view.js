/*global Backbone, jQuery, _, ENTER_KEY, ESC_KEY, Showdown */

(function ($) {
	'use strict';

    var MAX_THREAD_LEN = 50;

    app.MessageView = Backbone.View.extend({

        tagName: 'tbody',
        className: "message-body",

        template: _.template($('#message-template').html()),

        nullTemplate: _.template($('#null-message-template').html()),

        // Re-render the titles of the thread item.
        render: function () {

            var data = this.model.toJSON();
            // data.wasDeleted = this.model.wasDeleted();

            data.makeHtml = app.MessageView.markdown.makeHtml;

            this.$el.html(this.template(data));
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
        // statsTemplate: _.template($('#stats-template').html()),

        headerTemplate: _.template($('#header-template').html()),

		// The DOM events specific to an item.
		events: {
            'click .add-post':        'showAddMessageForm',
            'click .suppress':        'suppressMsg',
            'click .edit':            'showEditMessageForm',
            'click .delete':          'deleteMsg',
            'click .as-new-thread':   'branchThread'
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
                    topic: app.thread.models[0].get('title')
                }));

                var $postButton = $('#add-post-button'),
                    $threadCompleteNote = $('#thread-complete');

                if (app.thread.models.length >= MAX_THREAD_LEN) {

                    $postButton.hide();
                    $threadCompleteNote.show();
                }
                else {

                    $postButton.show();
                    if (app.userId)
                        $postButton.removeAttr('disabled');
                    else
                        $postButton.attr('disabled', 'disabled');
                    $threadCompleteNote.hide();
                }

                $('time.timeago').timeago();
            }
            else  {

                this.$tMain.empty();
            }

			return this;
		},

        showAddMessageForm: function(ev) {

            var newMsg = new app.Message({
                thread_id: parseInt(app.thread.models[0].get('thread_id'), 10),
                message_id: undefined,
                author: app.userId
            });
            var edView = new app.EditView({ model: newMsg });
            edView.render();
        },

        showEditMessageForm: function(ev) {

            var msgId = parseInt($(ev.target).attr('data-messageid'), 10),
                msg = app.thread.where({'message_id': msgId})[0];
            var edView = new app.EditView({ model: msg });
            edView.render();
        },

        suppressMsg: function(ev) {

            if ( ! app.handle ) {

                alert('Please login to use the Flag feature.');
            }
            else {

                var msgId = $(ev.target).data('messageid'),
                    msgModel = app.thread.findWhere({'message_id': msgId});

                msgModel.suppress();
                app.thread.remove(msgModel);
                app.threadView.render();
            }

            ev.stopImmediatePropagation();
            return false;
       },

       deleteMsg: function(ev) {

            if ( ! app.handle ) {

                alert('Please login to use the Delete feature.');
            }
            else {

                var msgId = $(ev.target).data('messageid'),
                    msgModel = app.thread.findWhere({'message_id': msgId});

                msgModel.deleteMsg();
                msgModel.purgeTailingDeletes();
                app.threadView.render();
            }

            ev.stopImmediatePropagation();
            return false;
       },

        branchThread: function(ev) {

            var msgId = parseInt($(ev.target).attr('data-messageid'), 10);
            app.milPalabrasRouter.navigate('!/br/'+msgId, {trigger:true});
        },

        // Add a single thread item to the list by creating a view for it, and
        // appending its element to the `<ul>`.
        addOneMessageToDisplay: function (message) {
            var msgView = new app.MessageView({ model: message });
            this.$tMain.append(msgView.render().el);
        },

        // scroll document to show last post by given user.
        //   does nothing if user has no posts on page
        scrollToMyLastPost: function (userHandle) {

            var p = app.thread.where({'author': userHandle});

            if (p && p.length) {

                var mid = _.last(p).attributes.message_id,
                    $mid = $('[name="' + mid + '"]'),
                    pos = $mid.offset();

                $(document).scrollTop(parseInt(pos.top, 10));
            }
        }

    });
})(jQuery);
