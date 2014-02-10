/*global Backbone */
var app = app || {};

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

            // Trigger display of given thread
            app.threads.trigger('show:thread', param);
        },

        showIndex: function () {

            // Trigger display of threads
            app.threads.trigger('show:index');
        }
    });


    app.MilPalabrasRouter = new MilPalabrasRouter();

    Backbone.history.start();

})();
