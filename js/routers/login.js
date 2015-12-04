
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
                q:  'SELECT u.idx, handle, email_address, admin, recent_post_ct(u.idx) AS post_ct, \n' +
                    "   profile::json->>'email' AS fa_email \n" +
                    '  FROM users u JOIN auth.fedauth_accounts o ON u.idx = o.idx \n' +
                    'WHERE o.issuer || o.identifier = %s AND o.key = %s; ',
                args: [ident, key]
            });

            p.then(
                function(resp) {

                    if ( resp.row_count[0] && resp.records.rows[0].handle  ) {

                        app.handle = resp.records.rows[0].handle;
                        app.isAdmin = resp.records.rows[0].admin;
                        app.email = resp.records.rows[0].email_address;
                        var good_email = resp.records.rows[0].fa_email;
                        app.recentPostCt = resp.records.rows[0].post_ct;
                        $('a.loginLink').attr('href', '#!/logout');
                        $('a.loginLink').text('salir');
                        $('a.loginLink').attr('data-help', 'logout');
                        // if results, add to display
                        $('span.user-id').text(app.handle);
                        window.console.log('logged in as ' + app.userId);

                        if (!app.email || good_email !== app.email) {

                            var p1 = R.preauthPostData({
                                q: "UPDATE users u SET email_address = %s  \n" +
                                   " FROM auth.fedauth_accounts o \n" +
                                   "WHERE o.issuer || o.identifier = %s AND \n" +
                                   "      o.key = %s  AND o.idx = u.idx; ",
                                args: [good_email, ident, key]
                            });

                            p1.then(function(resp){
                                // 1==1;
                              },
                              function(err) {
                                  window.console.log(err);
                              }
                            );
                        }
                    }
                    else {

                        // check for no results, and put up username form
                        handleForm.render();
                        app.recentPostCt = 0;
                    }

                },
                function(err) {
                    alert(err);
                }
            )
        }
    }


})(jQuery);
