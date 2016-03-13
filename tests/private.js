

/**
 * Created by JetBrains WebStorm.
 * User: David
 * Date: 4/15/12
 * Time: 6:48 PM
 * To change this template use File | Settings | File Templates.
 */

var private = sessionStorage;


private.setItem('bad_acct_number', 2);
private.setItem('bad_email', 'demo@travelbyroad.net');


private.setItem('domain', 'www.rdbhost.com');
private.setItem('acct_number', 1392);

private.setItem('demo_email', 'milpalabras@travelbyroad.net');
if (!private.getItem('demo_pass'))
    private.setItem('demo_pass', prompt('enter password for milpalabras'));

private.setItem('demo_s_role', 's0000001392');
private.setItem('demo_p_role', 'p0000001392');
private.setItem('demo_r_role', 'r0000001392');


function get_auth(init, acctnum, email, passwd) {

    var url = 'https://www.rdbhost.com/acct/login/00000000' + acctnum,
        formData = new FormData();

    formData.append('arg:email', email);
    formData.append('arg:password', passwd);

    var p = fetch(url, {method: 'post', body: formData} );
    return p.then(function(resp) {
        return resp.json().then(function(d) {

            if ( d.error )
                throw new Error(d.error[1]);

            for ( var i in d.records.rows ) {
                var row = d.records.rows[i];
                if ( row.role.substr(0,1) === init.substr(0,1) )
                    return row;

            }
            throw new Error('super not found in login records');
        })
    });
}
var get_super_auth = get_auth.bind(null, 'super');

