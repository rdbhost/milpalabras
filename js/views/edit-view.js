/*global Backbone */

(function ($) {
	'use strict';

    var STATUS_BAR_WIDTH = 300;
    var WORD_BREAK_RE = new RegExp('[^a-zA-Z\\[\\]`~' + app.constants.FANCY_WORD_CHARS + ']+', 'g');

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

        var caretPosObj = rangy.saveSelection(),
            caretPos = getCaretPos($div);

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

        rangy.restoreSelection(caretPosObj);
        return errs;
    }

    function doReplacements($div, replacements) {

        var sel = rangy.getSelection(),
            rng = rangy.createRange();

        var caretPosObj = rangy.saveSelection(window),
            caretPos = getCaretPos($div);

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

        rangy.restoreSelection(caretPosObj);
        return replacements;
    }

    function unMarkErrors($div, caretPos) {

        var sel = rangy.getSelection(),
            rng = rangy.createRange();

        var curPos = rangy.saveSelection(window);

        var container = $div.get(0);
        rng.selectNodeContents(container);
        sel.setSingleRange(rng);

        document.execCommand('forecolor', false, 'black');

        rng.collapse();
        sel.setSingleRange(rng);

        rangy.restoreSelection(curPos);
    }


    function doBlueMarking($div, next2kwords) {

        var sel = rangy.getSelection(),
            rng = rangy.createRange(),
            container;

        var caretPosObj = rangy.saveSelection(),
            caretPos = getCaretPos($div);

        for ( var i=0; i<next2kwords.length; ++i ) {

            var bWord = next2kwords[i];
            // if ( caretPos >= bWord.begin && caretPos <= bWord.end )
            //    continue;

            if ( bWord.type === 'next2k' ) {

                container = $div.get(0);

                rng.selectCharacters(container, bWord.begin, bWord.end);
                sel.setSingleRange(rng);
                document.execCommand('forecolor', false, '#00008b');
            }

            rng.collapse();
            sel.setSingleRange(rng);
        }

        rangy.restoreSelection(caretPosObj);
        return next2kwords;
    }

    function handleInputErrors($rawDiv, ratioUq, ratioN2K) {

        var auditPromise = app.audit_text(app.thousand_words, rangy.innerText($rawDiv.get(0)), ratioUq, ratioN2K),
            p = $.Deferred();

        auditPromise.then(function(divEval) {

            unMarkErrors($rawDiv);
            markErrors($rawDiv, divEval[0]);
            doReplacements($rawDiv, divEval[1]);
            doBlueMarking($rawDiv, divEval[2]);

            p.resolve([divEval[0] || null, divEval[3]]);
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

        // Render the edit box
        render: function () {

            var data = this.model.toJSON();
            data.makeHtml = app.MessageView.markdown.makeHtml;
            app.recentPostCt = app.recentPostCt || 0; // safety

            if (app.recentPostCt < app.constants.DAILY_POST_LIMIT)
                this.$el.html(this.template(data));
            else
                this.$el.html(this.noGoTemplate({}));

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
                pM, pS, pM1, pS1, quoteRatio;

            pM = handleInputErrors($rawMsg, app.constants.BODY_RATIO, app.constants.TWOK_RATIO);
            pM1 = pM.then(function(resp) {
                that.errorStats['new-message'] = resp[0];
                return resp[1]; // return stats
            });

            pS = handleInputErrors($rawSubj, app.constants.TITLE_RATIO, app.constants.TITLE2K_RATIO);
            pS1 = pS.then(function(resp) {
                that.errorStats['subject'] = resp[0];
                return resp[1]; // return stats
            });

            var pAll = $.when(pS1, pM1);
            pAll.then(function (respS1, respM1) {

                that._manageButtons();
                saveMessage();
            });
            pAll.fail(function(err) {

                that._manageButtons();
                alert('message not saved ' + err[0] + ' ' + err[1]);
            });


            function saveMessage() {

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
                else if (that.attributes && that.attributes.parent) {

                    var parent = that.attributes.parent;
                    parent.branch({
                        success: function(resp) {

                            var thread_id = resp.message_id;
                            newModel.attributes.thread_id = thread_id;
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
        },

        cleanup: function(ev) {
            return this._cleanup(ev);
        },

        _queue: [],

        onKeyPress: function(ev) {

            if ( ev.charCode )
                this._queue.push(ev.charCode);

            if ( ev.charCode === app.constants.ENTER_KEY ) {

                var $div = $(ev.target).closest('[contenteditable]');
                if ($div.attr('id') === 'subject') {
                    ev.preventDefault();
                }
            }

            console.log('keypress ' + ev.charCode);
        },

        errorStats: {},

        _updateStatusBar: function(stats) {

            var quotedRatio = stats[0],
                next2kRatio = stats[1],
                goodRatio = 1 - quotedRatio - next2kRatio,

                quotedBarSize = STATUS_BAR_WIDTH * quotedRatio,
                next2KBarSize = STATUS_BAR_WIDTH * next2kRatio,
                goodBarSize = STATUS_BAR_WIDTH - quotedBarSize - next2KBarSize;

            $('#bar-quoted').css('width', Math.round(quotedBarSize));
            $('#bar-good').css('width', Math.round(goodBarSize));
            $('#bar-next-2K').css('width', Math.round(next2KBarSize));
        },

        _manageButtons: function() {

            var rawMsg = this.$('#new-message').text(),
                rawSubj = this.$('#subject').text(),
                nmErr = this.errorStats['new-message'],
                subErr = this.errorStats['subject'];

            if ( (! subErr || ! subErr.length) &&  (! nmErr || ! nmErr.length)
                && rawMsg.length && rawSubj.length) {

                this.$el.find('#post-message').removeAttr('disabled');
            }
            else {
                this.$el.find('#post-message').attr('disabled', 'disabled');
            }

            var $err = this.$el.find('#edit-error');

            if ( ! rawSubj.length ) {

                $err.text('Por favor, dar un título.');
            }
            else if ( ! rawMsg.length ) {

                $err.text('Por favor, dar un mensaje.');
            }
            else if ( nmErr && nmErr.length ) {

                if ( nmErr[0].type === 'quoted' )
                    $err.text('Hay texto demasiado cotizado.');
                else
                    $err.text('Mensaje tiene errores. Por favor corrija antes de enviarla.');
            }
            else if ( subErr && subErr.length ) {

                if ( subErr[0].type === 'quoted' )
                    $err.text('Hay texto demasiado cotizado.');
                else
                    $err.text('Sujeto tiene errores. Por favor corrija antes de enviarla.');
            }
            else {
                $err.text('');
            }
        },

        onKeyDown: function(ev) {

            if (ev.keyCode === app.constants.TAB_KEY) {

                var $div = $(ev.target).closest('[contenteditable]'),
                    divId = $div.attr('id'),
                    newDivId = null;

                if (divId === 'subject') {

                    newDivId = 'new-message';
                }
                else if (divId === 'new-message') {

                    newDivId = 'subject';
                }
                if (newDivId)
                    $('#'+newDivId).mousedown();

                ev.stopImmediatePropagation();
            }
            else if (ev.keyCode === app.constants.BACKSPACE_KEY) {

                this._queue.push(ev.keyCode);
            }
        },

        onKeyUp: function(ev) {

            var $div, divId, caretPos, wf, word, p, quoteRatio,
                that = this;

            $div = $(ev.target).closest('[contenteditable]');
            divId = $div.attr('id');
            quoteRatio = divId === 'title' ? app.constants.TITLE_RATIO : app.constants.BODY_RATIO;

            if ( ~this._queue.indexOf(app.constants.SPACE_KEY)
                || ~this._queue.indexOf(app.constants.BACKSPACE_KEY) ) {

                var pS = handleInputErrors($div, quoteRatio, 1);
                pS.then(function(resp) {
                    var stats = resp[1];
                    that.errorStats[divId] = resp[0];
                    that._manageButtons();
                    that._updateStatusBar(stats);
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

                p = app.thousand_words.startingWith(word.toLowerCase());
                p.then(function(wordCandidates) {

                    that.wordsView.render(word.toLowerCase());
                });
                p.fail(function(err) {

                   alert(err[0] + ' ' + err[1]);
                });
            }
            else {

                console.log('clearing word list');
                that.wordsView.render(false);
            }

            console.log('word ' + word);
            console.log('caret pos ' + caretPos);
            ev.preventDefault();
        },

        onLoseFocus: function() {

            var key = this.model.messageCacheKey(),
                rawMsg = this.$('#new-message').text(),
                rawSubj = this.$('#subject').text();

            if (this.attributes && this.attributes.parent) {

                key = 'parent ' + this.attributes.parent.messageCacheKey();
            }

            this.model.attributes.body = rawMsg;
            this.model.attributes.title = rawSubj;
            app.cachedMessages[key] = this.model;
        }
    });

})(jQuery);
