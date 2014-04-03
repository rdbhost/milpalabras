/*global Backbone $ */

(function () {
	'use strict';

    var R = window.Rdbhost;

    // MilPalabras Router
    // ----------
    var MilPalabrasRouter = Backbone.Router.extend({

        routes: {
            't/:thread': 'showThread',
            'u/:user':   'showUser',
            'login':     'login',
            'logout':    'logout',
            '':          'showIndex'
        },

        showThread: function (param) {

            app.thread = new app.Thread([], {thread_id: param});
            app.threadView = new app.ThreadView({model: app.thread});

            app.thread.fetch({
                success: function(mdl, resp, opt) {

                    app.threadView.render();
                },
                error: function(mdl, err, opt) {

                    alert('error in thread loading ' + err);
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

            $('a.loginLink').attr('href', '#/login');
            $('a.loginLink').text('login');
            $('span.user-id').text('');

            app.milPalabrasRouter.navigate('', {trigger: true});
        }
    });


    app.milPalabrasRouter = new MilPalabrasRouter();

    Backbone.history.start();


})();
