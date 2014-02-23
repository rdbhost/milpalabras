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
            post_date: new Date(),
            author: '',
            suppressed: false
        },

        sync: function(method, model, params) {

            alert('syncing Message')
        }

    });


    // Object for each thread in threads list.
    app.ThreadSummary = Backbone.Model.extend({

        // Default attributes for a thread
        defaults: {
            thread_id: 0,
            title: '',
            message_list: [],
            start_date: false,
            initiating_user: '',
            suppressed: false
        }

    });


    // Our basic Thread model.
    app.Thread = Backbone.Collection.extend({

        model: app.Message,

        // Default attributes for a thread
        defaults: {
            thread_id: 0,
            title: '',
            message_list: [],
            start_date: false,
            initiating_user: '',
            suppressed: false
        },

        sync: function(method, model, options) {

            options = options || {};

            switch(method) {

                case 'create':
                    break;

                case 'update':
                    break;

                case 'delete':
                    break;

                case 'read':
                    var p = R.preauthPostData({
                        q: 'SELECT * FROM messages WHERE thread_id = %s ORDER BY post_date ASC LIMIT 100',
                        args: [model.models[0].get('thread_id')]
                    });
                    p.then(function(resp) {
                        var rows = resp.row_count[0] > 0 ? resp.records.rows : [];
                        options.success(rows);
                    });
                    p.fail(function(err) {
                        options.error(err);
                    });
                    break;
            }
            //alert('syncing Thread')
        }

    });


})();
