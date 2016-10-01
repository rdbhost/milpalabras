/*global Backbone, jQuery, _, ENTER_KEY, ESC_KEY, Showdown */

(function ($) {
	'use strict';

    var R = window.Rdbhost;

    // Word Item View
    // --------------

    app.DefnView = Backbone.View.extend({

        tagName: 'tr',
        className: 'lulist',

        template: _.template($('#lookup-word-template').html()),

        // Re-render the titles of the thread item.
        render: function () {

            var data = this.model.toJSON();
            this.$el.html(this.template(data));

            return this;
        }
    });

	// The DOM element for a thread item...
	app.DefnListView = Backbone.View.extend({

		//... is a list tag.
        el: 'div#luform',

        // The DOM events specific to an item.
        events: {
            'keyup .luinput':   'onChange',
            'mouseenter .DL':   'hoverhelpIn',
            'mouseleave .DL':   'hoverhelpOut'
        },

        hoverMiscTemplate: _.template($('#lookup-hover-misc-template').html()),
        hoverVerbTemplate: _.template($('#lookup-hover-verb-template').html()),

        moreTemplate: _.template($('#lookup-more-template').html()),
        noneTemplate: _.template($('#lookup-none-template').html()),

        initialize: function() {

            this.$list = this.$el.find('tbody.luwords');
            this.$form = this.$el.find('.luinput');
            this.listenTo(this, 'wordHelp', this.wordHelp);
        },

        // Re-render the words in the wordlist
		render: function () {

            var that = this,
                inp = this._inProcess;

            if (inp === false) {
                this.$list.empty();
            }

            if ( inp ) {

                this.$list.hide();
                this.$list.empty();

                var p = R.preauthPostData({
                    q: 'SELECT lemma, definitions, form, idx FROM word_definitions \n' +
                       ' WHERE idx = ANY(SELECT DISTINCT idx FROM (SELECT idx, unnest(definitions)) AS und \n' +
                       '                  WHERE unnest LIKE %s)\n' +
                       ' LIMIT 21; ',
                    args: ['%'+inp+'%']
                });

                p.then(function(rsp) {
                    var row_ct = rsp.row_count[0],
                        recs = row_ct ? rsp.records.rows : [],
                        more = recs.length > 20,
                        srch = that.$el.find('input').val();

                    if (srch === that._inProcess) {

                        if (more) recs.pop();
                        _.each(recs, function(entry) {
                            that.addOneDefinitionToDisplay(entry);
                        });
                        if (more)         that.$list.append(that.moreTemplate({}));
                        if (row_ct === 0) that.$list.append(that.noneTemplate({}));
                        that.$list.show();
                        that.$form.focus();
                        that._inProcess = false;
                    }
                    else {
                        that._inProcess = srch;
                        that.render();
                    }
                })
            }
            else {

                that.$list.empty();
                that.$form.focus();
            }

			return this;
		},

        _inProcess: false,

        onChange: function() {

            if (this._inProcess)
                return;
            this._inProcess = this.$el.find('input').val();
            this.render(this._inProcess);
        },

        // Add a single thread item to the list by creating a view for it, and
        // appending its element to the `<ul>`.
        addOneDefinitionToDisplay: function (entry) {
            var defnModel = new Backbone.Model(entry),
                defnView = new app.DefnView({ model: defnModel });
            this.$list.append(defnView.render().el);
        },

        // tmpAllWordsView: new app.AllWordsView({collection: null}),

        hoverhelpIn: function(ev) {

            app.allWordsView.hoverhelpIn.call(this, ev);
        },

        hoverhelpOut: function(ev) {

            app.allWordsView.hoverhelpOut.call(this, ev);
        },

        wordHelp: function(ev) {

            var $tgt = $(ev.target),
                $defn = $tgt.closest('tr'),
                word = $defn.find('.lu-lemma span').text(),
                form = $defn.find('.lu-form').text();

            app.allWordsView._wordHelp.call(this, $tgt, word, form);
        },

        _setPosition: function($hover, posX, posY, hgt) {
            var offset = (hgt > 100) ? -5 : 25;
            $hover.css({'top': Math.round(posY)-hgt+offset, 'left': Math.round(posX)+70});
        }

    });
})(jQuery);
