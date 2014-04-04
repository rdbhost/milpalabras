/*global $ */
/*jshint unused:false $ */

var ENTER_KEY = 13,
    ESC_KEY = 27,
    myKeyName = 'OPENID_KEY';

// dummy a console, for ie
if ( ! window.console )
    window.console = { 'log': function() {} };

// redirect to https, if not there already
if ( ! ~window.location.host.indexOf('localhost') && window.location.protocol.substr(0,5) !== 'https' )
    window.location.protocol = 'https';

// create app object, for use in other modules
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