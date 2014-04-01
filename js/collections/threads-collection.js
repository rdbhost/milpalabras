/*global Backbone */

(function () {
	'use strict';

    var R = window.Rdbhost;

    // Thread Collection
	// ---------------

	// The collection of threads is backed by a remote server.
	var Threads = Backbone.Collection.extend({

		// Reference to this collection's model.
		model: app.ThreadSummary,

		// Save all of the thread items under the `"threads"` namespace.
		// localStorage: new Backbone.LocalStorage('threads-backbone'),
        sync: function(method, model, options) {

            options = options || {};

            switch(method) {

                case 'read':
                    var p = R.preauthPostData({
                        q: 'SELECT thread_id, topic, start_date, u.handle AS initiating_user, suppressed, message_ct ' +
                           ' FROM threads t ' +
                           '  JOIN users u ON t.initiating_user = u.idx ' +
                           'ORDER BY start_date DESC LIMIT 100; '
                    });
                    p.then(function(resp) {
                        options.success(resp.records.rows);
                        app.trigger('show:index');
                    });
                    p.fail(function(err) {
                        options.error(err);
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

	// Create our global collection of **Threads**.
	app.threads = new Threads();
})();
