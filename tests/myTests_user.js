
module('test_msg tests', {

    setup: function () {
        QUnit.stop();
        this.e = window.Rdbhost;
        var p = get_super_auth(private.getItem('acct_number'), private.getItem('demo_email'), private.getItem('demo_pass'));
        p.then(function(d) {
                private.setItem('demo_s_authcode', d.authcode);
                $.rdbHostConfig({'userName':private.getItem('demo_s_role'), 'authcode': private.getItem('demo_s_authcode'),
                    'domain': private.getItem('domain')});
                QUnit.start();
            },
            function(e) {
                e;
            });
    }
});

function passCallback(resp) {

    ok(typeof resp === 'object', 'response is object'); // 0th assert
    ok(resp.status[1].toLowerCase() == 'ok', 'status is not ok: ' + resp.status[1]); // 1st assert
    ok(resp.row_count[0] > 0, 'data row found');
    ok(resp.records.rows[0]['test_msg'] === null, 'data is ' + resp.records.rows[0]['test_msg']);
    start();
}

function notPassCallbackMaker(expect) {

    function _notPassCallback(resp) {

        ok(typeof resp === 'object', 'response is object'); // 0th assert
        ok(resp.status[1].toLowerCase() == 'ok', 'status is not ok: ' + resp.status[1]); // 1st assert
        ok(resp.row_count[0] > 0, 'data row found');
        ok(resp.records.rows[0]['test_msg'] === expect, 'data is ' + resp.records.rows[0]['test_msg'] + ' :' + expect);
        start();
    }

    return _notPassCallback;
}


function identifierNotPassCallback(resp) {

    ok(typeof resp === 'object', 'response is object'); // 0th assert
    ok(resp.status[1].toLowerCase() == 'ok', 'status is not ok: ' + resp.status[1]); // 1st assert
    ok(resp.row_count[0] > 0, 'data row found');
    start();
}

asyncTest('identifier test', 3, function() {

    var identQuery =
        "SELECT o.idx AS test_msg \n" +
        "  FROM auth.fedauth_accounts o\n" +
        "WHERE o.issuer || o.identifier = %s AND o.key = %s; \n";

    this.e.postData({

        q: identQuery,
        args:[user_identifier, user_key],
        format: 'json-easy',

        callback: identifierNotPassCallback,

        errback: function(err) {

            ok(false, 'errback called ' + err[0] + ' ' + err[1]);
            start();
        }
    });
});


asyncTest('full select', 4, function() {

    var saveQuery =
       // "SELECT %(title), %(body), NOW(), o.idx \n" +
        "SELECT 1 AS test_msg \n" +
        "  FROM auth.fedauth_accounts o\n" +

        "WHERE test_msg(%(title), 0.15*2, 0.2*2) IS NULL AND test_msg(%(body), 0.15, 0.2) IS NULL \n" +
        "    -- and provided authentication checks ok\n" +
        "    AND o.issuer || o.identifier = %s AND o.key = %s; \n";


    this.e.postData({

        q: saveQuery,
        args:[user_identifier, user_key],
        namedParams: {body: 'amigo de amigos', title: 'de'},
        format: 'json-easy',

        callback: notPassCallbackMaker(1),

        errback: function(err) {

            ok(false, 'errback called ' + err[0] + ' ' + err[1]);
            start();
        }
    });
});


asyncTest('full select with message_model', 4, function() {

    var saveQuery =
        "SELECT %(title) AS t, %(body) AS b, NOW(), o.idx \n" +
        //"SELECT 1 AS test_msg \n" +
        "  FROM auth.fedauth_accounts o\n" +

        "WHERE test_msg(%(title), 0.15*2, 0.2*2) IS NULL AND test_msg(%(body), 0.15, 0.2) IS NULL \n" +
        "    -- and provided authentication checks ok\n" +
        "    AND o.issuer || o.identifier = %s AND o.key = %s; \n";

    var mdl = new app.Message({body: 'amigo de amigos', title: 'de'});

    function notPassCallback(resp) {

        ok(typeof resp === 'object', 'response is object'); // 0th assert
        ok(resp.status[1].toLowerCase() == 'ok', 'status is not ok: ' + resp.status[1]); // 1st assert
        ok(resp.row_count[0] > 0, 'data row found');
        ok(resp.records.rows[0]['b'] === 'amigo de amigos', 'data is ' + resp.records.rows[0]['b'] );
        start();
    }

    var p = this.e.postData({

        q: saveQuery,
        args: [user_identifier, user_key],
        namedParams: mdl.attributes,
        format: 'json-easy'
    });
    p.then(notPassCallback);

    p.fail(function(err) {

            ok(false, 'errback called ' + err[0] + ' ' + err[1]);
            start();
    });
});


