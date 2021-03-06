/*global Backbone */

(function () {
	'use strict';

    var R = window.Rdbhost;

    // Our basic Message model.
    app.Suspended = Backbone.Collection.extend({

        model: app.Message,

        sync: function(method, model, options) {

            options = options || {};

            switch(method) {

                case 'read':

                    var q = 'SELECT auth.check_authentication(%(ident)s, %(key)s); \n' +
                            'SELECT m.message_id, m.thread_id, m.title, m.body, m.post_date, m.next2k_words as next2k, \n' +
                            '      u.handle AS author, sr.reason, sr.post_date, u2.handle AS suspender \n' +
                            ' FROM messages m LEFT JOIN suspend_reason sr ON m.message_id = sr.message_id \n' +
                            '      LEFT JOIN users u ON u.idx = m.author \n' +
                            '      LEFT JOIN users u2 ON u2.idx = sr.suspender, \n' +
                            '         auth.fedauth_accounts o JOIN users u3 ON u3.idx = o.idx \n' +
                            'WHERE m.suppressed AND u3.admin AND o.issuer || o.identifier = %(ident)s  \n' +
                            'ORDER BY m.post_date DESC LIMIT 25';

                    var p = R.preauthPostData({
                        q: q,
                        namedParams: {'ident': app.userId, 'key': app.userKey}
                    });
                    p.then(function(resp) {
                        console.log('successful suspended.read ' + resp.status);
                        if (options.success)
                            options.success(resp.result_sets[1].records.rows || []);
                    });
                    p.fail(function(err) {
                        console.log('failing suspended.read ' + err[0] + ' ' + err[1]);
                        if (options.error)
                            options.error(err);
                    });
                    break;

                default:

                    throw new Error('bad method in Suspended.sync ' + method);
                    break;

            }
        }
    });

})();
