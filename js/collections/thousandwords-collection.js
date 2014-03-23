/*global Backbone */

(function () {
	'use strict';

    var R = window.Rdbhost;

    // Object for each thread in threads list.
    app.TWEntry = Backbone.Model.extend({

    });


    // Dictionary Words Collection
	// ---------------

	// The collection of threads is backed by a remote server.
	var ThousandWords = Backbone.Collection.extend({

		// Reference to this collection's model.
		model: app.TWEntry,

		// Save all of the thread items under the `"threads"` namespace.
		// localStorage: new Backbone.LocalStorage('threads-backbone'),
        sync: function(method, model, options) {

            options = options || {};

            switch(method) {

                case 'read':
                    var p = R.preauthPostData({
                        q: 'SELECT word, part_of_speech, lemma FROM wordlist '
                    });
                    p.then(function(resp) {
                        if ( options.success )
                            options.success(resp.records.rows);
                        // app.trigger('show:index');
                    });
                    p.fail(function(err) {
                        if ( options.error )
                            options.error(err);
                    });
                    break;

                default:

                    throw new Error('bad method in ThousandWords.sync ' + method);
                    break;

            }
        },

		// Filter down the list of all threads that are finished.
		startsWith: function (begin) {
			return this.filter(function (word) {
				return word.attributes.word.substr(0, begin.length) === begin;
			});
		}

	});

	// Create our global collection of **Threads**.
	app.thousand_words = new ThousandWords();
    app.thousand_words.fetch();
})();