function confirm(that, pattern) {

    if ( ! pattern ) {
        pattern = '!!%%';
    }

    var p = that.e.postData({

        userName: 'super',
        authcode: demo_s_authcode,
        q: "SELECT * FROM messages WHERE body LIKE '~1'".replace('~1', pattern),
        format: 'json-easy'
    });
    p.then(function(resp) {
        ok(resp.row_count[0] > 0, 'record found - confirmed');
    });
    p.fail(function(err) {
        return err;
    });

    return p.promise();
}

function cleanup(that, pattern) {

    if ( ! pattern ) {
        pattern = '!!%%';
    }

    var p = that.e.postData({

        userName: 'super',
        authcode: demo_s_authcode,
        q: "DELETE FROM messages WHERE body LIKE '~1'".replace('~1', pattern),
        format: 'json-easy'
    });

    return p.promise();
}


asyncTest('insert with message_model', 4, function() {

    var saveQuery =
        "INSERT INTO messages (thread_id, title, body, post_date, author) \n" +

        "SELECT NULL, %(title), %(body), NOW(), o.idx \n" +
        // "SELECT %(title) AS t, %(body) AS b, NOW(), o.idx \n" +
        "  FROM auth.fedauth_accounts o\n" +

        "WHERE test_msg(%(title), 0.15*2, 0.2*2) IS NULL AND test_msg(%(body), 0.15, 0.2) IS NULL \n" +
        "    -- and provided authentication checks ok\n" +
        "    AND o.issuer || o.identifier = %s AND o.key = %s; \n";

    var mdl = new app.Message({title: 'amigo de amigos', body: '!! de amigos amigo'}),
        that = this;

    function notPassCallback(resp) {

        ok(typeof resp === 'object', 'response is object'); // 0th assert
        ok(resp.status[1].toLowerCase() == 'ok', 'status is not ok: ' + resp.status[1]); // 1st assert
        ok(resp.row_count[0] > 0, 'data row found');
        //ok(resp.records.rows[0]['b'] === 'amigo de amigos', 'data is ' + resp.records.rows[0]['b'] );

        var p = confirm(that),
            q;
        p.then(function() {
            q = cleanup(that);
            q.then(start);
        });
    }

    var p = this.e.postData({

        q: saveQuery,
        args: [user_identifier, user_key],
        namedParams: mdl.attributes,
        format: 'json-easy'
    });
    p.then(notPassCallback);

    p.fail(function(err) {

        ok(false, 'errback called ' + err[0] + ' ' + err[1]);
        start();
    });
});




asyncTest('insert n update with message_model', 4, function() {

    var saveQuery =
        "INSERT INTO messages (thread_id, title, body, post_date, author) \n" +

        "SELECT NULL, %(title), %(body), NOW(), o.idx \n" +
        // "SELECT %(title) AS t, %(body) AS b, NOW(), o.idx \n" +
        "  FROM auth.fedauth_accounts o\n" +

        "WHERE test_msg(%(title), 0.15*2) IS NULL AND test_msg(%(body), 0.15) IS NULL \n" +
        "    -- and provided authentication checks ok\n" +
        "    AND o.issuer || o.identifier = %s AND o.key = %s; \n" +

        " -- and lastly, make thread_id match message_id for new threads \n" +
        "UPDATE messages SET thread_id = message_id WHERE thread_id IS NULL; \n";

    var mdl = new app.Message({title: 'amigo de amigos', body: '!! de amigos amigo'}),
        that = this;

    function notPassCallback(resp) {

        ok(typeof resp === 'object', 'response is object'); // 0th assert
        ok(resp.status[1].toLowerCase() == 'ok', 'status is not ok: ' + resp.status[1]); // 1st assert
        ok(resp.result_sets.length > 0, 'data set found');
        //ok(resp.records.rows[0]['b'] === 'amigo de amigos', 'data is ' + resp.records.rows[0]['b'] );

        var p = confirm(that),
            q;
        p.then(function() {
            q = cleanup(that);
            q.then(start);
        });
    }

    var p = this.e.postData({

        q: saveQuery,
        args: [user_identifier, user_key],
        namedParams: mdl.attributes,
        format: 'json-easy'
    });
    p.then(notPassCallback);

    p.fail(function(err) {

        ok(false, 'errback called ' + err[0] + ' ' + err[1]);
        start();
    });
});


