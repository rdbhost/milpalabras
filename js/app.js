/*global $ */
/*jshint unused:false $ */


// dummy a console, for ie
if ( ! window.console )
    window.console = { 'log': function() {} };

// redirect to https, if not there already
if ( ! ~window.location.host.indexOf('localhost') && window.location.protocol.substr(0,5) !== 'https' )
    window.location.protocol = 'https';

// create app object, for use in other modules
window.app = window.app || _.extend({ userId: undefined, userKey: undefined, cachedMessages: {} }, Backbone.Events);
// var app = _.extend({ userId: undefined, userKey: undefined, cachedMessages: {} }, Backbone.Events);

app.constants = {

    ENTER_KEY: 13,
    ESC_KEY: 27,
    SPACE_KEY: 32,
    TAB_KEY: 9,
    BACKSPACE_KEY: 8,

    FANCY_WORD_CHARS: '\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1\u00E1\u00E9\u00ED\u00F3\u00FA\u00F1',  // accented and tilde
    FANCY_BEGIN_PUNCTUATION: '\u00A1\u00BF',   // inverted exclamation mark and question mark
    LEFT_QUOTES: '\u00AB\u2039',
    RIGHT_QUOTES: '\u00BB\u203A',

    NONWORD_RE: '^[0-9.,+&\\(\\)^%$#@!\\*:;p\\[\\]-]+$',
    QUOTED_RE: '"\\S+"',

    MAX_THREAD_SIZE: 20,
    ELIMINATION_TITLE: '~ eliminado ~',

    myKeyName: 'OPENID_KEY',

    BODY_RATIO: '0.10',
    TITLE_RATIO: '0.5',
    TWOK_RATIO: '0.25',
    TITLE2K_RATIO: '0.5',

    DAILY_POST_LIMIT: '15'
};

_.extend(app.constants, {

    'TRIMMING_RE': '(^[?!#$%[\\]\\(<&\'' + app.constants.LEFT_QUOTES + app.constants.FANCY_BEGIN_PUNCTUATION +
                   '-]+)|([?!#$[\\]>\\)&.,' + app.constants.RIGHT_QUOTES + '\'-]+$)',

    'WORD_SPLIT_RE': '[?\\s!#$\\[\\]%&.,' + app.constants.LEFT_QUOTES + app.constants.FANCY_BEGIN_PUNCTUATION +
                    app.constants.RIGHT_QUOTES + '_*:-]+'
});

/*

 ?!#$%&«‹¡-¿»›   */



(function () {

    'use strict';

    var R = window.Rdbhost;

    R.rdbHostConfig({
        domain: 'www.rdbhost.com',
        accountNumber: 1392,
        userName: 'preauth'
    });

    moment.lang('es');

    app.complete_verb_table = function(tableData) {

        return _.extend({
            'infinitive': '', 'present participle': '',
            'past participle (m)': '', 'past participle (m pl)': '', 'past participle (f)': '', 'past participle (f pl)': '',
            'indicative present (yo)': '', 'indicative present (tú)': '', 'indicative present (él)': '', 'indicative present (nosotros)': '', 'indicative present (ellos)': '',
            'indicative future (yo)': '', 'indicative future (tú)': '', 'indicative future (él)': '', 'indicative future (nosotros)': '', 'indicative future (ellos)': '',
            'indicative preterite (yo)': '', 'indicative preterite (tú)': '', 'indicative preterite (él)': '', 'indicative preterite (nosotros)': '', 'indicative preterite (ellos)': '',
            'indicative conditional (yo)': '', 'indicative conditional (tú)': '', 'indicative conditional (él)': '', 'indicative conditional (nosotros)': '', 'indicative conditional (ellos)': '',
            'indicative imperfect (yo)': '', 'indicative imperfect (tú)': '', 'indicative imperfect (él)': '', 'indicative imperfect (nosotros)': '', 'indicative imperfect (ellos)': '',
            'imperative affirmative (tú)': '', 'imperative affirmative (usted)': '', 'imperative affirmative (nosotros)': '', 'imperative affirmative (ustedes)': '',

            'subjunctive present (yo)': '', 'subjunctive present (tú)': '', 'subjunctive present (él)': '', 'subjunctive present (nosotros)': '', 'subjunctive present (ellos)': '',
            'subjunctive future (yo)': '', 'subjunctive future (tú)': '', 'subjunctive future (él)': '', 'subjunctive future (nosotros)': '', 'subjunctive future (ellos)': '',
            'subjunctive imperfect (yo)': '', 'subjunctive imperfect (tú)': '', 'subjunctive imperfect (él)': '', 'subjunctive imperfect (nosotros)': '', 'subjunctive imperfect (ellos)': ''
        }, tableData);
    }

})();