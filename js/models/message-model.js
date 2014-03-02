/*global Backbone */

(function () {
	'use strict';

    var R = window.Rdbhost;

    // Our basic Message model.
    app.Message = Backbone.Model.extend({

        // Default attributes for a message
        // and ensure that each message created has essential keys.
        defaults: {
            suppressed: false
        },

        sync: function(method, model, options) {

            options = options || {};

            switch(method) {

                case 'create':

                    var q = 'INSERT INTO messages (thread_id, message_id, author, title, body) ' +
                            '  SELECT %(thread_id), %(message_id), o.idx, %(title), %(body) ' +
                            '   FROM auth.openid_accounts o ' +
                            '  WHERE o.identifier = %s AND o.key = %s; ' +
                            ' UPDATE messages SET thread_id = message_id WHERE thread_id IS NULL; ';

                    if ( _.contains( ['', undefined], model.attributes.thread_id )) {
                        q = q.replace('%(thread_id)', 'NULL');
                    }

                    if ( _.contains( ['', undefined], model.attributes.message_id ) ) {
                        q = q.replace('%(message_id),', '').replace(', message_id,', ', ');
                    }

                    var p = R.preauthPostData({
                        q: q,
                        namedParams: model.attributes,
                        args: [app.userId, app.userKey]
                    });
                    p.then(function(resp) {
                        options.success(resp);
//                        if (app.thread)
//                            app.thread.trigger('reset');
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
