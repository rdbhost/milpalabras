/**
 * Created by David on 6/14/2014.
 */

var R = window.Rdbhost;
R.rdbHostConfig({
    domain: 'www.rdbhost.com',
    accountNumber: 1392,
    userName: 'super'
});


function clickHandler(evt) {

    var id = $(evt.target).attr('id'),
        sqlId = id.substr(0, id.length-4),
        sql = $('#'+sqlId).text();

    sql = sql.replace('~bdyratio', app.constants.BODY_RATIO)
        .replace('~ttlratio', app.constants.TITLE_RATIO)
        .replace('~leftquotes', app.constants.LEFT_QUOTES)
        .replace('~fancybegin', app.constants.FANCY_BEGIN_PUNCTUATION)
        .replace('~rightquotes', app.constants.RIGHT_QUOTES)
        .replace('~nonword', app.constants.NONWORD_RE.replace(/'/g, "''"))
        .replace('~wordsplit', app.constants.WORD_SPLIT_RE.replace(/'/g, "''"))
        .replace('~trimre', app.constants.TRIMMING_RE.replace(/'/g, "''"))
        .replace('~elim', app.constants.ELIMINATION_TITLE)
        .replace('~dailypostlimit', app.constants.DAILY_POST_LIMIT)
        .replace(/%/g, '%%');

    var p = R.superPostData({
        q: sql
    });
    p.fail(function (errArray) {
        alert('ERROR ' + errArray[0] + ' ' + errArray[1]);
    });
    p.then(function (r) {
        alert('SUCCESS ' + sqlId);
    })
}


$('#post_msg_btn').click(clickHandler);

$('#replace_msg_btn').click(clickHandler);

$('#test_msg_btn').click(clickHandler);

$('#recent_post_ct_btn').click(clickHandler);
