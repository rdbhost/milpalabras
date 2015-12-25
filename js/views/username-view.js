/*global Backbone */

(function ($) {
	'use strict';

    var R = window.Rdbhost,
        DUPE_KEY = '23505';


    app.UsernameView = Backbone.View.extend({

        el: '#set-username',

        // Delegated events for creating new items, and clearing completed ones.
        events: {
            'click input[value="cancel"]': 'cancelFunction',
            'click input[value="ok"]': 'postFunction'
        },

        // Re-render the titles of the thread item.
        render: function () {

            var pre;
            this.$el.show();

            this.$('[name="username"]').val('');
            this.$('#su-error').text('');

            return this;
        },

        cancelFunction: function(ev) {
            var handleForm = this,
                errorSpan = this.$('#su-error');
            app.userId = app.userKey = undefined;
            handleForm.$el.hide();
            errorSpan.text('');
            ev.stopPropagation();
            return false;
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

                    q:  'SELECT auth.check_authentication(%(ident)s, %(key)s); \n' +
                        'INSERT INTO users (idx, email_address, handle) \n' +
                        'SELECT o.idx, NULL, %(handle)s FROM auth.fedauth_accounts o \n' +
                        ' WHERE o.issuer || o.identifier = %(ident)s; ',
                    namedParams: {'ident': app.userId, 'key': app.userKey, 'handle': handle}
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

                            errorSpan.text('That name is in use.  Please choose another.');
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
