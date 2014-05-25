/*global Backbone */

(function () {
	'use strict';

    var R = window.Rdbhost /*,

        MAX_QUOTED_RATIO = 0.15,

        QUOTED_TEST = '([\"\'\'\u00ab\u2039]\\S+[\"\'\'\u00bb\u203a])|([0-9]+)',

        // ?!#$%&«‹¡-¿»›
        SEPARATOR_RE = '[\\s?!#$%%&.,\u00ab\u2039\u00a1\u00bf\u00bb\u203a-]+'  */;

    var saveQuery =
        "-- primary query that inserts provided fields, contingent on various tests passing \n" +
        "SELECT * FROM post_msg(%(title), %(body), %s, %s, %(thread_id)); \n" +
        " -- and lastly, make thread_id match message_id for new threads \n" +
        "UPDATE messages SET thread_id = message_id WHERE thread_id IS NULL; \n" +
        "SELECT currval('messages_message_id_seq'::regclass) AS message_id; \n";

    var updateQuery =
        "-- primary query that inserts provided fields, contingent on various tests passing \n" +
        "SELECT * FROM replace_msg(%(title), %(body), %s, %s, %(message_id)); \n" +
        "SELECT %(message_id) AS message_id; \n";

    // Our basic Message model.
    app.Message = Backbone.Model.extend({

        idAttribute: 'message_id',

        // Default attributes for a thread
        defaults: {
            post_date: (new Date()).toISOString(),
            title: '',
            body: ''
        },

        sync: function(method, model, options) {

            options = options || {};

            switch(method) {

                case 'create':

                    var q = saveQuery;

                    if ( _.contains( ['', undefined], model.attributes.thread_id )) {
                        q = q.replace('%(thread_id)', 'NULL');
                    }

                    // if ( _.contains( ['', undefined], model.attributes.message_id ) ) {
                    //     q = q.replace('%(message_id),', '').replace(', message_id,', ', ');
                    // }

                    var p = R.preauthPostData({
                        authcode: '-',
                        q: q,
                        namedParams: model.attributes,
                        args: [app.userId, app.userKey]
                    });
                    p.then(function(resp) {
                        console.log('successful save ' + resp.status);
                        options.success(resp.result_sets[2].records.rows[0]);
                    });
                    p.fail(function(err) {
                        console.log('failing save ' + err[0] + ' ' + err[1]);
                        options.error(err);
                    });
                    break;

                case 'update':

                    var qU = updateQuery;

                    var pU = R.preauthPostData({
                        authcode: '-',
                        q: qU,
                        namedParams: model.attributes,
                        args: [app.userId, app.userKey]
                    });
                    pU.then(function(resp) {
                        console.log('successful save ' + resp.status);
                        options.success(resp.result_sets[1].records.rows[0]);
                    });
                    pU.fail(function(err) {
                        console.log('failing save ' + err[0] + ' ' + err[1]);
                        options.error(err);
                    });
                    break;

                default:

                    throw new Error('bad method in Thread.sync ' + method);
                    break;

            }
        },

        suppress: function(options) {

            var this_ = this,
                p = R.preauthPostData({

                q: 'UPDATE messages SET suppressed = true \n' +
                   ' WHERE message_id = %(message_id) \n' +
                   '   AND (suppressed = true OR suppressed IS NULL); ',

                namedParams: this_.attributes
            });
            p.then(function(resp) {
                if ( options && options.success )
                    options.success(rows);
                //app.threadView.render();
            });
            p.fail(function(err) {
                if ( options && options.error )
                    options.error(err);
            });
        },

        unSuppress: function(options) {

            var this_ = this,
                p = R.preauthPostData({

                    q: 'UPDATE messages m SET suppressed = false \n' +
                       ' FROM auth.openid_accounts o, users u  \n' +
                       ' WHERE m.message_id = %(message_id) \n' +
                       '  AND o.idx = u.idx AND u.admin \n' +
                       '  AND o.identifier = %s AND o.key = %s',

                    namedParams: this_.attributes,
                    args: [app.userId, app.userKey]
                });
            p.then(function(resp) {
                if ( options && options.success )
                    options.success(rows);
            });
            p.fail(function(err) {
                if ( options && options.error )
                    options.error(err);
            });
        },

        deleteMsg: function(options) {

            var attrs = this.attributes;
            attrs.title = '~ eliminado ~';
            attrs.body = '~ mensaje se ha eliminado ~';

            var sql =
                "UPDATE messages m SET body = '~1', \n" +
                "       title = '~2' \n" +
                " FROM auth.openid_accounts o  \n" +
                " WHERE m.message_id = %(message_id) \n" +
                "  AND m.post_date > now() - '10 minutes'::interval \n" +
                "  AND o.idx = m.author \n" +
                "  AND o.identifier = %s AND o.key = %s";
            sql = sql.replace('~2', attrs.title).replace('~1', attrs.body);

            var this_ = this,
                p = R.preauthPostData({
                    q: sql,
                    namedParams: this_.attributes,
                    args: [app.userId, app.userKey]
                });
            p.then(function(resp) {
                if ( options && options.success )
                    options.success(rows);
            });
            p.fail(function(err) {
                if ( options && options.error )
                    options.error(err);
            });
        },

        destroy: function(options) {

            // todo - replace with two different queries - one for thread-head, and one for others
            //    - thread-head version would promote another message to be thread-head

            var this_ = this,
                p = R.preauthPostData({

                    q: 'DELETE FROM messages m  \n' +
                       ' USING auth.openid_accounts o, users u  \n' +
                       ' WHERE m.message_id = %(message_id) \n' +
                       '   AND o.idx = u.idx AND u.admin \n' +
                       '   AND o.identifier = %s AND o.key = %s',

                    namedParams: this_.attributes,
                    args: [app.userId, app.userKey]
                });

            p.then(function(resp) {
                if ( options && options.success )
                    options.success(rows);
            });

            p.fail(function(err) {
                if ( options && options.error )
                    options.error(err);
            });
        }

    });

    // Object for each thread in threads list.
    app.ThreadSummary = Backbone.Model.extend({

        // Default attributes for a thread
        defaults: {
            post_date: 'no date provided'
        }
    });


})();
