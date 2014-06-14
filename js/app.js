/*global $ */
/*jshint unused:false $ */


// dummy a console, for ie
if ( ! window.console )
    window.console = { 'log': function() {} };

// redirect to https, if not there already
if ( ! ~window.location.host.indexOf('localhost') && window.location.protocol.substr(0,5) !== 'https' )
    window.location.protocol = 'https';

// create app object, for use in other modules
var app = _.extend({ userId: undefined, userKey: undefined }, Backbone.Events);

app.constants = {

    ENTER_KEY: 13,
    ESC_KEY: 27,
    SPACE_KEY: 32,
    TAB_KEY: 9,

    FANCY_WORD_CHARS: '\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1\u00E1\u00E9\u00ED\u00F3\u00FA\u00F1',  // accented and tilde
    FANCY_BEGIN_PUNCTUATION: '\u00A1\u00BF',   // inverted exclamation mark and question mark
    LEFT_QUOTES: '\u00AB\u2039',
    RIGHT_QUOTES: '\u00BB\u203A',

    NONWORD_RE: '^[1-9.,+-]+$',

    MAX_THREAD_SIZE: 20,
    ELIMINATION_TITLE: '~ eliminado ~',

    myKeyName: 'OPENID_KEY',

    BODY_RATIO: '0.15',
    TITLE_RATIO: '0.5'
};

/* MAX_QUOTED_RATIO = 0.15,

 QUOTED_TEST = '([\"\'\'\u00ab\u2039]\\S+[\"\'\'\u00bb\u203a])|([0-9]+)',

 // ?!#$%&«‹¡-¿»›
 SEPARATOR_RE = '[\\s?!#$%%&.,\u00ab\u2039\u00a1\u00bf\u00bb\u203a-]+'  */



(function () {

    'use strict';

    app.constants['TRIMMING_RE'] = '(^[?!#$%[\\]<&' + app.constants.LEFT_QUOTES + app.constants.FANCY_BEGIN_PUNCTUATION +
                                   '-]+)|([?!#$[\\]>&.,' + app.constants.RIGHT_QUOTES + '-]+$)';


    var R = window.Rdbhost;

    R.rdbHostConfig({
        domain: 'www.rdbhost.com',
        accountNumber: 1355,
        userName: 'preauth'
    });


})();