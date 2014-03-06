/*global Backbone */

(function ($) {
	'use strict';

    var MAX_WORD_LEN = 20;

    var styleCleaner = new RegExp('<\s*(emphasis|strong|bold|italic|ul|span)[^>]*>', "g");

    function WordFinder($dom) {

        var dom = $dom.html();

        dom = dom.replace(styleCleaner, "");

        return {

            'hasWord': function() { return true; },
            'word': function() {
                return dom;
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

            console.log('keypress ' + ev.keyCode);

            var txt = $(ev.target).text(),
                caretPos = $(ev.target).caret(),
                wordStart, wordEnd, word;

            if ( caretPos === 0 )
                wordStart = 0;

            else {

                wordStart = 0;
                for ( var i=caretPos; i>=0; i-- ) {

                    if ( txt.substr(i,1) === ' ' )
                        wordStart = i+1;
                }
            }

            wordEnd = txt.length;
            for ( var j=wordStart; j<=txt.length; j++ ) {

                if ( txt.substr(i,1) === ' ' )
                    wordEnd = i;
            }

            word = txt.substring(wordStart, wordEnd);

            console.log('text ' + txt);
            console.log('caret pos ' + caretPos);
            console.log('word: ' + word + ' from ' + wordStart + ' to ' + wordEnd);
        }

    });

})(jQuery);
