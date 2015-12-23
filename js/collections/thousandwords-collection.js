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

        _ADD_ACCENT = {
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

    function add_accent(lead) {

        function replace(c) {
            return _ADD_ACCENT[c];
        }
        var newLead = lead.replace(/[aeiouAEIOU]/g, replace);
        return newLead;
    }


    /*
     *  audit text takes body of text from editor and validates it.
     *    returns list of errors, where each error is a misspelled word marker, with 'begin' and 'end'
     *      elements.
     *   If there is a quoted-ratio error, all quoted portions will be included in error list
     */
    app.audit_text = function (dict, text, quoteRatioLimit, next2KRatioLimit) {

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
            accum = 0, errs = [], replacements = [], next2kwords = [],
            wd, trimmed, trimmedLeadLen, err;

        if ( ! /\S/.test(text) ) {
            err = {start: 0, end: 0, type: 'blank'};
            p.resolve([err, [], [], [0,0]]);
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

                                // handle next2k words
                                if (refWd.attributes.idx > 1000) {
                                    err = {begin: accum + trimmedLeadLen,
                                           end: accum + trimmedLeadLen + normRefWord.length,
                                           type: 'next2k'};
                                    next2kwords.push(err);
                                }
                            }
                            else {
                                // if word is good, do nothing special

                                // handle next2k words
                                if (refWd.attributes.idx > 1000) {
                                    err = {begin: accum + trimmedLeadLen,
                                           end: accum + trimmedLeadLen + trimmed.length,
                                           type: 'next2k'};
                                    next2kwords.push(err);
                                }
                            }

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

                accum += wd.length; // only for calculating offsets, not for text size
                if (textParts.length)
                    setTimeout(handleOneWord, 0);
                else
                    finalize();
            }
        }

        function quotedRatio(text, next2kwords) {

            var md = toMarkdown(text),
                wds = md.split(splitWordsOn),
                quotedWords, nonQuotedWords, sumQ, sumNQ, sumN2K;

            quotedWords = _.filter(wds, function(wd) { return wd.charAt(0) === '"' });
            nonQuotedWords = _.filter(wds, function(wd) { return wd.charAt(0) !== '"' });
            sumQ = _.reduce(quotedWords, function(m, n) { return m+ n.length-2; }, 0);
            sumNQ = _.reduce(nonQuotedWords, function(m, n) { return m+ n.length; }, 0);
            sumN2K = _.reduce(next2kwords, function(m, n) { return m+ (n.end - n.begin); }, 0);
            return [sumQ/(sumQ+sumNQ), sumN2K/(sumQ+sumNQ)];
        }

        function finalize() {

            var qRatios = quotedRatio(text2, next2kwords);
            if (qRatios[0] > quoteRatioLimit)
                errs.push({'type': 'quoted'});
            if (qRatios[1] > next2KRatioLimit)
                errs = errs.concat(next2kwords);

            var flippedParts = getFlippable(text2);
            if ( flippedParts.length )
                replacements.push.apply(replacements, flippedParts);

            p.resolve([errs, replacements, next2kwords, qRatios]);
        }

        handleOneWord();
        return p.promise();
    };

    //  lead is  a two-tuple, with both accented and unaccented parts
    function createLead(begin) {

        var letter = REMOVE_ACCENT[begin.charAt(0)] || begin.charAt(0),
            letter_true = begin.charAt(0);
        if (begin.length > 1) {

            letter = letter + (REMOVE_ACCENT[begin.charAt(1)] || begin.charAt(1));
            letter_true = letter_true + begin.charAt(1);
        }

        return [letter_true, letter];
    }


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

        startsWith: function(begin, exact) {

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
            if ( alts && !exact ) return true;

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
    //   this collection grabs a quick list, possibly not complete
    //
    var WordCollectionQuick = Backbone.Collection.extend({

        // Reference to this collection's model.
        model: app.TWEntry,

        initialize: function() {
            this.waitingOnFetch = false;
            this.lead = undefined;
        },

        // gets words
        sync: function(method, model, options) {

            options = options || {};
            this.waitingOnFetch = true;

            var collection = this;

            function getInitialRecords(leads) {

                var ltr = leads[0],
                    accented = leads[1];

                var p = R.preauthPostData({
                    q: 'SELECT distinct word, array_agg(lemma) AS lemmas, bool_or(pronoun_suffix) AS suffix, \n' +
                       '       array_agg(part_of_speech) AS pos, array_agg(part_of_speech_detail) AS posd, \n' +
                       '       ARRAY(SELECT alt FROM alt_words a WHERE a.word = w.word) AS alts, min(lemma_idx) AS idx \n' +
                       '  FROM wordlist w WHERE word IN \n' +
                       '   ( \n' +
                       '   SELECT min(word) \n' +
                        "    FROM wordlist w  WHERE (substring(word from 1 for 1) = %s \n" +
                        "                            OR substring(word from 1 for 1) = %s) \n" +
                       '    GROUP BY substring(word from 1 for 3) \n' +
                       '   ) \n' +
                       ' GROUP BY word \n' +
                       ' ORDER BY word ASC LIMIT 1000; \n',
                    args: [ltr, accented || '']
                });

                p.then(function(resp) {

                    if (resp.row_count[0] === 0)
                        resp.records.rows = [{word: ''}];
                    // console.log('resetting word collection '+tmp);
                    collection.reset(resp.records.rows);
                    collection.waitingOnFetch = false;
                    if ( options && options.success )
                        options.success(resp.records.rows);

                });

                p.fail(function(err) {
                    if ( options && options.error )
                        options.error(err);
                    console.log(err[0] + ' ' + err[1]);
                    collection.waitingOnFetch = false;
                });
            }

            switch(method) {

                case 'read':

                    console.log('getInitialRecords:read '+this.lead);
                    getInitialRecords(this.lead);
                    break;

                default:

                    throw new Error('bad method in WordCollectionQuick.sync ' + method);
                    break;
            }
        },

        // Filter down the list of words to those that start with _begin_
        startsWith: function (begin) {

            return this.filter(function (word) {
                return word.startsWith(begin);
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
                return new WordCollectionQuick(t1);
            }
            else
                return new WordCollectionQuick(t);
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
                suffix: fnd.attributes.suffix,
                idx: fnd.attributes.idx
            });
        },

        whenReady: function(f) {

            var that = this;

            if (this.models.length) {
                f();
            }
            else if (this.waitingOnFetch) {

                // window.console.log('whenReady waitingOnFetch ');
                setTimeout(function() {
                    that.whenReady(f);
                }, 75);
            }
            else {
                // window.console.log('whenReady fetch ');
                this.fetch({
                    success: function() {
                        f();
                    },
                    error: function() {
                        that.whenReady(f);
                    }
                })
            }
        }
    });

    // The collection of words backed by a remote server.
    //   this collection grabs the complete list of records for words starting with lead
    //   lead should be two letters
    //
    var WordCollectionComplete = WordCollectionQuick.extend({

        // gets words
        sync: function(method, model, options) {

            options = options || {};
            this.waitingOnFetch = true;

            var collection = this;
            var tmp = this.lead;


            function getCompleteRecords(leads) {

                var lead = leads[0],
                    accentedLead = leads[1];

                var p = R.preauthPostData({

                     q: 'SELECT distinct word, array_agg(lemma) AS lemmas, bool_or(pronoun_suffix) AS suffix, \n' +
                     '   array_agg(part_of_speech) AS pos, array_agg(part_of_speech_detail) as posd, \n' +
                     ' ARRAY(SELECT alt FROM alt_words a WHERE a.word = w.word) AS alts, min(lemma_idx) as idx \n' +
                     "FROM wordlist w  WHERE (substring(word from 1 for 2) = %s \n" +
                     "                        OR substring(word from 1 for 2) = %s) \n" +
                     'GROUP BY word \n' +
                     'ORDER BY word ASC LIMIT 1000;\n',
                    args: [lead, accentedLead || '']
                });

                p.then(function(resp) {

                    function _useAllRows(rows) {

                        if (rows.length === 0)
                            rows = [{word: ''}];
                        // console.log('resetting word collection '+tmp);
                        collection.reset(rows);
                        collection.waitingOnFetch = false;
                        if ( options && options.success )
                            options.success(rows);
                    }

                    var rows = resp.records.rows || [];
                    if (rows.length < 1000) {

                        return _useAllRows(rows);
                    }
                    else {
                        var p1 = R.preauthPostData({

                            q: 'SELECT distinct word, array_agg(lemma) AS lemmas, bool_or(pronoun_suffix) AS suffix, \n' +
                            '   array_agg(part_of_speech) AS pos, array_agg(part_of_speech_detail) as posd, \n' +
                            ' ARRAY(SELECT alt FROM alt_words a WHERE a.word = w.word) AS alts, min(lemma_idx) as idx \n' +
                            "FROM wordlist w  WHERE (substring(word from 1 for 2) = %s \n" +
                            "                        OR substring(word from 1 for 2) = %s) \n" +
                            'GROUP BY word \n' +
                            'ORDER BY word ASC OFFSET 1000 LIMIT 1000;\n',
                            args: [lead, accentedLead || '']
                        });

                        p1.then(function(resp) {
                            var moreRows = resp.records.rows || [];
                            rows = rows.concat(moreRows);

                            return _useAllRows(rows);
                        });

                        p1.fail(function(err) {
                            if ( options && options.error )
                                options.error(err);
                            console.log(err[0] + ' ' + err[1]);
                            collection.waitingOnFetch = false;
                        });

                        return p1;
                    }

                });

                p.fail(function(err) {
                    if ( options && options.error )
                        options.error(err);
                    console.log(err[0] + ' ' + err[1]);
                    collection.waitingOnFetch = false;
                });
            }

            switch(method) {

                case 'read':

                    console.log('getCompleteRecords:read '+this.lead);
                    getCompleteRecords(this.lead);
                    break;

                default:

                    throw new Error('bad method in WordCollectionComplete.sync ' + method);
                    break;
            }
        }
    });


    // The collection of words backed by a remote server.
    app.ThousandWords = Backbone.Model.extend({

        initialize: function() {

            this.byLetter = {};
            this.byTwoLetters = {}
        },

        // Filter down the list of all words to those starting with begin
        //  returns a promise to be fulfilled with list of words starting with begin
        //   list is not necessarily complete
        //
        startingWith: function (begin) {

            var this_ = this;

            function oneLetter(beginLetter) {

                var lead = [beginLetter, REMOVE_ACCENT[beginLetter] || beginLetter],
                    ltrList = this_.byLetter[lead[0]],
                    p = $.Deferred(),
                    tmp;

                if ( ltrList ) {

                    // window.console.log('startingWith has ltrList ');
                    ltrList.whenReady(function() {
                        tmp = ltrList.filter(function (word) {
                            return word.startsWith(begin);
                        });
                        p.resolve(tmp);
                    })
                }
                else {

                    this_.byLetter[lead[0]] = new WordCollectionQuick();
                    this_.byLetter[lead[0]].lead = lead;
                    // window.console.log('startingWith byLetter[~] fetch '.replace('~', lead));
                    this_.byLetter[lead[0]].fetch({

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
            }

            function twoLetters(begin) {

                var lead = createLead(begin),
                    ltrList = this_.byTwoLetters[lead[0]],
                    p = $.Deferred(),
                    tmp;

                if ( ltrList ) {

                    // window.console.log('startingWith has ltrList ');
                    ltrList.whenReady(function() {
                        tmp = ltrList.filter(function (word) {
                            return word.startsWith(begin);
                        });
                        p.resolve(tmp);
                    })
                }
                else {

                    this_.byTwoLetters[lead[0]] = new WordCollectionComplete();
                    this_.byTwoLetters[lead[0]].lead = lead;
                    this_.byTwoLetters[lead[0]].fetch({

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
            }

            if (begin.length > 1) {
                return twoLetters(begin);
            }
            else {
                return oneLetter(begin.charAt(0));
            }
        },

        prefixLimited: function(begin, lim) {

            var this_ = this,
                WordColl = begin.length > 1 ? WordCollectionComplete : WordCollectionQuick,
                wordLookup = begin.length > 1 ? this_.byTwoLetters : this_.byLetter;

            function _prefixLimited(list, begin, listCtLimit) {

                var prefixLen = 5,
                    listNew, wordItm;

                listNew = _.filter(list.models, function (wd) {
                    return  wd.startsWith(begin);
                });

                while (listNew.length > listCtLimit) {

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
                    if (listNew.length > listCtLimit ) {

                        prevList = listNew.slice(0);
                        listNew.length = 0;
                        listNew.push(prevList[0].clone());

                        for ( i=1; i<prevList.length; ++i ) {

                            if ( prefix.length < prefixLen || ! prevList[i].startsWith(prefix, 'exact') ) {

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
                        if (listNew.length > listCtLimit) {

                            listNew = prevList.slice(0);
                        }
                    }

                    // if still too long, try limiting to first-1000
                    if (listNew.length > listCtLimit ) {

                        prevList = listNew.slice(0);
                        listNew.length = 0;
                        listNew.push(prevList[0].clone());

                        prevList = _.filter(prevList, function(itm) {
                           return itm.attributes.idx <= 1000;
                        });

                        for ( i=1; i<prevList.length; ++i ) {

                            if ( prefix.length < prefixLen || ! prevList[i].startsWith(prefix, 'exact') ) {

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
                        if (listNew.length > listCtLimit) {

                            listNew = prevList.slice(0);
                        }
                    }

                    --prefixLen;
                }

                if (listNew.length === 0 && prefixLen < 4) {

                    prevList = _.first(prevList, listCtLimit);
                    // mark2K(prevList);
                    return new WordColl(prevList);
                }
                else {
                    // mark2K(listNew);
                    return new WordColl(listNew);
                }
            }

            var lead = createLead(begin),
                ltrList = wordLookup[lead[0]],
                p = $.Deferred(),
                wc, tmp;

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

                tmp = new WordColl();
                tmp.lead = lead;
                ltrList = true;
                // window.console.log('prefixLimited WC.fetch ltrList=true');
                tmp.fetch({

                    success: function(col, rsp, opt) {
                        ltrList = tmp;
                        this_.byLetter[lead[0]] = tmp;
                        wc = _prefixLimited(col, begin, lim);
                        p.resolve(wc);
                    },

                    error: function(col, rsp, opt) {

                        p.reject(rsp);
                        delete this_.byLetter[lead[0]];
                    }
                })
            }

            return p.promise();
        },

        findingOne: function (word) {

            var lead = createLead(word),
                ltrList = this.byTwoLetters[lead[0]],
                p = $.Deferred(),
                this_ = this,
                tmp, wc;

            if ( ltrList ) {

                ltrList.whenReady(function() {

                    var one = ltrList.findOne(word);
                    p.resolve(one);
                })
            }
            else {

                tmp = new WordCollectionComplete();
                tmp.lead = lead;
                // window.console.log('findingOne [~] fetch '.replace('~', tmp.lead));
                tmp.fetch({

                    success: function(list, rsp, opt) {

                        this_.byTwoLetters[tmp.lead[0]] = tmp;
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
