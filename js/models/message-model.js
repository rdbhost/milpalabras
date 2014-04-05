/*global Backbone */

(function () {
	'use strict';

    var R = window.Rdbhost,

        MAX_QUOTED_RATIO = 0.15,

        QUOTED_TEST = '[\"\'\'\u00ab\u2039]\S+[\"\'\'\u00bb\u203a]',

        // ?!#$%&«‹¡-¿»›
        SEPARATOR_RE = '[\s?!#$%%&.,\u00ab\u2039\u00a1\u00bf\u00bb\u203a-]+';

    var saveQuery =
        "WITH \n" +
        "    -- wordsS is a CTE with [submitted-word, dict-word or NULL] for each word in the subject\n" +
        "    --\n" +
        "    tblS AS (select regexp_split_to_table(%(title), '~sep') AS wd),\n" +
        "    wordsS AS (select tblS.wd, wordlist.word FROM tblS LEFT JOIN wordlist ON wordlist.word = tblS.wd),\n" +

        "    -- wordsB is a CTE with [submitted-word, dict-word or NULL] for each word in the body\n" +
        "    --\n" +
        "    tblB AS (select regexp_split_to_table(%(body), '~sep') AS wd),\n" +
        "    wordsB AS (select tblB.wd, wordlist.word FROM tblB LEFT JOIN wordlist ON wordlist.word = tblB.wd)\n" +

        "-- primary query that inserts provided fields, contingent on various tests passing \n" +
        "--\n" +
        "INSERT INTO messages (thread_id, message_id, title, body, post_date, author) \n" +

        "SELECT %(thread_id), %(message_id), %(title), %(body), NOW(), o.idx \n" +
        "  FROM auth.openid_accounts o\n" +

        "WHERE\n" +
        "    -- check that no illegal words provided (without either dict match or quotes) for subject\n" +
        "    NOT EXISTS (SELECT wordsS.wd FROM wordsS\n" +
        "                 WHERE wordsS.word IS NULL AND NOT wordsS.wd ~ '~wssep')\n" +
        "    -- same check, but for body\n" +
        "    AND NOT EXISTS (SELECT wordsB.wd FROM wordsB\n" +
        "                 WHERE wordsB.word IS NULL AND NOT wordsB.wd ~ '~wssep')\n" +

        "    -- check that ratio of quoted words to dict words is below threshold, for subject\n" +
        "    AND ((array(SELECT coalesce(sum(char_length(wd)), 0) FROM wordsB WHERE word IS NULL))[1] /\n" +
        "         (array(SELECT coalesce(sum(char_length(word)), 0.1) FROM wordsB WHERE word IS NOT NULL))[1]) < ~mqr\n" +
        "    -- same check, for body\n" +
        "    AND ((array(SELECT coalesce(sum(char_length(wd)), 0) FROM wordsS WHERE word IS NULL))[1] /\n" +
        "         (array(SELECT coalesce(sum(char_length(word)), 0.1) FROM wordsS WHERE word IS NOT NULL))[1]) < 2*~mqr\n" +
        "    -- and provided authentication checks ok\n" +
        "    AND o.identifier = %s AND o.key = %s; \n" +

        "UPDATE messages SET thread_id = message_id WHERE thread_id IS NULL; ";
    saveQuery = saveQuery.replace(/~sep/g, SEPARATOR_RE).replace(/~mqr/g, MAX_QUOTED_RATIO).replace(/~wssep/g, QUOTED_TEST);

    // Our basic Message model.
    app.Message = Backbone.Model.extend({

        sync: function(method, model, options) {

            options = options || {};

            switch(method) {

                case 'create':

                    var q = saveQuery;

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
                        console.log('successful save ' + resp.status);
                        options.success(resp);
                    });
                    p.fail(function(err) {
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

        destroy: function(options) {

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
