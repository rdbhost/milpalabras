/*global Backbone */



(function () {
    'use strict';

    var R = window.Rdbhost;


    // Object for each word in okwords list.
    app.TranslateEntry = Backbone.Model.extend({

        defaults: {
        },

        match: function(wd) {

            if ( this.attributes.lemma.toLowerCase() === wd.toLowerCase() )
                return this.attributes.lemma;

            return false;
        }
    });


    // Dictionary Words Collection
    // ---------------

    // The collection of words backed by a remote server.
    var DefinitionCollection = Backbone.Collection.extend({

        // Reference to this collection's model.
        model: app.TranslateEntry,

        // Save all of the thread items under the `"threads"` namespace.
        // localStorage: new Backbone.LocalStorage('threads-backbone'),
        sync: function(method, model, options) {

            options = options || {};

            var records = [],
                collection = this;

            function getRecords(ltr) {

                var p = R.preauthPostData({
                    q: 'SELECT lemma, definition, forms \n' +
                       "  FROM word_definitions w  WHERE substring(lemma from 1 for 1) = %s \n" +
                       'ORDER BY lemma ASC LIMIT 500;\n',
                    args: [ltr]
                });

                p.then(function(resp) {

                    collection.reset(resp.records.rows);
                    if ( options && options.success )
                        options.success(resp.records.rows);

                });

                p.fail(function(err) {
                    if ( options && options.error )
                        options.error(err);
                    console.log(err[0] + ' ' + err[1]);
                });
            }


            switch(method) {

                case 'read':

                    getRecords(this.letter);
                    break;

                default:

                    throw new Error('bad method in DefinitionCollection.sync ' + method);
                    break;
            }
        },

        findOne: function (word) {

            return this.find(function (wd) {
                return wd.match(word);
            });
        }

    });

    // The collection of words backed by a remote server.
    app.Translations = Backbone.Model.extend({

        initialize: function() {

            var that = this;
            that.byLetter = {};
            that.formsByLemma = {};
        },

        findingOne: function (word) {

            var ltrList = this.byLetter[word.charAt(0)],
                p = $.Deferred(),
                that = this,
                tmp, wc;

            if ( ltrList ) {

                var one = ltrList.findOne(word);
                p.resolve(one);
            }
            else {

                tmp = new DefinitionCollection();
                tmp.letter = word.charAt(0);
                tmp.fetch({

                    success: function(list, rsp, opt) {

                        that.byLetter[tmp.letter] = tmp;
                        var one = tmp.findOne(word);

                        p.resolve(one);
                    },

                    error: function(col, rsp, opt) {

                        p.reject(rsp);
                    }
                })
            }

            return p;
        },

        getDefCollection: function (ltr) {

            var ltrList = this.byLetter[ltr.charAt(0)],
                p = $.Deferred(),
                that = this,
                tmp, wc;

            if ( ltrList ) {

                p.resolve(ltrList);
            }
            else {

                tmp = new DefinitionCollection();
                tmp.letter = ltr.charAt(0);
                tmp.fetch({

                    success: function(list, rsp, opt) {

                        that.byLetter[tmp.letter] = tmp;
                        p.resolve(tmp);
                    },

                    error: function(col, err, opt) {

                        p.reject(err);
                    }
                })
            }

            return p;
        },

        getFormsByLemma: function (lemma) {

            var wordList = this.formsByLemma[lemma],
                p = $.Deferred(),
                that = this;

            if ( wordList ) {

                p.resolve(wordList);
            }
            else {

                var q =
                 "SELECT lemma, array_agg(distinct word) AS words \n" +
                 "  FROM wordlist w  \n" +
                 "WHERE lemma = %s \n" +
                 "GROUP BY lemma ";

                var p0 = R.preauthPostData({
                    q: q,
                    args: [lemma]
                });

                p0.then(function(resp) {

                    var tmp = resp.records.rows[0].words;
                    that.formsByLemma[lemma] = tmp;
                    p.resolve(tmp);
                });

                p0.fail(function(err) {
                    p.reject(err);
                });
            }

            return p;
        }

    });

})();
