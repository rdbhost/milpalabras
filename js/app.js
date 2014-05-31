/*global $ */
/*jshint unused:false $ */

/* var ENTER_KEY = 13,
    ESC_KEY = 27,
    myKeyName = 'OPENID_KEY';
*/

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

    MAX_THREAD_SIZE: 20,
    ELIMINATION_TITLE: '~ eliminado ~',

    myKeyName: 'OPENID_KEY'
};


(function () {

    'use strict';

    var R = window.Rdbhost;

    R.rdbHostConfig({
        domain: 'www.rdbhost.com',
        accountNumber: 1355,
        userName: 'preauth'
    });


})();