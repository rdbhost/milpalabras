/*global Backbone, jQuery, _, ENTER_KEY, ESC_KEY, Showdown */

(function ($) {
	'use strict';

    var MAX_THREAD_LEN = 50,
        wordRe = new RegExp('<?/?[a-zA-Z' + app.constants.FANCY_WORD_CHARS + ']+', 'g');

    function generateHtml(md) {

        function newVal(f) {

            if (f.charAt(0) === '<')
                return f;
            return "<span class='DL'>" + f + "</span>";
        }

        var mkdn = app.MessageView.markdown.makeHtml(md);

        return mkdn.replace(wordRe, newVal);
    }

    app.MessageView = Backbone.View.extend({

        tagName: 'tbody',
        className: "message-body",

        template: _.template($('#message-template').html()),

        nullTemplate: _.template($('#null-message-template').html()),

        // Re-render the titles of the thread item.
        render: function () {

            var data = this.model.toJSON();
            // data.wasDeleted = this.model.wasDeleted();

            data.makeHtml = generateHtml;

            this.$el.html(this.template(data));
            this.$el.show();

            return this;
        }
    },
    { // class properties

        markdown: new Showdown.converter(),
        htmlGenerator: generateHtml
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
            'click .as-new-thread':   'branchThread',
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
            this.$main = this.$('#thread');
            this.$tMain = $('#thread-main');

            this.listenTo(app.thread, 'reset', this.render);
            this.listenTo(this, 'dictionaryHelp', this.dictionaryHelp);
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

        // show message editor, blank
        showAddMessageForm: function(ev) {

            var newMsg = new app.Message({
                thread_id: parseInt(app.thread.models[0].get('thread_id'), 10),
                message_id: undefined,
                author: app.userId
            });
            var edView = new app.EditView({ model: newMsg });
            edView.render();
        },

        // show message editer, with selected message loaded
        showEditMessageForm: function(ev) {

            var msgId = parseInt($(ev.target).attr('data-messageid'), 10),
                msg = app.thread.where({'message_id': msgId})[0];
            var edView = new app.EditView({ model: msg });
            edView.render();
        },

        // marks message as hidden.  will show up, for admins on #!/suspended
        // page.  shown as '~ oscur... ' in regular pages
        suppressMsg: function(ev) {

            if ( ! app.handle ) {

                alert('Please login to use the Flag feature.');
            }
            else {

                var msgId = $(ev.target).data('messageid'),
                    msgModel = app.thread.findWhere({'message_id': msgId}),
                    suspView = new app.SuspendView({model: msgModel});

                suspView.render();
            }

            ev.stopImmediatePropagation();
            return false;
       },

       // replace message with a generic 'was deleted' message
       //   - should be followed up with a message-model.purgeTailingDeletes
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

        // loads clicked message into branch page
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
        },

        hoverTimer: null,
        hoverhelpIn: function(ev) {

            var that = this;
            this.hoverTimer = setTimeout(function() {
                that.trigger('dictionaryHelp', ev);
                that.hoverTimer = null;
            }, 500);
        },
        hoverhelpOut: function(ev) {

            if (this.hoverTimer) {
                window.clearTimeout(this.hoverTimer);
                this.hoverTimer = null;
            }
            else {

                var $hover = $('#definition-hover');
                $hover.hide();
            }
        },

        dictionaryHelp: function(ev) {

            var word = $(ev.target).text(),
                pos = $(ev.target).position(),
                $hover = $('#definition-hover');

            var pw = app.thousand_words.findOne(word.toLowerCase());
            pw.then(function(resp) {

                if (resp) {

                    var lemma = resp.attributes.lemmas[0];

                    var pt = app.translations.findOne(lemma.toLowerCase());

                    pt.then(function(resp) {

                        if ( resp ) {

                            var attrs = resp.attributes;
                            $hover.find('#def-lemma').text(lemma);
                            $hover.find('#def-forms').text(attrs.forms.join(', '));
                            $hover.find('#def-definition').text(attrs.definition);

                            var size = $hover.size();

                            $hover.css({'top': pos.top+15, 'left': pos.left-40});
                            $hover.show();
                        }
                    });
                    pt.fail(function(err) {

                        alert('fail ' + err[0] + ' ' + err[1]);
                    })
                }
            });
            pw.fail(function(err) {

               alert('fail ' + err[0] + ' ' + err[1]);
            });
        }

    });
})(jQuery);
