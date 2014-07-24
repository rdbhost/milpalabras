/*global Backbone */



(function () {
    'use strict';

    var R = window.Rdbhost;

    app.TranslateFormEntry = Backbone.Model.extend({});

    // Object for each word in okwords list.
    app.TranslateEntry = Backbone.Model.extend({

        defaults: {
        },

        match: function(wd) {

            if ( this.attributes.lemma.toLowerCase() === wd.toLowerCase() )
                return this.attributes.lemma;

            return false;
        },

        matchWithForm: function(wd, frm) {

            var attr = this.attributes;
            if ( attr.lemma.toLowerCase() === wd.toLowerCase() ) {

                var fnd = _.find(attr.forms, function(f) {
                    if (f.form === frm) {
                        return true;
                    }
                });

                if (fnd) {
                    return new app.TranslateFormEntry({
                        lemma: attr.lemma,
                        form: fnd.attributes.form,
                        definition: fnd.attributes.definition
                    });
                }
            }

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

            var collection = this;

            function consolidateTranslateRows(rows) {

                var newRows = {},
                    tmpForm;
                _.each(rows, function(row) {

                    if (! newRows.hasOwnProperty(row.lemma))
                        newRows[row.lemma] = {lemma: row.lemma, forms: []};
                    tmpForm = {form: row.form, definition: row.definition};
                    newRows[row.lemma].forms.push(tmpForm);
                });

                return _.values(newRows);
            }

            function getRecords(ltr) {

                var p = R.preauthPostData({
                    q: 'SELECT lemma, definition, form \n' +
                       "  FROM word_definitions w  WHERE substring(lemma from 1 for 1) = %s \n" +
                       'ORDER BY lemma ASC LIMIT 500;\n',
                    args: [ltr]
                });

                p.then(function(resp) {

                    var rows = consolidateTranslateRows(resp.records.rows);

                    collection.reset(rows);
                    if ( options && options.success )
                        options.success(rows);

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
/*
        },

        findOneByForm: function(word, form) {

            return this.find(function(wd) {
                return wd.matchWithForm(word, form);
            });
*/
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

            function consolidateLemma(rows) {

                var newRows = {};

                _.each(rows, function(row) {

                    if (! newRows.hasOwnProperty(row.part_of_speech))
                        newRows[row.part_of_speech] = {};
                    newRows[row.part_of_speech][row.part_of_speech_detail] = row.word;
                });

                return newRows;
            }

            var wordList = this.formsByLemma[lemma],
                p = $.Deferred(),
                that = this;

            if ( wordList ) {

                p.resolve(wordList);
            }
            else {

                var q =
                 "SELECT lemma, word, part_of_speech, part_of_speech_detail \n" +
                 "  FROM wordlist w  \n" +
                 "WHERE lemma = %s; \n";

                var p0 = R.preauthPostData({
                    q: q,
                    args: [lemma]
                });

                p0.then(function(resp) {

                    var tmp = consolidateLemma(resp.records.rows);
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
