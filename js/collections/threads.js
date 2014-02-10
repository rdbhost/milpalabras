/*global Backbone */
var app = app || {};

(function () {
	'use strict';

	// Thread Collection
	// ---------------

	// The collection of threads is backed by *localStorage* instead of a remote
	// server.
	var Threads = Backbone.Collection.extend({

		// Reference to this collection's model.
		model: app.Thread,

		// Save all of the thread items under the `"threads"` namespace.
		localStorage: new Backbone.LocalStorage('threads-backbone'),

		// Filter down the list of all threads that are finished.
		completed: function () {
			return this.filter(function (thread) {
				return thread.get('completed');
			});
		},

		// Filter down the list to only thread items that are still not finished.
		remaining: function () {
			return this.without.apply(this, this.completed());
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
