
/*
*
* tests for the test_msg
*
*
*/
module('test_msg tests', {

  setup: function () {
    this.e = window.Rdbhost;
    $.rdbHostConfig({'userName':demo_s_role, 'authcode': demo_s_authcode, 'domain': domain});
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

asyncTest('good one word', 4, function() {

  this.e.postData({

      q: "SELECT * FROM test_msg(%s, 0.15)",
      args: ['amigo '],
      format: 'json-easy',

      callback: passCallback,

      errback: function(err) {

          ok(false, 'errback called ' + err[0] + ' ' + err[1]);
          start();
      }
    });
});


asyncTest('good one word match null', 4, function() {

    this.e.postData({

        q: "SELECT 1 AS test_msg WHERE test_msg(%s, 0.15) IS NULL",
        args: ['amigo '],
        format: 'json-easy',

        callback: function(resp) {
            notPassCallbackMaker(1)(resp);
        },

        errback: function(err) {

            ok(false, 'errback called ' + err[0] + ' ' + err[1]);
            start();
        }
    });
});


asyncTest('bad one word', 4, function() {

    this.e.postData({

        q: "SELECT * FROM test_msg(%s, 0.15)",
        args: ['anybody'],
        format: 'json-easy',

        callback: notPassCallbackMaker('bad words table 0 [anybody]'),

        errback: function(err) {

            ok(false, 'errback called ' + err[0] + ' ' + err[1]);
            start();
        }
    });
});


asyncTest('good two words', 4, function() {

    this.e.postData({

        q: "SELECT * FROM test_msg(%s, 0.15)",
        args:['amigo de '],
        format: 'json-easy',

        callback: passCallback,

        errback: function(err) {

            ok(false, 'errback called ' + err[0] + ' ' + err[1]);
            start();
        }
    });
});


asyncTest('double test', 4, function() {

    this.e.postData({

        q: "SELECT 1 AS test_msg WHERE test_msg(%(body), 0.15*2) IS NULL AND test_msg(%(subject), 0.15) IS NULL;",
        namedParams: {body: 'amigo', subject: 'de'},
        format: 'json-easy',

        callback: notPassCallbackMaker(1),

        errback: function(err) {

            ok(false, 'errback called ' + err[0] + ' ' + err[1]);
            start();
        }
    });
});


function identifierNotPassCallback(resp) {

    ok(typeof resp === 'object', 'response is object'); // 0th assert
    ok(resp.status[1].toLowerCase() == 'ok', 'status is not ok: ' + resp.status[1]); // 1st assert
    ok(resp.row_count[0] > 0, 'data row found');
    start();
}

asyncTest('identifier test', 3, function() {

    var identQuery =
        "SELECT o.idx AS test_msg \n" +
        "  FROM auth.openid_accounts o\n" +
        "WHERE o.identifier = %s AND o.key = %s; \n";

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
        "  FROM auth.openid_accounts o\n" +

        "WHERE test_msg(%(title), 0.15*2) IS NULL AND test_msg(%(body), 0.15) IS NULL \n" +
        "    -- and provided authentication checks ok\n" +
        "    AND o.identifier = %s AND o.key = %s; \n";


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
        "  FROM auth.openid_accounts o\n" +

        "WHERE test_msg(%(title), 0.15*2) IS NULL AND test_msg(%(body), 0.15) IS NULL \n" +
        "    -- and provided authentication checks ok\n" +
        "    AND o.identifier = %s AND o.key = %s; \n";

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


function confirm(that) {

    var p = that.e.postData({

        userName: 'super',
        authcode: demo_s_authcode,
        q: "SELECT * FROM messages WHERE body LIKE '!!%%'",
        format: 'json-easy'
    });
    p.then(function(resp) {
        ok(resp.row_count[0] > 0, 'record found - confirmed');
    });
    p.fail(function(err) {

    });

    return p.promise();
}

function cleanup(that) {

    var p = that.e.postData({

        userName: 'super',
        authcode: demo_s_authcode,
        q: "DELETE FROM messages WHERE body LIKE '!!%%'",
        format: 'json-easy'
    });

    return p.promise();
}


asyncTest('insert with message_model', 4, function() {

    var saveQuery =
        "INSERT INTO messages (thread_id, title, body, post_date, author) \n" +

        "SELECT NULL, %(title), %(body), NOW(), o.idx \n" +
        // "SELECT %(title) AS t, %(body) AS b, NOW(), o.idx \n" +
        "  FROM auth.openid_accounts o\n" +

        "WHERE test_msg(%(title), 0.15*2) IS NULL AND test_msg(%(body), 0.15) IS NULL \n" +
        "    -- and provided authentication checks ok\n" +
        "    AND o.identifier = %s AND o.key = %s; \n";

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
        "  FROM auth.openid_accounts o\n" +

        "WHERE test_msg(%(title), 0.15*2) IS NULL AND test_msg(%(body), 0.15) IS NULL \n" +
        "    -- and provided authentication checks ok\n" +
        "    AND o.identifier = %s AND o.key = %s; \n" +

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


asyncTest('message_model save', 4, function() {

    var mdl = new app.Message({body: 'de ', title: '!! de '}),
        that = this;

    function notPassCallback(resp) {

        ok(typeof resp === 'object', 'response is object'); // 0th assert
        ok(resp.status[1].toLowerCase() == 'ok', 'status is not ok: ' + resp.status[1]); // 1st assert
        ok(resp.result_sets[0].row_count[0] == 1, 'rec_count 1');

        var p = confirm(that),
            q;
        p.then(function() {
            q = cleanup(that);
            q.then(start);
        });
        p.fail(function() {
            start();
        })
    }

    mdl.save({}, {
        success: function(mdl, resp, opt) {
            notPassCallback(resp);
        },
        error: function(mdl, resp, opt) {
            alert('fail ' + e);
        }
    });

});


function audit_test(txt) {

    var dict = new app.ThousandWords(),
        that = this,
        auditPromise = app.audit_text(dict, txt);

    var p2 = auditPromise.then(function(resp) {
        ok(typeof resp === 'object', 'response is object'); // 0th assert
        ok(resp.length === 2, 'result is array[2]'); // 1st assert
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


asyncTest('content audit test fail', 2+5, function() {

    var auditPromise = audit_test('adiios');

    auditPromise.then(function(resp) {
        var errs = resp[0],
            replacements = resp[1];
        ok(replacements.length === 0, 'replacement found');
        ok(errs.length === 1, 'no errors');
        ok(errs[0].type === 'not-found', 'error is not-found type');
        ok(errs[0].end === 6, 'end correctly located');
        ok(errs[0].begin === 0, 'begin at 0');
        start();
    });

    auditPromise.fail(function(err) {

        window.console.log(err);
        start();
    });

});

asyncTest('content audit test punc', 2+2, function() {

    var auditPromise = audit_test('deje # ! a places 456');

    auditPromise.then(function(resp) {
        var errs = resp[0],
            replacements = resp[1];
        ok(replacements.length === 0, 'replacement found');
        ok(errs.length === 0, 'no errors');
        start();
    });

    auditPromise.fail(function(err) {

        window.console.log(err);
        start();
    });

});






/*
*   PREAUTH tests
*/

module('test_msg preauth tests', {

    setup: function () {
        this.e = window.Rdbhost;
        $.rdbHostConfig({accountNumber: acct_number, 'authcode': '-', 'domain': domain});
    }
});

asyncTest('good one word', 4, function() {

    this.e.preauthPostData({

        q: "SELECT * FROM test_msg(%s, 0.15)",
        args: ['amigo'],
        format: 'json-easy',

        callback: passCallback,

        errback: function(err) {

            ok(false, 'errback called ' + err[0] + ' ' + err[1]);
            start();
        }
    });
});


asyncTest('bad one word', 4, function() {

    this.e.preauthPostData({

        q: "SELECT * FROM test_msg(%s, 0.15)",
        args: ['anybody'],
        format: 'json-easy',

        callback: notPassCallbackMaker('bad words table 0 [anybody]'),

        errback: function(err) {

            ok(false, 'errback called ' + err[0] + ' ' + err[1]);
            start();
        }
    });
});


asyncTest('good two words', 4, function() {

    this.e.preauthPostData({

        q: "SELECT * FROM test_msg(%s, 0.15)",
        args: ['amigo de'],
        format: 'json-easy',

        callback: passCallback,

        errback: function(err) {

            ok(false, 'errback called ' + err[0] + ' ' + err[1]);
            start();
        }
    });
});


asyncTest('message_model save', 4, function() {

    var // mdl = new app.Message({body: 'amigo de amigos', title: '!! de amigos amigo'}),
        mdl = new app.Message({body: 'de ', title: '!! de amigo '}),
        that = this;

    function notPassCallback(resp) {

        ok(typeof resp === 'object', 'response is object'); // 0th assert
        ok(resp.status[1].toLowerCase() == 'ok', 'status is not ok: ' + resp.status[1]); // 1st assert
        ok(resp.result_sets[0].row_count[0] == 1, 'rec_count 1');

        var p = confirm(that),
            q;
        p.then(function() {
            q = cleanup(that);
            q.then(start);
        });
        p.fail(function() {
            start();
        })
    }

    mdl.save({}, {
        success: function(mdl, resp, opt) {
            notPassCallback(resp);
        },
        error: function(mdl, resp, opt) {
            alert('fail ' + e);
        }
    });

});



/*
 *
 */