/*global Backbone */

(function ($) {
	'use strict';

    var MAX_WORD_LEN = 20;

    var whiteSpaceFinder = new RegExp('\\s', 'g');

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
            allWordBreaks = [],
            theWord, start, end;

        // find whitespace and add to whiteSpaceWordBreaks list
        var _m, j;
        while ((_m = whiteSpaceFinder.exec(dom)) !== null) {
            j = _m.index;
            if ( allWordBreaks.indexOf(j)  < 0 ) {

                allWordBreaks.push(j);
                if ( _m[0] === ' ' )
                    allWordBreaks.push(j+1); // wordbreak after space also
            }
        }

        function intSort(a,b) {
            var _a = parseInt(a,10), _b = parseInt(b,10);
            if (_a < _b) return -1; if (_a > _b) return 1; return 0
        }

        // check if non-whitespace at cursor, and consolidate break lists
        //var hasChars = /\S+/.test(dom.substr(caretPos>0 ? caretPos-1: 0, caretPos>0 ? 2 : 1)),
        //    allWordBreaks = whiteSpaceWordBreaks.sort(intSort);

        function isWhitespace(m) {
            return ~[' ', '\n'].indexOf(m);
        }

        function findWordBounds() {

            // find wordbreaks before and after word
            var start = undefined, end = undefined;
            for (var _b in allWordBreaks) {

                var b = allWordBreaks[_b];
                if ( b < caretPos || b === 0 ) {
                    start = b;
                }
                else if ( b === caretPos ) {
                    if ( dom.length === b || isWhitespace(dom.substr(b, 1)) )
                        end = b;
                    else
                        start = b;
                }
                else if ( b > caretPos && ! end ) {
                    end = b;
                }
            }

            // handle cursor at end as special case
            if ( ! end ) {
                end = allWordBreaks[allWordBreaks.length-1];
                start = allWordBreaks[allWordBreaks.length-2];
            }

            return [start, end]
        }

        function findBoundsAndWord() {

            if ( typeof start === 'undefined' ) {
                var bnds = findWordBounds();
                start = bnds[0]; end = bnds[1];
                theWord = dom.substring(start, end);
                if ( isWhitespace(theWord) )
                    theWord = '';
            }
        }

        // return object with methods to test word
        return {

            hasWord: function() {

                return allWordBreaks.length && allWordBreaks[0] <= caretPos ;
            },

            word: function() {

                findBoundsAndWord();

                return theWord;
            },

            bounds: function() {

                findBoundsAndWord();

                return [start, end];
            }

        }
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
            'keypress .editable': 'wordFilter',
            'keyup .editable': 'wordFilter'
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

        wordFilter: function(ev) {

            var key = ev.char || ev.key;
            console.log('keypress ' + key);

            var $div, caretPos, wf;
            $div = $(ev.target).closest('[contenteditable]');

            caretPos = getCaretPos($div);
            wf = WordFinder($div.get(0), caretPos, true);
            var word = wf.word();

            console.log('word ' + word);
            console.log('caret pos ' + caretPos);
        }

    });

})(jQuery);
