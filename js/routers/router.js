/*global Backbone $ */

(function () {
	'use strict';

    var R = window.Rdbhost;

    // MilPalabras Router
    // ----------
    var MilPalabrasRouter = Backbone.Router.extend({

        routes: {
            '!/t/:thread': 'showThread',
            '!/br/:msg':   'showBranch',
            '!/u/:user':   'showUser',
            '!/suspended': 'showSuspended',
            '!/login':     'login',
            '!/logout':    'logout',
            '!':           'showIndex',
            '':            'showIndex'
        },

        showThread: function (param) {

            app.thread = new app.Thread([], {thread_id: param});
            app.threadView = new app.ThreadView({model: app.thread});

            app.thread.fetch({
                success: function(mdl, resp, opt) {

                    app.threadView.render();
                    app.threadView.scrollToMyLastPost(app.handle);
                },
                error: function(mdl, err, opt) {

                    alert('error in thread loading ' + err);
                }
            });
        },

        showBranch: function (param) {

            function newBody(body, src_title) {

                return '\nEste mensaje se antes en [' + src_title + ']\n\n' +
                       '-------------------------------------------------------------\n\n' + body;
            }

            param = parseInt(param, 10);
            var models = app.thread.where({'message_id': param});

            if (models.length) {

                var srcModel = models[0].clone();
                srcModel.attributes.body = 'Este mensaje se antes en [' + srcModel.attributes.title + ']\n\n' +
                    '-------------------------------\n\n' + srcModel.attributes.body;

                app.thread = new app.Thread([srcModel], {});
                app.threadView = new app.ThreadView({model: app.thread});

                app.threadView.render();

                var nullMsg = new app.Message({
                    thread_id: undefined,
                    message_id: undefined,
                    author: app.userId
                });

                var edView = new app.EditView({ model: nullMsg, attributes: {parent: srcModel} });
                edView.render();
            }
        },

        showSuspended: function (param) {

            app.thread = new app.Suspended();
            app.suspendedView = new app.SuspendedView();

            app.thread.fetch({
                success: function(mdl, resp, opt) {

                    app.suspendedView.render();
                },
                error: function(mdl, err, opt) {

                    alert('error in suspended loading ' + err);
                }
            });
        },

        showUser: function (param) {

            app.thread = new app.User({user_id: param});
            app.userView = new app.UserView({model: app.thread});

            app.thread.fetch({
                success: function(mdl, resp, opt) {

                    app.userView.render();
                },
                error: function(mdl, err, opt) {

                    alert('error in user loading ' + err);
                }
            });
        },

        showIndex: function () {

            app.threadsView = new app.ThreadsView();

            // Suppresses 'add' events with {reset: true} and prevents the app view
            // from being re-rendered for every model. Only renders when the 'reset'
            // event is triggered at the end of the fetch.
            app.threads.fetch({

                success: function(mdl, resp, opts) {

                    app.threadsView.render();
                },
                error: function(mdl, err, opts) {

                    alert('error in thread loading ' + err);
                }
            });
        },

        login: function() {

            if ( app.userId ) {
                app.milPalabrasRouter.navigate('', {trigger: true});
            }
            else {
                $('#login').show();
            }
        },

        logout: function() {

            window.console.log('logged out as ' + app.userId);

            app.userId = app.userKey = app.handle = undefined;
            $.cookie(myKeyName, '');

            $('a.loginLink').attr('href', '#!/login');
            $('a.loginLink').text('acceder');
            $('span.user-id').text('');

            app.milPalabrasRouter.navigate('', {trigger: true});
        }
    });


    // create router instance
    app.milPalabrasRouter = new MilPalabrasRouter();

    // Create our global collection of available words.
    app.thousand_words = new app.ThousandWords();

    // Create our global collection of **Threads**.
    app.threads = new app.Threads();

    Backbone.history.start();


})();
