/*global Backbone */

(function ($) {
	'use strict';

    var R = window.Rdbhost,

        DUPE_KEY = '23505';


    app.UsernameView = Backbone.View.extend({

        el: '#set-username',

        // Delegated events for creating new items, and clearing completed ones.
        events: {
            'submit': 'postFunction'
        },

        // Re-render the titles of the thread item.
        render: function () {

            var pre;
            this.$el.show();

            if ( ~app.userId.indexOf('@') ) {

                pre = app.userId.split('@')[0];
                this.$('[name="username"]').val(pre);
            }
            else {

                var parts = app.userId.split('/');
                pre = parts[parts.length-1];
                if ( ! pre )
                    pre = parts[2].split('.')[0];
                this.$('[name="username"]').val(pre);
            }

            this.$('#su-error').text('');

            return this;
        },

        postFunction: function(ev) {

            var handle = this.$('[name="username"]').val(),
                handleForm = this,
                errorSpan = this.$('#su-error');

            if ( ! handle.trim().length ) {

                errorSpan.text('Provide a username, please')
            }
            else {

                var p = R.preauthPostData({

                    q:  'INSERT INTO users (idx, email_address, handle) \n' +
                        'SELECT o.idx, NULL, %s FROM auth.openid_accounts o \n' +
                        ' WHERE o.identifier = %s AND o.key = %s; ',
                    args: [handle, app.userId, app.userKey]
                });

                p.then(
                    function(resp) {

                        app.handle = handle;
                        app.recentPostCt = 0;
                        $('a.loginLink').attr('href', '#!/logout');
                        $('a.loginLink').text('salir');
                        $('a.loginLink').attr('data-help', 'logout');
                        // if results, add to display
                        $('span.user-id').text(app.handle);
                        window.console.log('name registered as ' + app.handle);

                        handleForm.$el.hide();
                        errorSpan.text('');
                    },
                    function(err) {

                        if ( err[0] === DUPE_KEY  ) {

                            errorSpan.text('That name is in use.  Please choose another.')
                        }
                        else {

                            errorSpan.text('Error: ' + err[1]);
                        }
                    }
                );
            }

            ev.stopPropagation();
            return false;
        }
    });

})(jQuery);
