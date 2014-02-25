/*global Backbone */

(function () {
	'use strict';

    var R = window.Rdbhost;

    // Our basic Message model.
    app.Message = Backbone.Model.extend({

        // Default attributes for a message
        // and ensure that each message created has essential keys.
        defaults: {
            message_id: 1,
            title: '',
            body: '',
            post_date: (new Date()).toUTCString(),
            author: '',
            suppressed: false
        },

        sync: function(method, model, options) {

            options = options || {};

            var namedParams = _.clone(model.attributes);
            //namedParams.

            switch(method) {

                case 'create':

                    var p = R.preauthPostData({
                        q: 'INSERT INTO messages (thread_id, message_id, author, title, body) ' +
                           '  SELECT %(thread_id), %(message_id), idx, %(title), %(body) ' +
                           '  FROM auth.openid_accounts o ' +
                            'WHERE o.identifier = %s AND o.key = %s; ',
                        namedParams: model.attributes,
                        args: [app.userId, app.userKey]
                    });
                    p.then(function(resp) {
                        options.success(resp.row_count[0]);
                    });
                    p.fail(function(err) {
                        options.error(err);
                    });
                    break;

                default:

                    throw new Error('bad method in Thread.sync ' + method);
                    break;

            }
        }
    });

})();
