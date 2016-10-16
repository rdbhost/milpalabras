/*global Backbone */

(function ($) {
	'use strict';

    var STATUS_BAR_WIDTH = 300,
        WORD_BREAK_RE = new RegExp('[^a-zA-Z\\[\\]`~' + app.constants.FANCY_WORD_CHARS + ']+', 'g'),
        BAR_GOOD_COLOR = 'green',
        BAR_QUOTED_COLOR = 'yellow',
        BAR_NEXT2K_COLOR = 'darkblue',
        BAR_ERROR_COLOR = 'red',

        errCheckCharCodes = _.map(' .,!;?\r\n'.split(''), function(s) { return s.charCodeAt(0) });

    function getCaretPos($div) {

        var locSelection = rangy.getSelection(),
            charRanges = locSelection.saveCharacterRanges($div.get(0));
        return charRanges[0].characterRange.start;
    }

    function WordFinder(_dom, caretPos) {

        // finds sequence of non-whitespace chars around caret

        var dom = rangy.innerText(_dom),
            theWord, start, end;

        function findWord(dom, caretPos) {

            // find wordbreaks before and after word
            var start = 0, end = undefined, word;

            var wordBreak;
            WORD_BREAK_RE.lastIndex = 0;
            while ( wordBreak = WORD_BREAK_RE.exec(dom) )  {

                var b0 = wordBreak.index,
                    b1 = b0 + wordBreak[0].length;

                if ( b0 < caretPos && (b1 > caretPos || b1 === dom.length) ) {
                    // caret in non-word char seq
                    return {start: b0, end: b1, word: undefined}
                }
                else if ( b1 <= caretPos ) {
                    // if wordbreak ends before caret, maybe is start of word
                    start = b1;
                }
                else if ( b0 >= caretPos  ) {
                    // wordbreak starts after caret, so ends word
                    end = b0;
                    break;
                }
            }

            // handle cursor near end as special case
            if ( ! end ) {
                end = dom.length;
            }

            word = dom.substring(start, end);
            word = /\s/.test(word) ? '' : word;

            return {start: start, end: end, word: word};
        }

        var res = findWord(dom, caretPos);
        start = res.start;
        end = res.end;
        theWord = res.word;

        // return object with methods to test word
        return {

            onWord: function() {

                return this.word() !== undefined;
            },

            word: function() {

                return theWord;
            },

            bounds: function() {

                return [start, end];
            }
        }
    }


    function markErrors($div, errs) {

        var sel = rangy.getSelection(),
            rng = rangy.createRange(),
            container;

        // var caretPos = getCaretPos($div);

        for ( var i=0; i<errs.length; ++i ) {

            var err = errs[i];
            //if ( caretPos >= err.begin && caretPos <= err.end )
            //    continue;

            if ( err.type === 'blank' ) {

                container = $div.get(0);

                rng.selectCharacters(container, 0, 1);
                sel.setSingleRange(rng);
                document.execCommand('inserttext', false, '?');

                rng.selectCharacters(container, 0, 1);
                sel.setSingleRange(rng);
                document.execCommand('forecolor', false, 'red');
            }
            else  if ( err.type === 'not-found' ) {

                container = $div.get(0);
                rng.selectCharacters(container, err.begin, err.end);
                sel.setSingleRange(rng);

                document.execCommand('forecolor', false, 'red');
            }
            else  if ( err.type === 'next2k' ) {

                container = $div.get(0);
                rng.selectCharacters(container, err.begin, err.end);
                sel.setSingleRange(rng);

                document.execCommand('forecolor', false, 'red');
            }

            rng.collapse();
            sel.setSingleRange(rng);
        }

        return errs;
    }

    function doReplacements($div, replacements) {

        var sel = rangy.getSelection(),
            rng = rangy.createRange();

        var caretPos = getCaretPos($div);

        for ( var i=0; i<replacements.length; ++i ) {

            var rep = replacements[i];
            if ( caretPos >= rep.begin && caretPos <= rep.end )
                continue;

            var container = $div.get(0);
            rng.selectCharacters(container, rep.begin, rep.end);
            sel.setSingleRange(rng);

            var newVal = rep.newVal + (rep.end-rep.begin > rep.newVal.length ? ' ' : '' );

            document.execCommand('inserttext', false, newVal);

            rng.collapse();
            sel.setSingleRange(rng);
        }

        return replacements;
    }

    function unMarkErrors($div, caretPos) {

        var sel = rangy.getSelection(),
            rng = rangy.createRange();

        var container = $div.get(0);
        rng.selectNodeContents(container);
        sel.setSingleRange(rng);

        document.execCommand('forecolor', false, 'black');

        rng.collapse();
        sel.setSingleRange(rng);

    }


    function doBlueMarking($div, next2kwords, tooBlue) {

        var sel = rangy.getSelection(),
            rng = rangy.createRange(),
            blueWords = [],
            container;

        for ( var i=0; i<next2kwords.length; ++i ) {

            var bWord = next2kwords[i];

            container = $div.get(0);

            rng.selectCharacters(container, bWord.begin, bWord.end);
            sel.setSingleRange(rng);
            document.execCommand('forecolor', false, '#00008b');

            blueWords.push(sel.toString());

            rng.collapse();
            sel.setSingleRange(rng);

            if (tooBlue) {

                rng.selectCharacters(container, bWord.begin, bWord.begin+1);
                sel.setSingleRange(rng);
                document.execCommand('forecolor', false, 'red');
                rng.collapse();
                sel.setSingleRange(rng);
            }

        }

        return blueWords;
    }

    _.extend(etch.config.buttonClasses, {
        'default': ['bold', 'italic', 'save'],
        /* 'all': ['bold', 'italic', 'unordered-list', 'ordered-list', 'link', 'clear-formatting', 'save'], */
        'new': ['bold', 'italic', 'unordered-list', 'ordered-list'],
        'title': ['bold', 'italic']
    });

    function monitorSave(jsn) {

        var q = 'INSERT INTO "message_monitor" (json) VALUES (%s);';

        var p = window.Rdbhost.preauthPostData({
            authcode: '-',
            q: q,
            args: [jsn]
        });

        return p.then(function(r) {
            true;
        }, function(e) {
            alert(e);
        })
    }

    app.EditView = Backbone.View.extend({

        el: '#postform .form',

        template: _.template($('#postform-template').html()),
        noGoTemplate: _.template($('#postform-null-template').html()),

        // Delegated events for creating new items, and clearing completed ones.
        events: {
            'click #post-message': 'postFunction',
            'click #post-cancel': 'postCancel',
            'mousedown .editable': 'editableClick',
            'keypress .editable': 'onKeyPress',
            'keyup .editable': 'onKeyUp',
            'keydown .editable': 'onKeyDown',

            'blur .editable' : 'onLoseFocus'
        },

        editableClick: function(ev) {
            return etch.editableInit(ev);
        },
        wordsView: new app.WordListView(),
        lookupView: new app.DefnListView(),

        initialize: function(opts) {

            var this_ = this;
            this.found_words = {};
            this._monitor = {};
            this._monitor['interval'] = setInterval(function() {

                var $rawMsg = this.$('#new-message').text(),
                    $rawSubj = this.$('#title').text();

                var jsn = {'title': $rawSubj, 'body': $rawMsg, 'poster': app.userId},
                    json = JSON.stringify(jsn, null, 2);

                if (json === this_._monitor['json'])
                    return;

                this_._monitor['json'] = json;
                var pr = monitorSave(json);

            }, 10*1000)
        },

        // Render the edit box
        render: function () {

            var data = this.model.toJSON();
            data.makeHtml = app.MessageView.markdown.makeHtml;
            app.recentPostCt = app.recentPostCt || 0; // safety

            if (app.recentPostCt < app.constants.DAILY_POST_LIMIT) {

                this.$el.html(this.template(data));
            }
            else
                this.$el.html(this.noGoTemplate({}));

            this.$el.closest('#postform').show();
            this._manageButtons();

            this.$el.find('#title').blur(function() {
               $('.okwords').empty();
            });
            this.$el.find('#new-message').blur(function() {
                $('.okwords').empty();
            });

            return this;
        },

        postFunction: function(ev) {

            var $rawMsg = this.$('#new-message'),
                $rawSubj = this.$('#title'),
                that = this,
                pM, pS, pM1, pS1, quoteRatio;

            pM = this.handleInputMarking($rawMsg);
            pM1 = pM.then(function(resp) {

                that.errorStats['new-message'] = resp[0];
                $rawMsg.data('dirty', false);
                return [resp[1], resp[2]]; // return stats and n2kwords
            });

            pS = this.handleInputMarking($rawSubj);
            pS1 = pS.then(function(resp) {

                that.errorStats['title'] = resp[0];
                $rawSubj.data('dirty', false);
                return [resp[1], resp[2]]; // return stats and n2kwords
            });

            var pAll = $.when(pS1, pM1);
            pAll.then(function (respS1, respM1) {

                var n2kwords = _.union(respS1[1], respM1[1]);
                that._manageButtons();
                saveMessage(n2kwords);
            });
            pAll.fail(function(err) {

                that._manageButtons();
                alert('message not saved ' + err[0] + ' ' + err[1]);
            });


            function saveMessage(n2kwords) {

                var rawMsg = $rawMsg.html().replace(/div>/g, 'p>'),
                    rawSubj = $rawSubj.html().replace(/div>/g, 'p>'),
                    msg, subj,
                    tagRe = /<[^>]*>/g,
                    htmlEntityRe = /&[a-zA-Z]+;/g;

                rawMsg = rawMsg.replace(/<i>\s+/g, '<i>').replace(/\s+<\/i>/g, '</i>').replace('<i><br></i>', '<br>')
                               .replace(/<b>\s+/g, '<b>').replace(/\s+<\/b>/g, '</b>').replace('<b><br></b>', '<br>');
                rawSubj = rawSubj.replace(/<i>\s+/g, '<i>').replace(/\s+<\/i>/g, '</i>').replace('<i><br></i>', '<br>')
                                 .replace(/<b>\s+/g, '<b>').replace(/\s+<\/b>/g, '</b>').replace('<b><br></b>', '<br>')
                                 .replace('\n', ' ');
                msg = toMarkdown(rawMsg);
                subj = toMarkdown(rawSubj);

                function convertHtmlEntities(ht) {
                    var c = $('<div/>').html(ht).text().charAt(0);
                    return (c === String.fromCharCode(160)) ? ' ' : c;
                }

                msg = msg.replace(tagRe, '').replace(htmlEntityRe, convertHtmlEntities);
                subj = subj.replace(tagRe, '').replace(htmlEntityRe, convertHtmlEntities);

                function onSuccess(mdl, resp, opt) {
                    if ( typeof that.model.attributes.thread_id === 'undefined' )
                        app.threads.fetch({ reset: true });
                    else
                        app.thread.fetch({ reset: true });
                    that._cleanup(ev);
                    app.recentPostCt += 1;
                }
                function onError(mdl, err, opt) {
                    alert('fail ' + err[0] + err[1] );
                }

                var n2k = '{' + _.map(n2kwords, function(i) {return '"' + i + '"';}).join(',') + '}';

                var newModel = new app.Message({
                    body: msg,
                    title: subj,
                    thread_id: that.model.attributes.thread_id,
                    message_id: that.model.attributes.message_id,
                    next2k_words: n2k,
                    author: app.userId
                });

                if (newModel.attributes.thread_id) {

                    newModel.save({}, {

                        success: onSuccess,
                        error: onError
                    });
                }
                else if (that.attributes && that.attributes.parent) {

                    var parent = that.attributes.parent;
                    parent.branch({
                        success: function(resp) {

                            newModel.attributes.thread_id = resp.message_id;
                            newModel.save({}, {
                                success: function(mdl, resp, opt) {
                                    onSuccess(mdl, resp, opt);
                                    app.milPalabrasRouter.navigate('#!/t/'+mdl.attributes.thread_id, {trigger: true});
                                },

                                error: onError
                            });
                        },
                        error: onError
                    });
                }
                else {

                    newModel.save({}, {
                        success: onSuccess,
                        error: onError
                    });
                }
            }

            ev.stopImmediatePropagation();
        },

        postCancel: function(ev) {

            this._cleanup(ev);
        },

        handleInputMarking: function($rawDiv) {

            var ratioQuotedLimit, ratioN2kLimit, divId,
                this_ = this;
            this_._queue.length = 0;

            divId = $rawDiv.attr('id');
            ratioQuotedLimit = divId === 'title' ? app.constants.TITLE_RATIO : app.constants.BODY_RATIO;
            ratioN2kLimit = divId === 'title' ? app.constants.TITLE2K_RATIO : app.constants.TWOK_RATIO;

            var caretPos = getCaretPos($rawDiv);

            var auditPromise = app.audit_text(app.thousand_words, this_.found_words,
                                                rangy.innerText($rawDiv.get(0)), caretPos,
                                                ratioQuotedLimit, ratioN2kLimit);

            return auditPromise.then(function(divEval) {

                if (this_._queue.length > 0)
                    return this_.handleInputMarking($rawDiv);

                var errors = divEval[0],
                    replacements = divEval[1],
                    blueWords = divEval[2],
                    stats = divEval[3],
                    tooBlue = stats.pop(),
                    n2kwords;

                console.log('audit-promise done ');

                var caretPosObj = rangy.saveSelection();

                unMarkErrors($rawDiv);
                doReplacements($rawDiv, replacements);
                n2kwords = doBlueMarking($rawDiv, blueWords, tooBlue);
                markErrors($rawDiv, errors);

                rangy.restoreSelection(caretPosObj);

                return [errors, stats, n2kwords];
            })
            .fail(function(err) {

                throw err;
            });
        },

        _cleanup: function (ev) {
            this.$el.closest('#postform').hide();
            this.$el.empty();
            this.undelegateEvents();
            this.wordsView.render(false);
            this.lookupView.render(false);

            var key = this.model.messageCacheKey();
            if (this.attributes && this.attributes.parent)
                key = 'parent ' + this.attributes.parent.messageCacheKey();
            delete app.cachedMessages[key];

            if (this._monitor)
                this._monitor = clearInterval(this._monitor);
        },

        cleanup: function(ev) {
            return this._cleanup(ev);
        },

        _queue: [],      // stores chars entered; added to by keypress, removed by keyup
        found_words: {}, // hash for storing words already used for ready re-validation

        onKeyPress: function(ev) {

            // triggers on displayable keystrokes only
            if (ev.charCode)
                this._queue.push(ev.charCode);

            // mark div getting key-char as 'dirty', in need of checking
            var $div = $(ev.target).closest('[contenteditable]');
            $div.data("dirty", true);

            if (ev.charCode === app.constants.ENTER_KEY) {

                if ($div.attr('id') === 'title') {
                    // block enter-key in subject field
                    ev.preventDefault();
                }
            }

            // console.log('keypress ' + ev.charCode);
        },

        errorStats: {},

        _updateStatusBar: function(stats) {

            var quotedRatio = stats[0],
                next2kRatio = stats[1],

                quotedBarSize = Math.round(STATUS_BAR_WIDTH * quotedRatio),
                next2KBarSize = Math.round(STATUS_BAR_WIDTH * next2kRatio),
                goodBarSize = STATUS_BAR_WIDTH - quotedBarSize - next2KBarSize,

                quoteLimit = app.constants.BODY_RATIO,
                next2kLimit = app.constants.TWOK_RATIO;

            $('#bar-quoted').css({
                'width': Math.round(quotedBarSize),
                'background-color': quotedRatio > quoteLimit ? BAR_ERROR_COLOR : BAR_QUOTED_COLOR
            });
            $('#bar-good').css({
                'width': goodBarSize,
                'background-color': BAR_GOOD_COLOR
            });
            $('#bar-next-2K').css({
                'width': next2KBarSize,
                'background-color': next2kRatio > next2kLimit ? BAR_ERROR_COLOR : BAR_NEXT2K_COLOR
            });
        },

        _manageButtons: function() {

            var rawMsg = this.$('#new-message').text(),
                rawSubj = this.$('#title').text(),
                nmErr = this.errorStats['new-message'],
                subErr = this.errorStats['title'],
                this_ = this;

            if ( (! subErr || ! subErr.length) &&  (! nmErr || ! nmErr.length)
                && rawMsg.length && rawSubj.length) {

                this.$el.find('#post-message').removeAttr('disabled');
            }
            else {
                this.$el.find('#post-message').attr('disabled', 'disabled');
            }

            function error_show(tag) {
                var $errmsgs = this_.$el.find('#edit-error');
                $errmsgs.find('span').hide();
                if (tag)
                    $errmsgs.find('.'+tag).show();
            }

            if ( ! rawSubj.length ) {

                error_show('no-title');
            }
            else if ( ! rawMsg.length ) {

                error_show('no-body');
            }
            else if ( nmErr && nmErr.length ) {

                if ( nmErr[0].type === 'quoted' )
                    error_show('excess-quotes');
                else if ( nmErr[0].type === 'next2k' )
                    error_show('too-uncommon');
                else
                    error_show('body-errors');
            }
            else if ( subErr && subErr.length ) {

                if ( subErr[0].type === 'quoted' )
                    error_show('excess-quotes-title');
                else
                    error_show('title-errors');
            }
            else {
                error_show('');
            }
        },

        onKeyUp: function(ev) {

            var $selDiv, divId, caretPos, wf, word, p,
                this_ = this,
                c = app.constants;

            $selDiv = $(ev.target).closest('[contenteditable]');
            divId = $selDiv.attr('id');

             var wordEndKeys = _.intersection(this._queue, errCheckCharCodes);

            if ( wordEndKeys.length ) {

                var pS = this.handleInputMarking($selDiv);
                pS.then(function(resp) {

                    var stats = resp[1];
                    this_.errorStats[divId] = resp[0];
                    this_._manageButtons();
                    if ( divId !== 'title' )
                        this_._updateStatusBar(stats);
                    $selDiv.data('dirty', false);
                });

                pS.fail(function(e) {

                   throw e;
                });
            }

            this._queue.length = 0;

            caretPos = getCaretPos($selDiv);
            wf = WordFinder($selDiv.get(0), caretPos);
            word = wf.word();

            // console.log('word ' + word);
            // console.log('caret pos ' + caretPos);

            if ( word && word.length ) {

                console.log('wordsview '+word);
                p = app.thousand_words.startingWith(word.toLowerCase());
                p.then(function(wordCandidates) {

                    this_.wordsView.render(word.toLowerCase());
                });
                p.fail(function(err) {

                    throw err;
                });
            }
            else {

                console.log('clearing word list');
                this_.wordsView.render(false);
            }

            ev.preventDefault();
        },

        onLoseFocus: function(ev) {

            var $div = $(ev.target).closest('[contenteditable]'),
                divId = $div.attr('id'),
                this_ = this,
                key = this.model.messageCacheKey();

            if (this.attributes && this.attributes.parent) {

                key = 'parent ' + this.attributes.parent.messageCacheKey();
            }

            app.cachedMessages[key] = this.model;
            if ( !$div.data('dirty') )
                return;

            var pS = this.handleInputMarking($div);
            pS.then(function(resp) {

                this_.errorStats[divId] = resp[0];
                this_._manageButtons();
                if ( divId !== 'title' )
                    this_._updateStatusBar(resp[1]);
                $div.data('dirty', false);
            });

            pS.fail(function(e) {

                $div.data('dirty', false);
                throw e;
            });

        }
    });

})(jQuery);
