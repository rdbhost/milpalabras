/*global Backbone */

(function ($) {
	'use strict';

    var KEY_ENTER = 13,
        KEY_SPACE = 32;

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
            wordBreaks = new RegExp('[^a-zA-Z]+', 'g'),
            theWord, start, end;

        function findWord(dom, caretPos) {

            // find wordbreaks before and after word
            var start = 0, end = undefined, word;

            var wordBreak;
            while ( wordBreak = wordBreaks.exec(dom) )  {

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
            rng = rangy.createRange();

        var charRanges = sel.saveCharacterRanges($div.get(0)),
            caretPos = charRanges[0].characterRange.start;

        for ( var i=0; i<errs.length; ++i ) {

            var err = errs[i];
            if ( caretPos >= err.begin && caretPos <= err.end )
                continue;

            var container = $div.get(0);
            rng.selectCharacters(container, err.begin, err.end);
            sel.setSingleRange(rng);

            if ( err.type === 'not-found' ) {

                document.execCommand('forecolor', false, 'red');
            }
            else if ( err.type === 'replace' ) {

                document.execCommand('inserttext', false, err.newVal)
            }

            rng.collapse();
            sel.setSingleRange(rng);
        }

        sel.restoreCharacterRanges($div.get(0), charRanges);
        return errs;
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

    _.extend(etch.config.buttonClasses, {
        'default': ['bold', 'italic', 'save'],
        'all': ['bold', 'italic', 'unordered-list', 'ordered-list', 'link', 'clear-formatting', 'save'],
        'new': ['bold', 'italic', 'unordered-list', 'ordered-list', 'link', 'clear-formatting'],
        'title': ['bold', 'italic']
    });

    app.EditView = Backbone.View.extend({

        el: '#postform',

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

        // Re-render the titles of the thread item.
        render: function () {

            this.$el.html(this.template(this.model.toJSON()));
            this.$el.show();
            //$('#okwords').show();

            return this;
        },

        postFunction: function(ev) {


            function content_has_errors($div) {

                var txt = rangy.innerText($div.get(0)),
                    errors = app.audit_text(txt);

                if ( errors.length ) {
                    unMarkErrors($div);
                    markErrors($div, errors);
                }

                return errors.length;
            }

            var rawMsg = this.$('#new-message'),
                rawSubj = this.$('#subject');

            this.errorStats['new-message'] = content_has_errors(rawMsg);
            this.errorStats['subject'] = content_has_errors(rawSubj);

            if ( this.errorStats['new-message'] || this.errorStats['subject'] ) {

                this._manageButtons();
                return;
            }

            var msg = toMarkdown(rawMsg.html().replace(/div>/g, 'p>')),
                subj = toMarkdown(rawSubj.html().replace(/div>/g, 'p>')),
                tagRe = /<[^>]*>/g,
                _this = this;

            msg = msg.replace(tagRe, '');
            subj = subj.replace(tagRe, '');

            var newModel = new app.Message({
                    body: msg,
                    title: subj,
                    thread_id: this.model.attributes.thread_id,
                    message_id: this.model.attributes.message_id,
                    author: app.userId
                });

            newModel.save({}, {
                    success: function(mdl, resp, opt) {
                        if ( typeof _this.model.attributes.thread_id === 'undefined' )
                            app.threads.fetch({ reset: true });
                        else
                            app.thread.fetch({ reset: true });
                    },
                    error: function(e) {
                        //alert('fail ' + e);
                    }
                }
            );
            // alert('message posted ' + ev);
            this._cleanup(ev);
        },

        postCancel: function(ev) {

            this._cleanup(ev);
        },

        _cleanup: function (ev) {
            this.$el.empty();
            this.undelegateEvents();
            //$('#okwords').hide();
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

            console.log('keypress ' + ev.charCode);
        },

        errorStats: {},

        _manageButtons: function() {

            if ( ! this.errorStats['subject'] &&  ! this.errorStats['new-message'] ) {

                this.$el.find('#post-message').removeAttr('disabled');
            }
            else {
                this.$el.find('#post-message').attr('disabled', 'disabled');
            }
        },

        onKeyUp: function(ev) {

            var $div, $divId, caretPos, wf, word, wordCandidates;

            $div = $(ev.target).closest('[contenteditable]');
            $divId = $div.attr('id');

            if ( this._needBlankPadding !== undefined ) {

                padBlankLines($div, this._needBlankPadding);
                this._needBlankPadding = undefined;
            }
            else if ( ~this._queue.indexOf(KEY_SPACE) ) {

                var txt = rangy.innerText($div.get(0)),
                    errors = app.audit_text(txt);

                unMarkErrors($div);
                if ( errors && errors.length ) {

                    markErrors($div, errors);
                }
                this.errorStats[$divId] = errors && errors.length;
                this._manageButtons();
            }

            this._queue.length = 0;

            caretPos = getCaretPos($div);
            wf = WordFinder($div.get(0), caretPos);
            word = wf.word();

            if ( word && word.length ) {

                wordCandidates = app.thousand_words.startsWith(word);
                console.log('words: ' + _.pluck(_.pluck(wordCandidates, 'attributes'), 'word').join(' '));

                this.wordsView.render(word);
            }
            else {
                console.log('clearing word list');
                this.wordsView.render(false);
            }

            console.log('word ' + word);
            console.log('caret pos ' + caretPos);
        }

    });

})(jQuery);
