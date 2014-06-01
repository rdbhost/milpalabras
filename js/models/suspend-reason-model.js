/*global Backbone */

(function () {
	'use strict';

    var R = window.Rdbhost;

    var saveQuery =
        'INSERT INTO suspend_reason (message_id, reason, post_date, suspender) \n' +
        'SELECT %(message_id), %(reason), NOW(), o.idx \n' +
        '  FROM auth.openid_accounts o \n' +
        ' WHERE o.identifier = %s AND o.key = %s';


    // Our basic Message model.
    app.SuspendReason = Backbone.Model.extend({

        // Default attributes for a thread
        defaults: {
            post_date: (new Date()).toISOString(),
            reason: '',
            message_id: undefined,
            suspender: undefined
        },

        sync: function(method, model, options) {

            options = options || {};

            switch(method) {

                case 'create':

                    var q = saveQuery;

                    var p = R.preauthPostData({
                        authcode: '-',
                        q: q,
                        namedParams: model.attributes,
                        args: [app.userId, app.userKey]
                    });
                    p.then(function(resp) {
                        console.log('successful save ' + resp.status);
                        // pass message_id to success callback
                        options.success(resp);
                    });
                    p.fail(function(err) {
                        console.log('failing save ' + err[0] + ' ' + err[1]);
                        if ( options && options.error )
                            options.error(err);
                    });
                    break;

                default:

                    throw new Error('bad method in SuspendReason.sync ' + method);
                    break;

            }
        }
    });


})();
