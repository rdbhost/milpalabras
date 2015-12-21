/*global Backbone, jQuery, _, ENTER_KEY, ESC_KEY, Showdown */

(function ($) {
	'use strict';

    var SPANISH_WORD_FORMS = {

        'noun': 'sustantivo',
        'verb': 'verbo',
        'pronoun': 'pronombre',
        'adjective': 'adjectivo',
        'adverb': 'adverbio',
        'conjunction': 'conjunción',
        'preposition': 'preposición'
    };


	// The DOM element for a thread item...
	app.DailyView = Backbone.View.extend({

		//... is a list tag.
        el: '#daily',

        miscTemplate: _.template($('#daily-misc-template').html()),
        verbTemplate: _.template($('#daily-verb-template').html()),

        headerTemplate: _.template($('#daily-header-template').html()),
        nullTemplate: _.template($('#daily-null-template').html()),

        hoverTemplate: _.template($('#allwords-hover-misc-template').html()),

        // The DOM events specific to an item.
        events: {
            'mouseenter .DL':   'hoverhelpIn',
            'mouseleave .DL':   'hoverhelpOut',
            'translateHelp':    'translateHelp'
        },

        initialize: function () {

            this.$header = this.$('header');
            this.$main = this.$('#daily');
            this.$tMain = this.$('#daily-main');

            this.listenTo(this, 'translateHelp', this.translateHelp);
        },

		// Render the page.
		render: function () {

            function consolidateLemma(rows) {

                var hash = {};

                _.each(rows, function(row) {

                    if (! hash.hasOwnProperty(row.form))
                        hash[row.form] = {};
                    hash[row.form][row.part_of_speech_detail] = row.word;
                });

                return hash;
            }

            $('.page').hide();
            this.$el.show();

            var attrs = this.model.attributes;

            if ( attrs.data && attrs.data.length ) {

                this.$header.empty();
                this.$tMain.empty();

                var tpl = this.headerTemplate({word: attrs.data[0].lemma,
                                               day: attrs.day });
                this.$header.append(tpl);

                var forms = _.groupBy(attrs.data, 'form'),
                    that = this;

                _.each(forms, function(f) {

                    if (f[0].form === 'verb') {

                        var hash = consolidateLemma(f);

                        // todo - replace with function factored from other similar code

                        var withDefaults = _.extend({
                            'infinitive': '', 'present-participle': '', 'past-participle': '',
                            'present (yo)': '', 'present (tu)': '', 'present (el)': '', 'present (nos)': '', 'present (ellos)': '',
                            'future (yo)': '', 'future (tu)': '', 'future (el)': '', 'future (nos)': '', 'future (ellos)': '',
                            'preterit (yo)': '', 'preterit (tu)': '', 'preterit (el)': '', 'preterit (nos)': '', 'preterit (ellos)': '',
                            'imperfect (yo)': '', 'imperfect (tu)': '', 'imperfect (el)': '', 'imperfect (nos)': '', 'imperfect (ellos)': '',
                            'imperative (tu)': '', 'imperative (el)': '', 'imperative (nos)': '', 'imperative affirmative (ustedes)': ''
                        }, hash.verb);

                        var f0 = f[0];
                        f0['form_esp'] = SPANISH_WORD_FORMS[f0['form']] || f0['form'];
                        f0['a'] = withDefaults;
                        tpl = that.verbTemplate(f0);
                    }
                    else {

                        f[0]['form_esp'] = SPANISH_WORD_FORMS[f[0]['form']] || f[0]['form'];
                        tpl = that.miscTemplate(f[0]);
                    }
                    that.$tMain.append(tpl);
                });

                this.$main.show();
            }
            else  {

                this.$tMain.empty();
                this.$tMain.html(this.nullTemplate());
            }

			return this;
		},

        hoverTimer: null,
        hoverHideTimer: null,
        hoverhelpIn: function(ev) {

            app.GlobalView.prototype.hoverhelpIn.call(this, ev);
        },
        hoverhelpOut: function(ev) {

            app.GlobalView.prototype.hoverhelpOut.call(this, ev);
        },

        translateHelp: function(ev) {

            app.GlobalView.prototype.translateHelp.call(this, ev);
        }


    });
})(jQuery);
