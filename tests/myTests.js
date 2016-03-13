
/*
*
* tests for the test_msg
*
*
*/
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

asyncTest('good one word', 4, function() {

  this.e.postData({

      q: "SELECT * FROM test_msg(%s::TEXT, 0.15, 0.20)",
      args: ['amigo '],
      argTypes: ['STRING'],
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

        q: "SELECT 1 AS test_msg WHERE test_msg(%s, 0.15, 0.20) IS NULL",
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

        q: "SELECT * FROM test_msg(%s, 0.15, 0.20)",
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

        q: "SELECT * FROM test_msg(%s, 0.15, 0.20)",
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

        q: "SELECT 1 AS test_msg WHERE test_msg(%(body), 0.15*2, 0.20*2) IS NULL AND test_msg(%(subject), 0.15, 0.20) IS NULL;",
        namedParams: {body: 'amigo', subject: 'de'},
        format: 'json-easy',

        callback: notPassCallbackMaker(1),

        errback: function(err) {

            ok(false, 'errback called ' + err[0] + ' ' + err[1]);
            start();
        }
    });
});


function confirm(that, pattern) {

    if ( ! pattern ) {
        pattern = '!!%%';
    }

    var p = that.e.postData({

        userName: 'super',
        authcode: private.getItem('demo_s_authcode'),
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
        authcode: private.getItem('demo_s_authcode'),
        q: "DELETE FROM messages WHERE body LIKE '~1'".replace('~1', pattern),
        format: 'json-easy'
    });

    return p.promise();
}


/*
 *  audit testing
 */

module('audit tests', {

    setup: function () {
        this.e = window.Rdbhost;
        QUnit.stop();
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


function audit_test(txt) {

    var dict = new app.ThousandWords(),
        that = this,
        auditPromise = app.audit_text(dict, txt);

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
        $.rdbHostConfig({accountNumber: private.getItem('acct_number'), 'authcode': '-', 'domain': private.getItem('domain')});
    }
});

asyncTest('good one word', 4, function() {

    this.e.preauthPostData({

        q: "SELECT * FROM test_msg(%s, 0.15, 0.2)",
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

        q: "SELECT * FROM test_msg(%s, 0.15, 0.2)",
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

        q: "SELECT * FROM test_msg(%s, 0.15, 0.2)",
        args: ['amigo de'],
        format: 'json-easy',

        callback: passCallback,

        errback: function(err) {

            ok(false, 'errback called ' + err[0] + ' ' + err[1]);
            start();
        }
    });
});



/*
 *
 */