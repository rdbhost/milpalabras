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
