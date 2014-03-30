/*global Backbone */

(function () {
	'use strict';

    var R = window.Rdbhost;

    var saveQuery =
        "WITH \n" +
        "    -- wordsS is a CTE with [submitted-word, dict-word or NULL] for each word in the subject\n" +
        "    --\n" +
        "    tblS AS (select regexp_split_to_table(%(title), '[\s#*_1-9.?!$%%&()-]+') AS wd),\n" +
        "    wordsS AS (select tblS.wd, wordlist.word FROM tblS LEFT JOIN wordlist ON wordlist.word = tblS.wd),\n" +

        "    -- wordsB is a CTE with [submitted-word, dict-word or NULL] for each word in the body\n" +
        "    --\n" +
        "    tblB AS (select regexp_split_to_table(%(body), '[\s#*_1-9.?!$%%&()''-]+') AS wd),\n" +
        "    wordsB AS (select tblB.wd, wordlist.word FROM tblB LEFT JOIN wordlist ON wordlist.word = tblB.wd)\n" +

        "-- primary query that inserts provided fields, contingent on various tests passing\n" +
        "--\n" +
        "INSERT INTO messages (thread_id, message_id, title, body, post_date, author, suppressed)\n" +

        "SELECT %(thread_id), %(message_id), %(title), %(body), NOW(), o.idx, False\n" +
        "  FROM auth.openid_accounts o\n" +

        "WHERE\n" +
        "    -- check that no illegal words provided (without either dict match or quotes) for subject\n" +
        "    NOT EXISTS (SELECT wordsS.wd FROM wordsS\n" +
        "                 WHERE wordsS.word IS NULL AND NOT wordsS.wd ~ '[\"'']\S+[\"'']')\n" +
        "    -- same check, but for body\n" +
        "    AND NOT EXISTS (SELECT wordsB.wd FROM wordsB\n" +
        "                     WHERE wordsB.word IS NULL AND NOT wordsB.wd ~ '[\"'']\S+[\"'']')\n" +

        "    -- check that ratio of quoted words to dict words is below threshold, for subject\n" +
        "    AND ((array(SELECT coalesce(sum(char_length(wd)), 0) FROM wordsB WHERE word IS NULL))[1] /\n" +
        "         (array(SELECT coalesce(sum(char_length(word)), 0.1) FROM wordsB WHERE word IS NOT NULL))[1]) < 0.15\n" +
        "    -- same check, for body\n" +
        "    AND ((array(SELECT coalesce(sum(char_length(wd)), 0) FROM wordsS WHERE word IS NULL))[1] /\n" +
        "         (array(SELECT coalesce(sum(char_length(word)), 0.1) FROM wordsS WHERE word IS NOT NULL))[1]) < 0.3\n" +
        "    -- and provided authentication checks ok\n" +
        "    AND o.identifier = %s AND o.key = %s; \n" +

        "UPDATE messages SET thread_id = message_id WHERE thread_id IS NULL; ";

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
                        args: [app.userId, app.userKey, 0]
                    });
                    p.then(function(resp) {
                        options.success(resp);
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
