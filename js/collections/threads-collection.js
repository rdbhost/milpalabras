/*global Backbone */

(function () {
	'use strict';

    var R = window.Rdbhost;

    // Thread Collection
	// ---------------

	// The collection of threads is backed by a remote server.
	app.Threads = Backbone.Collection.extend({

		// Reference to this collection's model.
		model: app.ThreadSummary,

		// Save all of the thread items under the `"threads"` namespace.
		// localStorage: new Backbone.LocalStorage('threads-backbone'),
        sync: function(method, model, options) {

            options = options || {};

            switch(method) {

                case 'read':
                    var p = R.preauthPostData({
                        q: 'SELECT t.thread_id, topic, start_date, change_date, u.handle AS initiating_user, \n' +
                           '       suppressed, message_ct, g.gravatars \n' +
                           ' FROM threads t \n' +
                           '  JOIN users_plus u ON t.initiating_user = u.idx \n' +
                           '  JOIN gravatars g ON t.thread_id = g.thread_id \n' +
                           ' WHERE (suppressed = false OR suppressed IS NULL) \n' +
                           "   AND message_ct > 0 \n" +
                           'ORDER BY change_date DESC LIMIT 50; '
                    });

                    p.then(function(resp) {
                        options.success(resp.records.rows);
                        app.trigger('show:index');
                    });
                    p.fail(function(err) {
                        if ( options && options.error )
                            options.error(err);
                        console.log('Error ~1 ~2'.replace('~1', err[0]).replace('~2', err[1]));
                    });
                    break;

                default:

                    throw new Error('bad method in Thread.sync ' + method);
                    break;

            }
        },

		// Filter down the list of all threads that are finished.
		completed: function () {
			return this.filter(function (thread) {
				return thread.get('completed');
			});
		},

		// We keep the Threads in sequential order, despite being saved by unordered
		// GUID in the database. This generates the next order number for new items.
		nextOrder: function () {
			if (!this.length) {
				return 1;
			}
			return this.last().get('order') + 1;
		},

		// Threads are sorted by their original insertion order.
		comparator: function (thread) {
			return thread.get('order');
		}
	});

})();
