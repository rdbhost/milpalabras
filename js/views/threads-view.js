/*global Backbone, jQuery, _, ENTER_KEY */
var app = app || {};

(function ($) {

	'use strict';

	// The Application
	// ---------------

	// Our overall **ThreadsView** is the top-level piece of UI.
	app.ThreadsView = Backbone.View.extend({

		// Instead of generating a new element, bind to the existing skeleton of
		// the App already present in the HTML.
		el: '#mpapp',

		// Our template for the line of statistics at the bottom of the app.
		statsTemplate: _.template($('#stats-template').html()),

		// Delegated events for creating new items, and clearing completed ones.
		events: {
			'keypress #new-message': 'createOnEnter'
			//'click #clear-completed': 'clearCompleted',
			//'click #toggle-all': 'toggleAllComplete'
		},

		// At initialization we bind to the relevant events on the `Threads` and 'Messages'
		// collection, when items are added or changed. Kick things off by
		// loading preexisting threads
		initialize: function () {

			this.$input = this.$('#new-message');
			this.$footer = this.$('#footer');
			this.$main = this.$('#main');
			this.$list = $('#thread-list');

			this.listenTo(app.threads, 'add', this.addOneThread);
			this.listenTo(app.threads, 'reset', this.addAll);
			this.listenTo(app.threads, 'change:completed', this.filterOne);
			// this.listenTo(app.threads, 'filter', this.filterAll);
			this.listenTo(app.threads, 'all', this.render);

			// Suppresses 'add' events with {reset: true} and prevents the app view
			// from being re-rendered for every model. Only renders when the 'reset'
			// event is triggered at the end of the fetch.
			app.threads.fetch({reset: true});
		},

		// Re-rendering the App just means refreshing the statistics -- the rest
		// of the app doesn't change.
		render: function () {

			var threadCount = app.threads.length;
			// var remaining = app.threads.remaining().length;

			if (app.threads.length) {

				this.$main.show();
				this.$footer.show();

				this.$footer.html(this.statsTemplate({
					completed: threadCount
				}));

				//this.$('#filters li a')
				//	.removeClass('selected')
				//	.filter('[href="#/' + (app.threadFilter || '') + '"]')
				//	.addClass('selected');
			}
            else {
				this.$main.hide();
				this.$footer.hide();
			}

			// this.allCheckbox.checked = !remaining;
		},

		// Add a single thread item to the list by creating a view for it, and
		// appending its element to the `<ul>`.
		addOneThread: function (thread) {
			var view = new app.ThreadView({ model: thread });
			this.$list.append(view.render().el);
		},

		// Add all items in the **threads** collection at once.
		addAll: function () {
			this.$list.html('');
			app.threads.each(this.addOneThread, this);
		},

		filterOne: function (thread) {
			thread.trigger('visible');
		},

		filterAll: function () {
			app.threads.each(this.filterOne, this);
		},

		// Generate the attributes for a new thread item.
		newAttributes: function () {
			return {
				title: this.$input.val().trim(),
				order: app.threads.nextOrder(),
				completed: false
			};
		},

		// If you hit return in the main input field, create new **thread** model,
		// persisting it to *localStorage*.
		createOnEnter: function (e) {
			if (e.which === ENTER_KEY && this.$input.val().trim()) {
				app.threads.create(this.newAttributes());
				this.$input.val('');
			}
		},

		// Clear all completed thread items, destroying their models.
		clearCompleted: function () {
			_.invoke(app.threads.completed(), 'destroy');
			return false;
		},

		toggleAllComplete: function () {
			var completed = this.allCheckbox.checked;

			app.threads.each(function (thread) {
				thread.save({
					'completed': completed
				});
			});
		}
	});
})(jQuery);
