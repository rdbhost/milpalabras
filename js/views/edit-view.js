/*global Backbone */

(function ($) {
	'use strict';

    var MAX_WORD_LEN = 20;

    function getCaretPos($div) {

        var locRange, distRange;

        locRange = rangy.getSelection().getRangeAt(0);
        distRange = locRange.cloneRange(); // new Range()
        locRange.collapse();
        distRange.selectNodeContents($div[0]);
        distRange.setEnd(locRange.endContainer, locRange.endOffset);

        return distRange.text().length;
    }

    function WordFinder(_dom, caretPos) {

        // finds sequence of non-whitespace chars around caret

        var dom = rangy.innerText(_dom),
            wordBreaks = new RegExp('[^a-zA-Z]+', 'g'),
            theWord, start, end;

        function findWord(dom, caretPos) {

            // find wordbreaks before and after word
            var start = 0, end = undefined, word = undefined;

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

        function findBoundsAndWord() {

            var res = findWord(dom, caretPos);
            start = res.start; end = res.end;
            theWord = res.word;
        }

        findBoundsAndWord();

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


    function padBlankLines($dom) {

        var dom = $dom.html(),
            unpaddedLineFinder = new RegExp('<div><br/?></div>', 'g');

        if ( ! ~dom.indexOf('<div><br></div>') )
            return;

        while ( ~dom.indexOf('<div><br></div>') ) {
            dom = dom.replace('<div><br></div>', '<div>&nbsp;<br></div>');
        }

        $dom.html(dom);
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

        // Re-render the titles of the thread item.
        render: function () {

            this.$el.html(this.template(this.model.toJSON()));
            this.$el.show();

            return this;
        },

        postFunction: function(ev) {

            // todo - validate stuff
            var rawMsg = this.$('#new-message').html(),
                rawSubj = this.$('#subject').html(),

                msg = toMarkdown(rawMsg.replace(/div>/g, 'p>')),
                subj = toMarkdown(rawSubj.replace(/div>/g, 'p>')),
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
        },

        _queue: [],

        onKeyPress: function(ev) {

            if ( ev.charCode )
                this._queue.push(ev.charCode);

            console.log('keypress ' + ev.charCode);
        },

        onKeyUp: function(ev) {

            var key, $div, caretPos, wf;
            $div = $(ev.target).closest('[contenteditable]');

            if ( ~this._queue.indexOf(13) ) {

                padBlankLines($div);
            }

            // console.log('key: ' + ev.key + ' char: ' + ev.char + ' keyCode: ' + ev.keyCode);
            while ( this._queue.length ) {
                key = this._queue.pop();
                // do something with this eventually, maybe
            }

            caretPos = getCaretPos($div);
            wf = WordFinder($div.get(0), caretPos);
            var word = wf.word();

            console.log('word ' + word);
            console.log('caret pos ' + caretPos);
        }

    });

})(jQuery);
