/*global Backbone */

(function () {
	'use strict';

    var R = window.Rdbhost;

    // Object for each thread in threads list.
    app.ThreadSummary = Backbone.Model.extend({

        // Default attributes for a thread
        defaults: {
            post_date: 'no date provided',
            suppressed: false
        }
    });


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

                        q: 'SELECT thread_id, message_id, title, post_date, body, u.handle AS author, suppressed ' +
                           ' FROM messages m ' +
                           '  JOIN users u ON m.author = u.idx ' +
                           ' WHERE thread_id = %s ' +
                           'ORDER BY post_date DESC LIMIT 100; ',

                        // q: 'SELECT * FROM messages WHERE thread_id = %s ORDER BY post_date ASC LIMIT 100',
                        args: [this.thread_id]
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