asyncTest('message_model save', 1+1, function() {

    var mdl = new app.Message({title: 'de ', body: '!! de '}),
        that = this;
    app.userId = user_identifier;
    app.userKey = user_key;

    function passCallback(resp) {

        ok(typeof resp === 'object', 'response is object'); // 0th assert

        var p = confirm(that),
            q;
        p.then(function() {
            q = cleanup(that);
            app.userId = app.userKey = undefined;
            q.then(start);
        });
        p.fail(function() {
            app.userId = app.userKey = undefined;
            start();
        })
    }

    mdl.save({}, {
        success: function(mdl, resp, opt) {
            passCallback(mdl);
        },
        error: function(mdl, resp, opt) {
            alert('fail ' + resp[0] + ' ' + resp[1]);
        }
    });

});

asyncTest('message_model update', 2+1, function() {

    var mdl = new app.Message({title: 'de ', body: '!! de '}),
        that = this;
    app.userId = user_identifier;
    app.userKey = user_key;

    function continueCallback(mdl) {

        ok(typeof mdl === 'object', 'response is object');

        mdl.id = 1; // negates isNew
        mdl.attributes.body = '!! tu';

        mdl.save({}, {

            success: function (mdl, resp, opt) {

                var p = confirm(that, '!! tu%%'),
                    q;
                p.then(function() {
                    ok(true, 'second success called');
                    q = cleanup(that, '!!%%');
                    app.userId = app.userKey = undefined;
                    q.then(start);
                });
                p.fail(function() {
                    app.userId = app.userKey = undefined;
                    start();
                });

                app.userId = app.userKey = undefined;
                //start();
            },

            error: function (mdl, resp, opt) {

                app.userId = app.userKey = undefined;
                ok(false, 'error ' + resp[0] + ' ' + resp[1]);
                start();
            }
        });
    }

    mdl.save({}, {
        success: function(mdl, resp, opt) {
            continueCallback(mdl);
        },
        error: function(mdl, resp, opt) {
            alert('fail ' + resp[0] + ' ' + resp[1]);
        }
    });

});

/*
 *  audit testing
 */

module('audit tests', {

    setup: function () {
        this.e = window.Rdbhost;
        $.rdbHostConfig({'userName':demo_s_role, 'authcode': demo_s_authcode, 'domain': domain});
    }
});


function audit_test(txt) {

    var dict = new app.ThousandWords(),
        that = this,
        auditPromise = app.audit_text(dict, {}, txt);

    var p2 = auditPromise.then(function(resp) {
        ok(typeof resp === 'object', 'response is object'); // 0th assert
        ok(resp.length === 4, 'result is array[4]'); // 1st assert
        return resp;
    });

    return p2.promise();
}

asyncTest('content audit test 0', 2+6, function() {

    var auditPromise = audit_test('adios');

    auditPromise.then(function(resp) {
        var errs = resp[0],
            replacements = resp[1],
            refWord = 'adi' + String.fromCharCode(243) + 's';
        ok(replacements.length === 1, 'replacement found');
        ok(replacements[0].begin === 0, 'begin at 0');
        ok(replacements[0].end === 5, 'end at 5');
        ok(replacements[0].newVal === refWord, 'replacement value correct ' + replacements[0].newVal);
        ok(replacements[0].newVal.charCodeAt(3) === 243, 'actual charcode' + replacements[0].newVal.charCodeAt(3));
        ok(errs.length === 0, 'no errors');
        start();
    });

    auditPromise.fail(function(err) {

        window.console.log(err);
        start();
    });

});


asyncTest('message_model save', 1+1, function() {

    var // mdl = new app.Message({body: 'amigo de amigos', title: '!! de amigos amigo'}),
        mdl = new app.Message({title: 'de ', body: '!! de amigo '}),
        that = this;
    app.userId = user_identifier;
    app.userKey = user_key;

    function notPassCallback(resp) {

        ok(typeof resp === 'object', 'response is object'); // 0th assert

        var p = confirm(that),
            q;
        p.then(function() {
            q = cleanup(that);
            app.userId = app.userKey = undefined;
            q.then(start);
        });
        p.fail(function() {
            app.userId = app.userKey = undefined;
            start();
        })
    }

    mdl.save({}, {
        success: function(mdl, resp, opt) {
            notPassCallback(resp);
        },
        error: function(mdl, resp, opt) {
            alert('fail ' + resp[0] + ' ' + resp[1]);
        }
    });

});



/*
 *
 */