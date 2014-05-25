
(function ($) {
    'use strict';

    var R = window.Rdbhost;

    var $ooi = $('#other-openid'),
        $ooibtn = $('#other');
    $ooi.hide();
    $ooibtn.click(function(evt) {
        $ooi.show();
        $ooibtn.hide();
        return false;
    });

    // set up openId login form
    //
    R.loginOpenId({

        loginForm : 'openidForm',
        errback : function () {},
        callback : function(key, ident) {

            // login user in
            login(ident, key);
        }
    });

    // login - runs when user has logged in.
    //
    function login(ident, key) {

        var handleForm = new app.UsernameView();

        if ( ident ) {

            app.userId = ident;
            app.userKey = key;

            var p = R.preauthPostData({
                q:  'SELECT handle, admin FROM users u JOIN auth.openid_accounts o ON u.idx = o.idx \n' +
                    'WHERE o.identifier = %s AND o.key = %s; ',
                args: [ident, key]
            });

            p.then(
                function(resp) {

                    if ( resp.row_count[0] ) {

                        app.handle = resp.records.rows[0].handle;
                        app.isAdmin = resp.records.rows[0].admin;
                        $('a.loginLink').attr('href', '#!/logout');
                        $('a.loginLink').text('salir');
                        // if results, add to display
                        $('span.user-id').text(app.handle);
                        window.console.log('logged in as ' + app.userId);
                    }
                    else {

                        // check for no results, and put up username form
                        handleForm.render();
                    }

                },
                function(err) {
                    alert(err);
                }
            )
        }
    }


})(jQuery);
