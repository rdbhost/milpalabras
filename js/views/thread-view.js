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
        render: function (notFirst) {

            var data = this.model.toJSON();
            data.not_first = notFirst;

            data.makeHtml = app.TopicView.htmlGenerator;

            this.$el.html(this.template(data));
            this.$el.show();

            return this;
        }
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
        hoverTemplate: _.template($('#hover-template').html()),

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
            this.$tMain = $('#thread-main');

            this.listenTo(app.thread, 'reset', this.render);

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

            if ( app.thread.length ) {

                // Add all items in the **threads** collection at once.
                this.$tMain.empty();
                app.thread.each(this.addOneMessageToDisplay, this);

                this.$header.html(this.headerTemplate({
                    topic: app.thread.models[0].get('title')
                }));

                var $postButton = $('#add-post-button'),
                    $postButtons = $('.add-post'),
                    $threadCompleteNote = $('#thread-complete');

                if (app.thread.models.length >= MAX_THREAD_LEN) {

                    $postButton.hide();
                    $threadCompleteNote.show();
                }
                else {

                    $postButton.show();
                    if (app.userId)
                        $postButtons.removeAttr('disabled');
                    else
                        $postButtons.attr('disabled', 'disabled');
                    $threadCompleteNote.hide();
                }

                $('time.timeago').each(function() {
                    var dt = $(this).attr('datetime').split('.');
                    $(this).text(moment(dt[0]+' Z').fromNow());
                });
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
            if (app.editView)
                app.editView.cleanup();
            var model = app.cachedMessages[newMsg.messageCacheKey()] || newMsg;
            app.editView = new app.EditView({ model: model });
            app.editView.render();
        },

        // show message editer, with selected message loaded
        showEditMessageForm: function(ev) {

            var msgId = parseInt($(ev.target).attr('data-messageid'), 10),
                msg = app.thread.where({'message_id': msgId})[0],
                model;
            if (app.editView)
                app.editView.cleanup();
            if (app.cachedMessages[msg.messageCacheKey()])
                model = app.cachedMessages[msg.messageCacheKey()];
            else {
                model = msg.clone();
                model.attributes.body = app.TopicView.htmlGenerator(msg.attributes.body, msg.attributes.next2k);
                model.attributes.title = app.TopicView.htmlGenerator(msg.attributes.title, msg.attributes.next2k);
            }
            app.editView = new app.EditView({ model: model });
            app.editView.render();
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
        addOneMessageToDisplay: function (message, idx) {
            var msgView = new app.MessageView({ model: message });
            this.$tMain.append(msgView.render(idx !== 0).el);
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

        dictionaryHelp: function(this_, api) {

            var word = $(this_).text(),
                that = this;

            setTimeout(function() {

                var pw = app.thousand_words.findingOne(word.toLowerCase());
                pw.then(function(resp) {

                    if (resp) {

                        var lemmas = resp.attributes.lemmas,
                            forms = resp.attributes.pos,
                            subForms = resp.attributes.posd,
                            subPromises = [],
                            pt, pMaster;

                        _.each(lemmas, function(lemma, i) {

                            var def = $.Deferred(),
                                form = forms[i],
                                subForm = subForms[i],
                                ptmp = app.translations.findingOne(lemma.toLowerCase());

                            ptmp.then(function(resp) {

                                var attrs = _.clone(resp.attributes),
                                    formItem = _.findWhere(attrs.forms, {'form': form});
                                attrs.form = form;
                                attrs.subform = subForm;
                                // attrs.definitions = '<ul><li>' + formItem.definitions.join('<li>') + '</ul>';
                                attrs.definitions = formItem.definitions;
                                delete attrs.forms;
                                def.resolve(attrs);
                            });

                            subPromises.push(def.promise());
                        });
                        pMaster = $.when.apply($, subPromises);

                        pMaster.then(function() {

                            var data = {'word': word, defs: []};
                            _.each(arguments, function(attrs) {

                                data.defs.push(attrs);
                            });

                            var tpl = that.hoverTemplate(data);

                            api( tpl);
                        });
                        pMaster.fail(function(err) {

                            api( 'ERROR '+err);
                            alert('fail ' + err[0] + ' ' + err[1]);
                        })
                    }
                });
                pw.fail(function(err) {

                    api( 'ERROR '+err);
                    alert('fail ' + err[0] + ' ' + err[1]);
                });
            }, 1);
        }
    });
})(jQuery);
