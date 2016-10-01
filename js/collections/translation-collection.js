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
                        definitions: fnd.attributes.definitions
                    });
                }
            }

            return false;
        }
    });


    // Dictionary Words Collection
    // ---------------

    function consolidateTranslateRows(rows) {

        var newRows = {},
            tmpForm;
        _.each(rows, function(row) {

            if (! newRows.hasOwnProperty(row.lemma))
                newRows[row.lemma] = {lemma: row.lemma, forms: []};
            tmpForm = {form: row.form, definitions: row.definitions};
            newRows[row.lemma].forms.push(tmpForm);
        });

        return _.values(newRows);
    }


    // The collection of words backed by a remote server.
    var DefinitionCollectionFirst1K = Backbone.Collection.extend({

        // Reference to this collection's model.
        model: app.TranslateEntry,

        // Save all of the thread items under the `"threads"` namespace.
        // localStorage: new Backbone.LocalStorage('threads-backbone'),
        sync: function(method, model, options) {

            options = options || {};

            var collection = this;

            function getRecords(ltrPlain, ltr) {

                var p = R.preauthPostData({
                    q: 'SELECT lemma, definitions, form \n' +
                       "  FROM word_definitions w  WHERE substring(lemma from 1 for 1) = %s \n" +
                       "                              OR substring(lemma from 1 for 1) = %s \n" +
                       "                             AND idx <= 1001 \n" +
                       'ORDER BY lemma ASC LIMIT 500;\n',
                    args: [ltrPlain, ltr]
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

                    getRecords(this.lead[0], this.lead[1]);
                    break;

                default:

                    throw new Error('bad method in DefinitionCollectionFirst1K.sync ' + method);
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
    var DefinitionCollectionAll = DefinitionCollectionFirst1K.extend({

        sync: function(method, model, options) {

            options = options || {};

            var collection = this;

            function getRecords(ltrPlain, ltr) {

                var p = R.preauthPostData({
                    q: 'SELECT lemma, definitions, form \n' +
                       "  FROM word_definitions w  WHERE substring(lemma from 1 for 3) = %s \n" +
                       "                              OR substring(lemma from 1 for 3) = %s \n" +
                       'ORDER BY lemma ASC LIMIT 500;\n',
                    args: [ltrPlain, ltr]
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

                    getRecords(this.lead[0], this.lead[1]);
                    break;

                default:

                    throw new Error('bad method in DefinitionCollectionAll.sync ' + method);
                    break;
            }
        }

    });

    var REMOVE_ACCENT = {
        '\u00e1': 'a',
        '\u00e9': 'e',
        '\u00ed': 'i',
        '\u00f3': 'o',
        '\u00fa': 'u',
        '\u00c1': 'A',
        '\u00c9': 'E',
        '\u00cd': 'I',
        '\u00d3': 'O',
        '\u00da': 'U'
    };


    function createLead(begin) {

        var leadPlain = REMOVE_ACCENT[begin.charAt(0)] || begin.charAt(0),
            lead = begin.charAt(0);
        if (begin.length === 1)
            return [leadPlain, lead];

        var letter = REMOVE_ACCENT[begin.charAt(1)] || begin.charAt(1);
        leadPlain = leadPlain + letter;
        lead = lead + begin.charAt(1);
        if (begin.length === 2)
            return [leadPlain, lead];

        letter = REMOVE_ACCENT[begin.charAt(2)] || begin.charAt(2);
        leadPlain = leadPlain + letter;
        lead = lead + begin.charAt(2);

        return [leadPlain, lead];
    }


    // The collection of words backed by a remote server.
    app.Translations = Backbone.Model.extend({

        initialize: function() {

            this.byLetter = {};
            this.byThreeLetters = {};
            this.formsByLemma = {};
        },

        findingOne: function (word) {

            var lead = createLead(word),
                leadList = this.byThreeLetters[lead[0]],
                p = $.Deferred(),
                this_ = this,
                tmp, wc;

            if ( leadList ) {

                var one = leadList.findOne(word);
                p.resolve(one);
            }
            else {

                tmp = new DefinitionCollectionAll();
                tmp.lead = createLead(word);
                tmp.fetch({

                    success: function(list, rsp, opt) {

                        this_.byThreeLetters[tmp.lead[0]] = tmp;
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

        getFirst1KDefCollection: function (ltr) {

            var lead = [REMOVE_ACCENT[ltr] || ltr, ltr],
                ltrList = this.byLetter[lead[0]],
                p = $.Deferred(),
                that = this,
                tmp, wc;

            if ( ltrList ) {

                p.resolve(ltrList);
            }
            else {

                tmp = new DefinitionCollectionFirst1K();
                tmp.lead = lead;
                tmp.fetch({

                    success: function(list, rsp, opt) {

                        that.byLetter[tmp.lead[0]] = tmp;
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
