/*global Backbone */

(function () {
	'use strict';

    var R = window.Rdbhost;

    // Our basic Message model.
    app.User = Backbone.Collection.extend({

        model: app.Message,

        sync: function(method, model, options) {

            options = options || {};

            switch(method) {

                case 'read':

                    var q = 'SELECT m.message_id, m.thread_id, m.title, m.body, m.post_date, \n' +
                            '      u.handle AS author, m0.title AS topic, m.next2k_words AS next2k \n' +
                            'FROM messages m JOIN messages m0 ON m.thread_id = m0.message_id \n' +
                            '  JOIN users u ON u.idx = m.author \n' +
                            'WHERE (not m.suppressed OR m.suppressed IS NULL) \n' +
                            '  AND (not m0.suppressed OR m0.suppressed IS NULL) \n' +
                            '  AND u.handle = %s AND m0.message_id = m0.thread_id \n' +
                            'ORDER BY post_date DESC LIMIT 25';

                    var p = R.preauthPostData({
                        q: q,
                        args: [this.models[0].attributes['user_id']]
                    });
                    p.then(function(resp) {
                        console.log('successful read ' + resp.status);
                        options.success(resp.records.rows);
                    });
                    p.fail(function(err) {
                        console.log('failing read ' + err[0] + ' ' + err[1]);
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
