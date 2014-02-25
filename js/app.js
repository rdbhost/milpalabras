/*global $ */
/*jshint unused:false $ */

var ENTER_KEY = 13,
    ESC_KEY = 27;

var app = _.extend({ userId: undefined, userKey: undefined }, Backbone.Events);


(function () {

    'use strict';

    var R = window.Rdbhost;

    var loginKeyName = 'LOGIN_KEY',
        myKeyName = 'MP_KEY',
        PREAUTH_ROLE = 'p0000001355',
        DOMAIN = 'www.rdbhost.com';

    R.rdbHostConfig({
        domain: DOMAIN,
        userName: PREAUTH_ROLE
    });

    // set up openId login form
    //
    R.loginOpenId({

        loginForm : 'openidForm',
        errback : function () {},
        callback : function(key, ident) {

            // var key = $.cookie(loginKeyName);
            $.cookie(myKeyName, ident + ' ' + key);
            $.cookie(loginKeyName, '');
            // login();
        }
    });

    // login - runs when user has logged in.
    //
    function login() {

        var ck = $.cookie(myKeyName);
        if ( ck ) {

            var ckParts = ck.split(' ');
            app.userId = ckParts[0];
            app.userKey = ckParts[1];
            $('a.loginLink').attr('href', '#/logout');
            $('a.loginLink').text('logout');
            $('span.user-id').text(app.userId);
            window.console.log('logged in as ' + app.userId);
        }
    }

    // login user in, load sidebar
    //
    login();

})();