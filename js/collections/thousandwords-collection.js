/*global Backbone */



(function () {
    'use strict';

    var R = window.Rdbhost,

        // ?!#$%[]&«‹¡-¿»›
        trimmingRegExp = new RegExp(app.constants.TRIMMING_RE, 'g'),

        okNonWords = new RegExp(app.constants.NONWORD_RE, ''),

        splitWordsOnKp = new RegExp('(' + app.constants.WORD_SPLIT_RE + ')', 'g'),
        splitWordsOn = new RegExp(app.constants.WORD_SPLIT_RE, 'g'),

        SUFFIXES = ['me', 'te', 'lo', 'la', 'nos', 'os', 'los', 'las', 'le', 'les',
                    'melo', 'telo', 'selo', 'mela', 'tela', 'sela',
                    'melos', 'telos', 'selos', 'melas', 'telas', 'selas' ],

        ADD_ACCENT = {
            'a': '\u00e1',
            'e': '\u00e9',
            'i': '\u00ed',
            'o': '\u00f3',
            'u': '\u00fa',
            'A': '\u00c1',
            'E': '\u00c9',
            'I': '\u00cd',
            'O': '\u00d3',
            'U': '\u00da'
        },

        REMOVE_ACCENT = {
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
        },

        x;


    /*
     *  audit text takes body of text from editor and validates it.
     *    returns list of errors, where each error is a misspelled word marker, with 'begin' and 'end'
     *      elements.
     *   If there is a quoted-ratio error, all quoted portions will be included in error list
     */
    app.audit_text = function (dict, text, quoteRatio) {

        function trim(wd) {

            return wd.replace(trimmingRegExp, '');
        }

        var qRe = new RegExp(app.constants.QUOTED_RE, 'g'),
            text2 = text.replace(qRe, function(match) {
                var s = new Array(match.length-1).join('~'); // creates '~~' of length match-2
                return '"' + s + '"';
            });
        var textParts = text2.split(splitWordsOnKp),
            p = $.Deferred(),
            accum = 0, errs = [], replacements = [],
            wd, trimmed, trimmedLeadLen, err;

        if ( ! /\S/.test(text) ) {
            err = {start: 0, end: 0, type: 'blank'};
            p.resolve([err]);
        }

        function getFlippable(text) {

            var flipRe = new RegExp('([?!])[a-zA-Z]', 'g'),
                convertRe = new RegExp('(<)[a-zA-Z]|[a-zA-Z](>)', 'g'),
                changes = [], chg, m;

            while (m = flipRe.exec(text)) {

                if (m[1] === '!')
                    chg = {begin: m.index, end: m.index+1, newVal: '\u00a1', type: 'replace'};
                else if (m[1] === '?')
                    chg = {begin: m.index, end: m.index+1, newVal: '\u00bf', type: 'replace'};

                changes.push(chg);
            }

            while (m = convertRe.exec(text)) {

                if (m[1] === '<')
                    chg = {begin: m.index, end: m.index+1, newVal: '\u00ab', type: 'replace'};
                else if (m[2] === '>')
                    chg = {begin: m.index+1, end: m.index+2, newVal: '\u00bb', type: 'replace'};

                changes.push(chg);
            }

            return changes;
        }

        function handleOneWord() {

            wd = textParts.shift();

            if ( wd.length && ! /\s/.test(wd) ) {

                if ( wd.charAt(0) === '"' ) {

                    err = {'start': accum, 'end': accum + wd.length, 'type': 'quoted'};
                    // quotedParts.push(err);

                    accum += wd.length;
                    if (textParts.length)
                        setTimeout(handleOneWord, 0);
                    else
                        finalize();
                }
                else {

                    trimmed = trim(wd);
                    trimmedLeadLen = wd.indexOf(trimmed);

                    // skip numbers and other ok non-words
                    if ( trimmed && ! okNonWords.test(trimmed) ) {

                        var p = dict.findingOne(trimmed.toLowerCase());
                        p.then(function(refWd) {

                            if ( ! refWd ) {

                                console.log('word not found: ' + trimmed);
                                err = {begin: accum + trimmedLeadLen,
                                       end: accum + trimmedLeadLen + trimmed.length,
                                       type: 'not-found'};
                                errs.push(err);
                            }
                            else if ( refWd.attributes.word !== trimmed.toLowerCase() ) {

                                console.log('replacement: ' + refWd.attributes.word + ' ' + trimmed);
                                var normRefWord = normalizeWord(trimmed, refWd.attributes.word);
                                err = {begin: accum + trimmedLeadLen,
                                       end: accum + trimmedLeadLen + trimmed.length,
                                       newVal: normRefWord,
                                       type: 'replace'};
                                replacements.push(err);
                            }
                            else
                                ; // if word is good, do nothing special

                            accum += wd.length;
                            if (textParts.length)
                                setTimeout(handleOneWord, 0);
                            else
                                finalize();
                        });
                        p.fail(function(err) {
                            console.log(err[0] + err[1]);
                            p.reject(err);
                        })
                    }
                    else {

                        accum += wd.length;
                        if (textParts.length)
                            setTimeout(handleOneWord, 0);
                        else
                            finalize();
                    }
                }
            }
            else {

                accum += wd.length;
                if (textParts.length)
                    setTimeout(handleOneWord, 0);
                else
                    finalize();
            }
        }

        function quotedRatio(text) {

            var md = toMarkdown(text),
                wds = md.split(splitWordsOn),
                wds2, quotedWords, nonQuotedWords, sumQ, sumNQ;

            quotedWords = _.filter(wds, function(wd) { return wd.charAt(0) === '"' });
            nonQuotedWords = _.filter(wds, function(wd) { return wd.charAt(0) !== '"' });
            sumQ = _.reduce(quotedWords, function(m, n) { return m+ n.length-2; }, 0);
            sumNQ = _.reduce(nonQuotedWords, function(m, n) { return m+ n.length; }, 0);
            return sumQ/(sumQ+sumNQ);
        }

        function finalize() {

            var qRatio = quotedRatio(text2);
            if (qRatio > quoteRatio)
                errs.push({'start': accum, 'end': accum + wd.length, 'type': 'quoted'});

            var flippedParts = getFlippable(text2);
            if ( flippedParts.length )
                replacements.push.apply(replacements, flippedParts);

            p.resolve([errs, replacements]);
        }

        handleOneWord();
        return p.promise();
    };


    function normalizeWord(typed, fromWL) {

        typed = typed.replace(/[~`]/g, '');

        if ( typed.length === 1 )
            return typed;

        var initialCap = typed.charAt(0) !== typed.charAt(0).toLowerCase(),
            secondCap = typed.charAt(1) !== typed.charAt(1).toLowerCase();

        if ( secondCap )
            return fromWL.toUpperCase();
        else if ( initialCap )
            return fromWL.charAt(0).toUpperCase() + fromWL.substr(1);
        else
            return fromWL;
    }

    // Object for each word in okwords list.
    app.TWEntry = Backbone.Model.extend({

        defaults: {
            okmulti: '',
            pronounsExpanded: false
        },

        match: function(wd) {

            var attrs = this.attributes;
            if ( attrs.word.toLowerCase() === wd.toLowerCase() )
                return attrs.word;

            var alt = _.find(attrs.alts, function(m) {
                return m.toLowerCase() === wd.toLowerCase();
            });
            if ( alt ) return attrs.word;

            if ( attrs.pronounsExpanded && attrs.pronounsExpanded.length ) {

                alt = _.find(attrs.pronounsExpanded, function(m) {
                    return m[0].toLowerCase() === wd.toLowerCase();
                });
                if ( alt )
                    return attrs.word+alt[1];
            }

            return null;
        },

        startsWith: function(begin) {

            var attrs = this.attributes,
                alts;

            if ( attrs.suffix && begin.length > attrs.word.length && ! attrs.pronounsExpanded ) {

                attrs.pronounsExpanded = [];
                alts = attrs.alts.slice(0);
                if ( ! alts.length )
                    alts = [attrs.word]; // ensure basic word is expanded
                _.forEach(alts, function(alt) {
                    _.forEach(SUFFIXES, function(suf) {

                        attrs.pronounsExpanded.push([alt+suf, suf]);
                    })
                });
            }

            if ( attrs.word.substr(0, begin.length).toLowerCase() === begin.toLowerCase() )
                return true;

            alts = _.some(attrs.alts, function(m) {
                return m.substr(0, begin.length).toLowerCase() === begin.toLowerCase();
            });
            if ( alts ) return true;

            if ( attrs.pronounsExpanded && attrs.pronounsExpanded.length ) {

                alts = _.find(attrs.pronounsExpanded, function(m) {
                    return m[0].substr(0, begin.length).toLowerCase() === begin.toLowerCase();
                });
                return alts;
            }

            return false;
        },

        startsWithExactly: function(begin) {

            var attrs = this.attributes,
                tAlts, alts;

            if ( attrs.suffix && begin.length > attrs.word.length && ! attrs.pronounsExpanded ) {

                attrs.pronounsExpanded = [];
                tAlts = attrs.alts.slice(0);
                if ( ! alts.length )
                    tAlts = [attrs.word]; // ensure basic word is expanded
                _.forEach(tAlts, function(alt) {
                    _.forEach(SUFFIXES, function(suf) {

                        attrs.pronounsExpanded.push([alt+suf, suf]);
                    })
                });
            }

            if ( attrs.word.substr(0, begin.length).toLowerCase() === begin.toLowerCase() )
                return true;

            if ( attrs.pronounsExpanded && attrs.pronounsExpanded.length ) {

                alts = _.find(attrs.pronounsExpanded, function(m) {
                    return m[0].substr(0, begin.length).toLowerCase() === begin.toLowerCase();
                });
                return alts;
            }

            return false;
        },

        getPrefix: function(prefixLen) {

            return this.attributes.word.substr(0, prefixLen);
        },

        setOKMulti: function(val) {

            this.attributes.okmulti = val;
        },

        getWordLength: function() {

            return this.attributes.word.length;
        }
    });


    // Dictionary Words Collection
    // ---------------

    // The collection of words backed by a remote server.
    var WordCollection = Backbone.Collection.extend({

        // Reference to this collection's model.
        model: app.TWEntry,

        // Save all of the thread items under the `"threads"` namespace.
        // localStorage: new Backbone.LocalStorage('threads-backbone'),
        sync: function(method, model, options) {

            options = options || {};

            var collection = this;
            var tmp = this.letter;


            function getRecords(ltr, accented) {

                var p = R.preauthPostData({
                    q: 'SELECT distinct word, array_agg(lemma) AS lemmas, bool_or(pronoun_suffix) AS suffix, \n' +
                        '   array_agg(part_of_speech) AS pos, array_agg(part_of_speech_detail) as posd, \n' +
                        ' ARRAY(SELECT alt FROM alt_words a WHERE a.word = w.word) AS alts \n' +
                        "FROM wordlist w  WHERE substring(word from 1 for 1) = %s \n" +
                        "                    OR substring(word from 1 for 1) = %s \n" +
                        'GROUP BY word \n' +
                        'ORDER BY word ASC LIMIT 1000;\n',
                    args: [ltr, accented || '']
                });

                p.then(function(resp) {

                    if (resp.row_count[0] === 0)
                        resp.records.rows = [{word: ''}];
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

                    getRecords(this.letter, ADD_ACCENT[this.letter]);
                    break;

                default:

                    throw new Error('bad method in WordCollection.sync ' + method);
                    break;
            }
        },

        // Filter down the list of words to those that start with _begin_
        startsWith: function (begin) {

            return this.filter(function (word) {
                return word.startsWith(begin);
            });
        },

        // Filter down the list of words to those that start with _begin_
        startsWithExactly: function (begin) {

            return this.filter(function (word) {
                return word.startsWithExactly(begin);
            });
        },

        prefixLimited: function(begin, lim) {

            var t = _.filter(this.models, function(wd) {
                    return  wd.startsWith(begin);
                }),
                prefixLen = 4,
                _t;
            while ( t.length > lim ) {

                var t1 = t.slice(0),
                    prefix = t1[0].getPrefix(prefixLen);
                t.length = 0;
                t.push(t1[0].clone());

                for ( var i=1; i<t1.length; ++i ) {

                    if ( prefix.length < prefixLen || ! t1[i].startsWith(prefix) ) {

                        _t = t1[i].clone();
                        t.push(_t);
                        prefix = _t.getPrefix(prefixLen);
                    }
                    else {

                        _t = t[t.length-1];
                        t[t.length-1].setOKMulti('okmulti');

                        if ( prefix.length < prefixLen && t1[i].getWordLength() > prefix.length )
                            prefix = t1[i].getPrefix(prefixLen)
                    }
                }

                --prefixLen;

            }

            if ( t.length === 0 && prefixLen < 4 ) {

                t1 = _.first(t1, lim);
                return new WordCollection(t1);
            }
            else
                return new WordCollection(t);
        },

        findOne: function (word) {

            var fnd = this.find(function (wd) {
                return wd.match(word);
            });

            if ( ! fnd )
                return undefined;

            var wd = fnd.match(word);
            return new app.TWEntry({
                word: wd,
                lemmas: fnd.attributes.lemmas,
                pos: fnd.attributes.pos,
                posd: fnd.attributes.posd,
                suffix: fnd.attributes.suffix
            });
        },

        whenReady: function(f) {

            if (this.models.length) {
                f();
            }
            else {
                this.fetch({
                    success: function() {
                        f();
                    },
                    error: function() {
                        this.whenReady(f);
                    }
                })
            }
        }
    });

    // The collection of words backed by a remote server.
    app.ThousandWords = Backbone.Model.extend({

        initialize: function() {

            var that = this;
            that.byLetter = {};
        },

        // Filter down the list of all words to those starting with begin
        startingWith: function (begin) {

            var letter = REMOVE_ACCENT[begin.charAt(0)] || begin.charAt(0),
                ltrList = this.byLetter[letter],
                p = $.Deferred(),
                tmp;

            if ( ltrList ) {

                ltrList.whenReady(function() {
                    tmp = ltrList.filter(function (word) {
                        return word.startsWith(begin);
                    });
                    p.resolve(tmp);
                })
            }
            else {

                this.byLetter[letter] = new WordCollection();
                this.byLetter[letter].letter = letter;
                this.byLetter[letter].fetch({

                    success: function(col, rsp, opt) {
                        tmp = col.filter(function (word) {
                            return word.startsWith(begin);
                        });
                        p.resolve(tmp);
                    },

                    error: function(col, rsp, opt) {
                        p.reject(rsp);
                    }
                })
            }

            return p.promise();
        },

        prefixLimited: function(begin, lim) {

            function _prefixLimited(list, begin, lim) {

                var prefixLen = 5,
                    listNew, wordItm;

                listNew = _.filter(list.models, function (wd) {
                    return  wd.startsWith(begin);
                });

                while (listNew.length > lim) {

                    var prevList = listNew.slice(0),
                        prefix = prevList[0].getPrefix(prefixLen);
                    listNew.length = 0;
                    listNew.push(prevList[0].clone());

                    for (var i = 1; i < prevList.length; ++i) {

                        if (prefix.length < prefixLen || !prevList[i].startsWith(prefix)) {

                            wordItm = prevList[i].clone();
                            listNew.push(wordItm);
                            prefix = wordItm.getPrefix(prefixLen);
                        }
                        else {

                            wordItm = listNew[listNew.length - 1];
                            listNew[listNew.length - 1].setOKMulti('okmulti');

                            if (prefix.length < prefixLen && prevList[i].getWordLength() > prefix.length)
                                prefix = prevList[i].getPrefix(prefixLen)
                        }
                    }

                    // if still too long, try limiting to exact matches
                    if (listNew.length > lim ) {

                        prevList = listNew.slice(0);
                        listNew.length = 0;
                        listNew.push(prevList[0].clone());

                        for ( i=1; i<prevList.length; ++i ) {

                            if ( prefix.length < prefixLen || ! prevList[i].startsWithExactly(prefix) ) {

                                wordItm = prevList[i].clone();
                                listNew.push(wordItm);
                                prefix = wordItm.getPrefix(prefixLen);
                            }
                            else {

                                wordItm = listNew[listNew.length-1];
                                listNew[listNew.length-1].setOKMulti('okmulti');

                                if ( prefix.length < prefixLen && prevList[i].getWordLength() > prefix.length )
                                    prefix = prevList[i].getPrefix(prefixLen)
                            }
                        }

                        // if exact-match list still too long, revert to fuzzy-match list and reiterate
                        if (listNew.length > lim) {

                            listNew = prevList.slice(0);
                        }
                    }

                    --prefixLen;
                }

                if (listNew.length === 0 && prefixLen < 4) {

                    prevList = _.first(prevList, lim);
                    return new WordCollection(prevList);
                }
                else
                    return new WordCollection(listNew);
            }

            var indexChar = REMOVE_ACCENT[begin.charAt(0)] || begin.charAt(0),
                ltrList = this.byLetter[indexChar],
                p = $.Deferred(),
                wc, tmp, that;

            function _ltrList() {

                if ( ltrList === true ) {

                    setTimeout(_ltrList, 10);
                }
                else {

                    wc = _prefixLimited(ltrList, begin, lim);
                    p.resolve(wc);
                }
            }
            if ( ltrList ) {
                _ltrList();
            }
            else {

                tmp = new WordCollection();
                tmp.letter = indexChar;
                ltrList = true;
                tmp.fetch({

                    success: function(col, rsp, opt) {
                        ltrList = tmp;
                        that.byLetter[indexChar] = tmp;
                        wc = _prefixLimited(col, begin, lim);
                        p.resolve(wc);
                    },

                    error: function(col, rsp, opt) {

                        p.reject(rsp);
                        delete that.byLetter[indexChar];
                    }
                })
            }

            return p.promise();
        },

        findingOne: function (word) {

            var indexChar = REMOVE_ACCENT[word.charAt(0)] || word.charAt(0),
                ltrList = this.byLetter[indexChar],
                p = $.Deferred(),
                that = this,
                tmp, wc;

            if ( ltrList ) {

                ltrList.whenReady(function() {

                    var one = ltrList.findOne(word);
                    p.resolve(one);
                })
            }
            else {

                tmp = new WordCollection();
                tmp.letter = indexChar;
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
        }
    });

})();
