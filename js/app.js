/*global $ */
/*jshint unused:false $ */

var ENTER_KEY = 13,
    ESC_KEY = 27,
    myKeyName = 'MP_KEY';

if ( ! window.console )
    window.console = { 'log': function() {} };

var app = _.extend({ userId: undefined, userKey: undefined }, Backbone.Events);


(function () {

    'use strict';

    var R = window.Rdbhost;

    var PREAUTH_ROLE = 'p0000001355',
        DOMAIN = 'www.rdbhost.com';

    R.rdbHostConfig({
        domain: DOMAIN,
        userName: PREAUTH_ROLE
    });


})();