/*global Backbone */

(function ($) {
	'use strict';

    var KEY_ENTER = 13,
        KEY_SPACE = 32,
        KEY_TAB = 9,

        WORD_BREAK_RE = new RegExp('[^a-zA-Z\\[\\]`~\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1\u00E1\u00E9\u00ED\u00F3\u00FA\u00F1]+', 'g');

    function getCaretPos($div) {

        var locSelection = rangy.getSelection(),
            charRanges = locSelection.saveCharacterRanges($div.get(0));
        return charRanges[0].characterRange.start;
    }

    function setCaretPos($div, pos) {

        var locSelection = rangy.getSelection(),
            saveCharRanges = locSelection.saveCharacterRanges($div.get(0));
        saveCharRanges[0].characterRange.start = pos;
        saveCharRanges[0].characterRange.end = pos;

        locSelection.restoreCharacterRanges($div.get(0), saveCharRanges);
    }

    function getCaretLine($div) {

        var caretPos = getCaretPos($div),
            _dom = rangy.innerText($div.get(0)),
            preCaret = _dom.substr(0, caretPos);

        var lineEnds = preCaret.match(/\n/g);

        return lineEnds ? lineEnds.length : 0;
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


    function padBlankLines($dom, formerCaretLine) {

        var dom = $dom.html(),
            caretPos = getCaretPos($dom);

        if ( ! ~dom.indexOf('<div><br>') )
            return;

        while ( ~dom.indexOf('<div><br>') ) {
            dom = dom.replace('<div><br>', '<div>&nbsp;<br>');
        }

        $dom.html(dom);

        var _dom = rangy.innerText($dom.get(0)),
            eols = [],
            eolRe = new RegExp('\n', 'g');

        while (eols.length < formerCaretLine + 1) {

            var eol = eolRe.exec(_dom);
            eols.push(eol);
        }
        var newCaretPos = eols.pop().index + 1;

        setCaretPos($dom, newCaretPos);
    }


    function markErrors($div, errs) {

        var sel = rangy.getSelection(),
            rng = rangy.createRange(),
            container;

        var charRanges = sel.saveCharacterRanges($div.get(0)),
            caretPos = charRanges[0].characterRange.start;

        for ( var i=0; i<errs.length; ++i ) {

            var err = errs[i];
            if ( caretPos >= err.begin && caretPos <= err.end )
                continue;

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

            rng.collapse();
            sel.setSingleRange(rng);
        }

        sel.restoreCharacterRanges($div.get(0), charRanges);
        return errs;
    }

    function doReplacements($div, replacements) {

        var sel = rangy.getSelection(),
            rng = rangy.createRange();

        var charRanges = sel.saveCharacterRanges($div.get(0)),
            caretPos = charRanges[0].characterRange.start;

        for ( var i=0; i<replacements.length; ++i ) {

            var rep = replacements[i];
            if ( caretPos >= rep.begin && caretPos <= rep.end )
                continue;

            var container = $div.get(0);
            rng.selectCharacters(container, rep.begin, rep.end);
            sel.setSingleRange(rng);

            document.execCommand('inserttext', false, rep.newVal);

            rng.collapse();
            sel.setSingleRange(rng);
        }

        sel.restoreCharacterRanges($div.get(0), charRanges);
        return replacements;
    }

    function unMarkErrors($div, caretPos) {

        var sel = rangy.getSelection(),
            rng = rangy.createRange();

        var charRanges = sel.saveCharacterRanges($div.get(0));

        var container = $div.get(0);
        rng.selectNodeContents(container);
        sel.setSingleRange(rng);

        document.execCommand('forecolor', false, 'black');

        rng.collapse();
        sel.setSingleRange(rng);

        //setCaretPos($div, caretPos);
        sel.restoreCharacterRanges($div.get(0), charRanges);
    }


    function handleInputErrors($rawDiv) {

        var auditPromise = app.audit_text(app.thousand_words, rangy.innerText($rawDiv.get(0))),
            p = $.Deferred();

        auditPromise.then(function(divEval) {

            unMarkErrors($rawDiv);
            if ( divEval[0].length ) {
                markErrors($rawDiv, divEval[0]);
            }

            if ( divEval[1].length )
                doReplacements($rawDiv, divEval[1]);

            p.resolve(divEval[0].length || null);
        });

        auditPromise.fail(function(err) {
            p.reject(err);
        });

        return p.promise();
    }


    _.extend(etch.config.buttonClasses, {
        'default': ['bold', 'italic', 'save'],
        /* 'all': ['bold', 'italic', 'unordered-list', 'ordered-list', 'link', 'clear-formatting', 'save'], */
        'new': ['bold', 'italic', 'unordered-list', 'ordered-list', 'clear-formatting'],
        'title': ['bold', 'italic']
    });

    app.EditView = Backbone.View.extend({

        el: '#postform .form',

        template: _.template($('#postform-template').html()),

        // Delegated events for creating new items, and clearing completed ones.
        events: {
            'click #post-message': 'postFunction',
            'click #post-cancel': 'postCancel',
            'mousedown .editable': 'editableClick',
            'keypress .editable': 'onKeyPress',
            'keyup .editable': 'onKeyUp'
        },

        editableClick: etch.editableInit,

        wordsView: new app.WordListView(),

        // Render the edit box
        render: function () {

            var data = this.model.toJSON();
            data.makeHtml = app.MessageView.markdown.makeHtml;

            this.$el.html(this.template(data));
            this.$el.closest('#postform').show();
            this._manageButtons();

            this.$el.find('#subject').blur(function() {
               $('.okwords').empty();
            });
            this.$el.find('#new-message').blur(function() {
                $('.okwords').empty();
            });

            return this;
        },

        postFunction: function(ev) {

            var $rawMsg = this.$('#new-message'),
                $rawSubj = this.$('#subject'),
                that = this,
                pM, pS, pM1, pS1;

            pM = handleInputErrors($rawMsg);
            pM1 = pM.then(function(res) {
                that.errorStats['new-message'] = res;
            });

            pS = handleInputErrors($rawSubj);
            pS1 = pS.then(function(res) {
                that.errorStats['subject'] = res;
            });

            $.when(pS1, pM1).then(function () {

                that._manageButtons();
                saveMessage();
            });

            function saveMessage() {

                var msg = toMarkdown($rawMsg.html().replace(/div>/g, 'p>')),
                    subj = toMarkdown($rawSubj.html().replace(/div>/g, 'p>')),
                    tagRe = /<[^>]*>/g,
                    htmlEntityRe = /&[a-zA-Z]+;/g;

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
                }
                function onError(mdl, err, opt) {
                    alert('fail ' + err[0] + err[1] );
                }

                var newModel = new app.Message({
                    body: msg,
                    title: subj,
                    thread_id: that.model.attributes.thread_id,
                    message_id: that.model.attributes.message_id,
                    author: app.userId
                });

                if (newModel.attributes.thread_id) {

                    newModel.save({}, {
                        success: onSuccess,
                        error: onError
                    });
                }
                else if (that.attributes.parent) {

                    var parent = that.attributes.parent;
                    parent.branch({
                        success: function(resp) {

                            var thread_id = resp.message_id;
                            newModel.attributes.thread_id = thread_id;
                            newModel.save({}, {
                                success: onSuccess,
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

        _cleanup: function (ev) {
            this.$el.closest('#postform').hide();
            this.$el.empty();
            this.undelegateEvents();
            this.wordsView.render(false);
        },

        _queue: [],
        _needBlankPadding: undefined,

        onKeyPress: function(ev) {

            if ( ev.charCode )
                this._queue.push(ev.charCode);

            if ( ev.charCode === KEY_ENTER ) {

                var $div = $(ev.target).closest('[contenteditable]');
                this._needBlankPadding = getCaretLine($div);
            }

            //else if (ev.charCode === KEY_TAB) {
            //    var $div = $(ev.target).closest('[contenteditable]');
            //}

            console.log('keypress ' + ev.charCode);
        },

        errorStats: {},

        _manageButtons: function() {

            var $rawMsg = this.$('#new-message').text(),
                $rawSubj = this.$('#subject').text();

            if ( (! this.errorStats['subject']) &&  (! this.errorStats['new-message'])
                && $rawMsg.length && $rawSubj.length ) {

                this.$el.find('#post-message').removeAttr('disabled');
            }
            else {
                this.$el.find('#post-message').attr('disabled', 'disabled');
            }
        },

        onKeyUp: function(ev) {

            var $div, divId, caretPos, wf, word, wordCandidates, p,
                that = this;

            $div = $(ev.target).closest('[contenteditable]');
            divId = $div.attr('id');

            if ( this._needBlankPadding !== undefined ) {

                padBlankLines($div, this._needBlankPadding);
                this._needBlankPadding = undefined;
            }
            else if ( ~this._queue.indexOf(KEY_SPACE) ) {

                var pS = handleInputErrors($div);
                pS.then(function(res) {
                    that.errorStats[divId] = res;
                    that._manageButtons();
                });
                pS.fail(function(res) {
                   var _nada = true;
                });
            }

            this._queue.length = 0;

            caretPos = getCaretPos($div);
            wf = WordFinder($div.get(0), caretPos);
            word = wf.word();

            if ( word && word.length ) {

                p = app.thousand_words.startsWith(word);
                p.then(function(wordCandidates) {

                    console.log('words: ' + _.pluck(_.pluck(wordCandidates, 'attributes'), 'word').join(' '));
                    that.wordsView.render(word);
                });
                p.fail(function(err) {
                   var _nada = 0;
                });
            }
            else {

                console.log('clearing word list');
                that.wordsView.render(false);
            }

            console.log('word ' + word);
            console.log('caret pos ' + caretPos);
        }
    });

})(jQuery);
