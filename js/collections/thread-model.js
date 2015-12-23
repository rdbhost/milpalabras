/*global Backbone */

(function () {
	'use strict';

    var R = window.Rdbhost;

    // Our basic Thread model.
    app.Thread = Backbone.Collection.extend({

        model: app.Message,

        initialize: function(models, options) {

            this.thread_id = options.thread_id;
        },

        sync: function(method, model, options) {

            options = options || {};

            switch(method) {

                case 'read':
                    var p = R.preauthPostData({

                        q: 'SELECT * FROM \n' +

                           '(SELECT m.thread_id, m.message_id, m.title, m.post_date, m.body, m.branch_from, \n' +
                           '       u.handle AS author, ua.user_pic, m.suppressed, mt.message_id AS branch_to, \n' +
                           '       mf.thread_id AS branched_from, mf.title AS title_from \n' +
                           ' FROM messages m \n' +
                           '  LEFT JOIN messages mt ON mt.branch_from = m.message_id \n' +
                           '  LEFT JOIN messages mf ON mf.message_id = m.branch_from \n' +
                           '  JOIN user_avatars ua ON m.author = ua.idx \n' +
                           '  JOIN users u ON m.author = u.idx \n' +
                           ' WHERE m.thread_id = %s AND (m.suppressed = false OR m.suppressed IS NULL) \n' +

                           'UNION ALL \n' +

                           "SELECT m.thread_id, m.message_id, '~ oculta temporalmente ~' AS title, m.post_date, \n" +
                           "       '' AS body, m.branch_from, u.handle AS author, ua.user_pic, m.suppressed, \n" +
                           '       NULL AS branch_to, NULL AS branched_from, NULL AS title_from \n' +
                           ' FROM messages m \n' +
                           '  JOIN user_avatars ua ON m.author = ua.idx \n' +
                           '  JOIN users u ON m.author = u.idx \n' +
                           ' WHERE m.thread_id = %s AND m.suppressed) AS foo\n' +

                           'ORDER BY foo.post_date ASC LIMIT 100; ',

                        // q: 'SELECT * FROM messages WHERE thread_id = %s ORDER BY post_date ASC LIMIT 100',
                        args: [this.thread_id, this.thread_id]
                    });
                    p.then(function(resp) {
                        var rows = resp.row_count[0] > 0 ? resp.records.rows : [];
                        options.success(rows);
                        // app.thread.trigger('reset');
                    });
                    p.fail(function(err) {
                        options.error(err);
                    });
                    break;

                default:

                    throw new Error('bad method in Thread.sync ' + method);
            }
        }
    });


})();
