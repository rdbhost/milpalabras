/*global Backbone */

(function () {
	'use strict';

    var R = window.Rdbhost;

    var MAX_QUOTED_RATIO = 0.15;

    /*
     *  audit text takes body of text from editor and validates it.
     *    returns list of errors, where each error is a misspelled word marker, with 'begin' and 'end'
     *      elements, or a quoted ratio error, with an 'error' element.
     */
    app.audit_text = function (text) {

        function trim(wd) {

            return wd.replace(/^[?!]+/, '').replace(/[?!.,]+$/, '');  // todo - add unicode spec chars
        }

        var splitOn = /(\s+)/g,
            textParts = text.split(splitOn),
            accum = 0, errs = [], quotedParts = [], wd, trimmed, err;

        for ( var i=0; i < textParts.length; ++i ) {

            wd = textParts[i];

            if ( wd.length > 0 && ! splitOn.test(wd) ) {

                if ( _.contains( [ '"', "'" ], wd.charAt(0) ) ) {

                    err = {'start': accum, 'end': accum + wd.length};
                    quotedParts.push(err);
                }
                else {

                    trimmed = trim(wd);
                    if ( ! app.thousand_words.findOne(trimmed) ) {

                        console.log('word not found: ' + trimmed);
                        err = {'begin': accum, 'end': accum + wd.length};
                        errs.push(err);
                    }
                }
            }

            accum += wd.length;
        }

        function _quoteTot(t, err) {
            var len = err.end - err.start;
            return t+len;
        }
        var quotedTot = _.reduce(quotedParts, _quoteTot, 0);
        if ( quotedTot / accum > MAX_QUOTED_RATIO )
            errs.push.apply(quotedParts);

        return errs;
    };


    // Object for each thread in threads list.
    app.TWEntry = Backbone.Model.extend({

        match: function(wd) {
            return this.attributes.word.toLowerCase() === wd.toLowerCase();
        },

        startsWith: function(begin) {
            return this.attributes.word.substr(0, begin.length).toLowerCase() === begin.toLowerCase();
        }
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
				return word.startsWith(begin);
			});
		},

        prefixLimited: function(begin, lim) {

            var t = _.filter(this.collection, function(wd) {
                    return  wd.startsWith(begin);
                }),
                prefixLen = 4;
            while ( t.length > lim ) {

                var t1 = t.slice(0),
                    prefix = '';
                t.length = 0;

                for ( var i=0; i<t1.length; ++i ) {

                    if ( t1[i].substr(0, prefixLen) !== prefix ) {

                        t.push(t1[i]);
                        prefix = t1[i].substr(0, prefixLen);
                    }
                }

                --prefixLen;
            }

            return new ThousandWords(t);
        },

        findOne: function (word) {

            return this.find(function (wd) {
               return wd.match(word);
            });
        }

	});

	// Create our global collection of **Threads**.
	app.thousand_words = new ThousandWords();
    app.thousand_words.fetch();
})();
