/*global Backbone */

(function () {
	'use strict';

    window.app = window.app || _.extend({ userId: undefined, userKey: undefined, cachedMessages: {} }, Backbone.Events);

    var R = window.Rdbhost;

    var saveQuery =
        "-- primary query that inserts provided fields, contingent on various tests passing \n" +
        "SELECT * FROM \n" +
        "  post_msg(%(title), %(body), %(ident)s, %(key)s, %(thread_id), %(branch_from), %(next2k_words)::VARCHAR[]); \n" +
        " -- and lastly, make thread_id match message_id for new threads \n" +
        "UPDATE messages SET thread_id = message_id WHERE thread_id IS NULL; \n" +
        "SELECT currval('messages_message_id_seq'::regclass) AS message_id; \n";

    var updateQuery =
        "-- primary query that inserts provided fields, contingent on various tests passing \n" +
        "SELECT * FROM replace_msg(%(title), %(body), %(ident)s, %(key)s, %(message_id), %(next2k_words)::VARCHAR[]); \n" +
        "SELECT %(message_id) AS message_id; \n";

    var branchingQuery =
        'SELECT auth.check_authentication(%(ident)s, %(key)s); \n' +
        "-- create new thread from old message \n" +
        "INSERT INTO messages (thread_id, title, author, post_date, branch_from, body) \n" +
        "SELECT NULL, m.title, m.author, m.post_date, %(message_id), \n" +
        "'Este mensaje se antes en [' || (SELECT title FROM messages m1 WHERE m1.message_id = m.thread_id) || \n" +
        "     ']\n\n--------------------\n\n' || m.body \n" +
        "FROM messages m, auth.fedauth_accounts o WHERE m.message_id = %(message_id) \n" +
        "  AND o.issuer || o.identifier = %(ident)s; \n" +
        "UPDATE messages SET thread_id = message_id WHERE thread_id IS NULL; \n" +
        "SELECT currval('messages_message_id_seq'::regclass) AS message_id; \n";


    // Our basic Message model.
    app.Message = Backbone.Model.extend({

        idAttribute: 'message_id',

        // Default attributes for a thread
        defaults: {
            post_date: (new Date()).toISOString(),
            title: '',
            body: '',
            suppressed: undefined,
            branch_from: undefined,
            branch_to: undefined,
            message_id: undefined,
            thread_id: undefined
        },

        sync: function(method, model, options) {

            options = options || {};
            var this_ = this;

            switch(method) {

                case 'create':

                    var q = saveQuery,
                    namedParams = _.extend({'ident': app.userId, 'key': app.userKey}, this_.attributes);

                    if ( _.contains( ['', undefined], model.attributes.thread_id )) {
                        q = q.replace('%(thread_id)', 'NULL');
                    }

                    var p = R.preauthPostData({
                        authcode: '-',
                        q: q,
                        namedParams: namedParams
                    });
                    p.then(function(resp) {
                        console.log('successful save ' + resp.status);
                        // pass message_id to success callback
                        options.success(resp.result_sets[2].records.rows[0]);
                    });
                    p.fail(function(err) {
                        console.log('failing save ' + err[0] + ' ' + err[1]);
                        if ( options && options.error )
                            options.error(err);
                    });
                    break;

                case 'update':

                    var qU = updateQuery,
                        namedParams = _.extend({'ident': app.userId, 'key': app.userKey}, this_.attributes);

                    var pU = R.preauthPostData({
                        authcode: '-',
                        q: qU,
                        namedParams: namedParams
                    });
                    pU.then(function(resp) {
                        console.log('successful save ' + resp.status);
                        options.success(resp.result_sets[1].records.rows[0]);
                    });
                    pU.fail(function(err) {
                        if ( options && options.error )
                            options.error(err);
                        console.log('failing save ' + err[0] + ' ' + err[1]);
                    });
                    break;

                default:

                    throw new Error('bad method in Thread.sync ' + method);
                    break;

            }
        },

        purgeTailingDeletes: function() {

            var qPTD =
                'CREATE TEMP VIEW deletable_messages AS \n' +
                '  SELECT message_id FROM messages WHERE message_id IN \n' +
                '      (SELECT max(max.message_id) FROM messages AS max GROUP BY max.thread_id) \n' +
                "    AND title = '~1'; \n" +
                'UPDATE suspend_reason SET message_id = NULL WHERE message_id IN \n' +
                '    (SELECT * FROM deletable_messages); \n' +
                'DELETE FROM messages \n' +
                '  WHERE message_id IN (SELECT message_id FROM deletable_messages); \n';
            qPTD = qPTD.replace('~1', app.constants.ELIMINATION_TITLE);

            var pU = R.preauthPostData({
                authcode: '-',
                q: qPTD
            });

            pU.then(function(resp) {

                    var ct = resp.result_sets[2].row_count[0];
                    window.console.log(ct + ' messages deleted');
                },
                function(err) {

                    alert('ERR: ' + err[0] + ' ' + err[1]);
                }
            );


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
                console.log('ERROR ~1 ~2'.replace('~1', err[0]).replace('~2', err[1]))
            });
        },

        unSuppress: function(options) {

            var this_ = this,
                namedParams = _.extend({'ident': app.userId, 'key': app.userKey}, this_.attributes),
                p = R.preauthPostData({

                    q: 'SELECT auth.check_authentication(%(ident)s, %(key)s); \n' +
                       'UPDATE messages m SET suppressed = false \n' +
                       '  FROM auth.fedauth_accounts o, users u  \n' +
                       ' WHERE m.message_id = %(message_id) \n' +
                       '   AND o.idx = u.idx AND u.admin \n' +
                       '   AND o.issuer || o.identifier = %(ident)s',

                    namedParams: namedParams
                });
            p.then(function(resp) {
                if ( options && options.success )
                    options.success(rows);
            });
            p.fail(function(err) {
                if ( options && options.error )
                    options.error(err);
                console.log('ERROR ~1 ~2'.replace('~1', err[0]).replace('~2', err[1]))
            });
        },

        branch: function(options) {

            var this_ = this,
                namedParams = _.extend({'ident': app.userId, 'key': app.userKey}, this_.attributes),
                p = R.preauthPostData({

                    q: branchingQuery,
                    namedParams: namedParams
                });
            p.then(function(resp) {
                console.log('successful branch ' + resp.status);
                // provide message_id to
                if ( options && options.success )
                    options.success(resp.result_sets[3].records.rows[0]);
            });
            p.fail(function(err) {
                if ( options && options.error )
                    options.error(err);
                console.log('ERROR ~1 ~2'.replace('~1', err[0]).replace('~2', err[1]))
            });
        },

        deleteMsg: function(options) {

            var attrs = this.attributes;
            attrs.title = app.constants.ELIMINATION_TITLE;
            attrs.body = '~ mensaje se ha eliminado ~';

            var sql =
                'SELECT auth.check_authentication(%(ident)s, %(key)s); \n' +
                "UPDATE messages m SET body = '~1', \n" +
                "       title = '~2', suppressed = false, branch_from = NULL \n" +
                " FROM auth.fedauth_accounts o  \n" +
                "  JOIN users u ON u.idx = o.idx \n" +
                " WHERE m.message_id = %(message_id) \n" +
                "   AND (u.admin OR \n" +
                "       (m.post_date > now() - '10 minutes'::interval \n" +
                "          AND o.idx = m.author) ) \n" +
                "   AND o.issuer || o.identifier = %(ident)s";
            sql = sql.replace('~2', attrs.title).replace('~1', attrs.body);

            var this_ = this,
                namedParams = _.extend({'ident': app.userId, 'key': app.userKey}, this_.attributes),
                p = R.preauthPostData({
                    q: sql,
                    namedParams: namedParams
                });
            p.then(function(resp) {
                if (resp.row_count && resp.row_count[0])
                    if ( options && options.success )
                        options.success(resp.records.rows);
                    else
                        throw new Error('no success method in options');
                else
                    if ( options && options.error )
                        options.error(['-', 'authentication error']);
                    else
                        throw new Error('no error method in options');
            });
            p.fail(function(err) {
                if ( options && options.error )
                   options.error(err);
                else
                    throw new Error('no error method in options');
                console.log('ERROR ~1 ~2'.replace('~1', err[0]).replace('~2', err[1]))
            });
        },

        destroy: function(options) {

            var this_ = this,
                namedParams = _.extend({'ident': app.userId, 'key': app.userKey}, this_.attributes),
                p = R.preauthPostData({

                    q: 'SELECT auth.check_authentication(%(ident)s, %(key)s); \n' +
                       'DELETE FROM messages m  \n' +
                       ' USING auth.fedauth_accounts o, users u  \n' +
                       ' WHERE m.message_id = %(message_id) \n' +
                       '   AND o.idx = u.idx AND u.admin \n' +
                       '   AND o.issuer || o.identifier = %(ident)s',

                    namedParams: namedParams
                });

            p.then(function(resp) {
                if ( options && options.success )
                    options.success(rows);
            });

            p.fail(function(err) {
                if ( options && options.error )
                    options.error(err);
                console.log('ERROR ~1 ~2'.replace('~1', err[0]).replace('~2', err[1]));
            });
        },

        messageCacheKey: function() {

            var attr = this.attributes;
            if (attr && attr.message_id) {
                return 'm ' + attr.message_id;
            }
            else if (attr && attr.thread_id) {
                return 't ' + attr.thread_id;
            }
            else {
                return 't';
            }
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
