/*global Backbone */

(function ($) {
	'use strict';

    var R = window.Rdbhost;

    app.UsernameView = Backbone.View.extend({

        el: '#set-username',

        // Delegated events for creating new items, and clearing completed ones.
        events: {
            'submit': 'postFunction'
        },

        // Re-render the titles of the thread item.
        render: function () {

            this.$el.show();
            return this;
        },

        postFunction: function(ev) {

            var handle = this.$('[name="username"]').val(),
                handleForm = this;

            var p = R.preauthPostData({
                q:  'INSERT INTO users (idx, email_address, handle) \n' +
                    'SELECT o.idx, NULL, %s FROM auth.openid_accounts o \n' +
                    ' WHERE o.identifier = %s AND o.key = %s; ',
                args: [handle, app.userId, app.userKey]
            });

            p.then(
                function(resp) {

                    app.handle = resp.records.rows[0].handle;
                    $('a.loginLink').attr('href', '#/logout');
                    $('a.loginLink').text('logout');
                    // if results, add to display
                    $('span.user-id').text(app.handle);
                    window.console.log('name registered as ' + app.handle);

                    handleForm.$el.hide();
                    return this;
                },
                function(err) {
                    alert(err);
                }
            );
            ev.stopPropagation();
            return false;
        }
    });

})(jQuery);
