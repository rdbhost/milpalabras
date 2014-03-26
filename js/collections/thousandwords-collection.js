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
            if ( this.attributes.word.toLowerCase() === wd.toLowerCase() )
                return this.attributes.word;
            var alts = _.filter(this.alts, function(m) {
               return m.toLowerCase() == wd.toLowerCase();
            });

            return alts.length ? alts[0] : false;
        },

        startsWith: function(begin) {
            if ( this.attributes.word.substr(0, begin.length).toLowerCase() === begin.toLowerCase() )
                return true;

            var alts = _.filter(this.alts, function(m) {
                return m.substr(0, begin.length).toLowerCase() == begin.toLowerCase();
            });

            return alts.length;
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
                        q: 'SELECT distinct word, ' +
                           ' ARRAY(SELECT alt FROM alt_words a WHERE a.word = w.word) AS alt ' +
                           'FROM wordlist w  ORDER BY word ASC LIMIT 950;'
                    });
                    p.then(function(resp) {

                        var firstBatch = resp.records.rows;

                        var p1 = R.preauthPostData({
                            q: 'SELECT distinct word, ' +
                               ' ARRAY(SELECT alt FROM alt_words a WHERE a.word = w.word) AS alt ' +
                               'FROM wordlist w  ORDER BY word ASC OFFSET 950 LIMIT 950;'
                        });
                        p1.then(function(resp){
                            firstBatch.push.apply(firstBatch, resp.records.rows);

                            if ( options.success )
                                options.success(firstBatch);
                        });
                        p1.fail(function(err) {
                            if ( options.error )
                                options.error(err);
                        })
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

            var t = _.filter(this.models, function(wd) {
                    return  wd.startsWith(begin);
                }),
                prefixLen = 4;
            while ( t.length > lim ) {

                var t1 = t.slice(0),
                    prefix = t1[0].attributes.word.substr(0, prefixLen);
                t.length = 0;
                t.push(t1[0]);

                for ( var i=1; i<t1.length; ++i ) {

                    if ( ! t1[i].startsWith(prefix) ) {

                        t.push(t1[i]);
                        prefix = t1[i].attributes.word.substr(0, prefixLen);
                    }
                }

                --prefixLen;
            }

            if ( t.length < lim && prefixLen < 4 ) {

                t1 = _.first(t1, lim);
                return new ThousandWords(t1);
            }
            else
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
