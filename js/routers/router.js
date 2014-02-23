/*global Backbone $ */

(function () {
	'use strict';

    // MilPalabras Router
    // ----------
    var MilPalabrasRouter = Backbone.Router.extend({

        routes: {
            't/:thread': 'showThread',
            '':          'showIndex'
        },

        showThread: function (param) {

            app.thread = new app.Thread({thread_id: param});
            app.threadView = new app.ThreadView({model: app.thread});

            app.thread.fetch({
                success: function(resp) {

                    //alert('threads loaded');
                    app.threadView.render();
                },
                error: function(err) {

                    alert('error in thread loading ' + err);
                }
            });

        },

        showIndex: function () {

            app.threadsView = new app.ThreadsView();

            // Suppresses 'add' events with {reset: true} and prevents the app view
            // from being re-rendered for every model. Only renders when the 'reset'
            // event is triggered at the end of the fetch.
            app.threads.fetch({
                success: function(resp) {

                    //alert('threads loaded');
                    app.threadsView.render();
                },
                error: function(err) {

                    alert('error in thread loading ' + err);
                }
            });
        }
    });


    app.milPalabrasRouter = new MilPalabrasRouter();

    Backbone.history.start();

})();
