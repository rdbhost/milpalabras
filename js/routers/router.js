/*global Backbone $ */

(function () {
	'use strict';

    var R = window.Rdbhost,
        prevView = null;

    // MilPalabras Router
    // ----------
    var MilPalabrasRouter = Backbone.Router.extend({

        routes: {
            '!/t/:thread': 'showThread',
            '!/br/:msg':   'showBranch',
            '!/u/:user':   'showUser',
            '!/suspended': 'showSuspended',
            '!/intro':     'showIntro',
            '!/allwords':  'showAllWordsList',
            '!/faq':       'showFaq',
            '!/daily/:w':  'wordOfTheDay',
            '!/login':     'login',
            '!/logout':    'logout',
            '!':           'showIndex',
            '':            'showIndex'
        },

        execute: function(cb, args) {

            window.console.log('executing ' + cb.constructor.name);
            if (prevView) {
                prevView.undelegateEvents();
                if (prevView.hoverTimer)
                    window.clearTimeout(prevView.hoverTimer);
                if (prevView.hoverHideTimer)
                    window.clearTimeout(prevView.hoverHideTimer);
            }
            cb.apply(this, args);
        },

        showThread: function (param) {

            app.thread = new app.Thread([], {thread_id: param});
            app.threadView = new app.ThreadView({model: app.thread});
            prevView = app.threadView;

            app.thread.fetch({
                success: function(mdl, resp, opt) {

                    app.threadView.render();
                    app.threadView.scrollToMyLastPost(app.handle);
                },
                error: function(mdl, err, opt) {

                    alert('error in thread loading ' + err);
                }
            });
        },

        showBranch: function (param) {

            function newBody(body, src_title) {

                return '\nEste mensaje se antes en [' + src_title + ']\n\n' +
                       '-------------------------------------------------------------\n\n' + body;
            }

            param = parseInt(param, 10);
            var models = app.thread.where({'message_id': param});

            if (models.length) {

                var srcModel = models[0].clone();
                srcModel.attributes.body = 'Este mensaje se antes en [' + srcModel.attributes.title + ']\n\n' +
                    '-------------------------------\n\n' + srcModel.attributes.body;

                app.thread = new app.Thread([srcModel], {});
                app.threadView = new app.ThreadView({model: app.thread});
                prevView = app.threadView;

                app.threadView.render();

                var nullMsg = new app.Message({
                    thread_id: undefined,
                    message_id: undefined,
                    author: app.userId
                });

                if (app.editView)
                    app.editView.cleanup();
                app.editView = new app.EditView({ model: nullMsg, attributes: {parent: srcModel} });
                app.editView.render();
            }
        },

        showSuspended: function (param) {

            app.thread = new app.Suspended();
            app.suspendedView = new app.SuspendedView();
            prevView = app.suspendedView;

            app.thread.fetch({
                success: function(mdl, resp, opt) {

                    app.suspendedView.render();
                },
                error: function(mdl, err, opt) {

                    alert('error in suspended loading ' + err);
                }
            });
        },

        showUser: function (param) {

            app.thread = new app.User({user_id: param});
            app.userView = new app.UserView({model: app.thread});
            prevView = app.userView;

            app.thread.fetch({
                success: function(mdl, resp, opt) {

                    app.userView.render();
                },
                error: function(mdl, err, opt) {

                    alert('error in user loading ' + err);
                }
            });
        },

        showIndex: function () {

            app.threadsView = new app.ThreadsView();
            prevView = app.threadsView;

            // Suppresses 'add' events with {reset: true} and prevents the app view
            // from being re-rendered for every model. Only renders when the 'reset'
            // event is triggered at the end of the fetch.
            app.threads.fetch({

                success: function(mdl, resp, opts) {

                    app.threadsView.render();
                },
                error: function(mdl, err, opts) {

                    alert('error in thread loading ' + err);
                }
            });
        },

        showIntro: function() {

            $('.page').hide();
            $('#intro').show();
        },

        showAllWordsList: function() {

            var awV = new app.AllWordsView({collection: null});
            prevView = awV;
            awV.render();
        },

        showFaq: function() {

            $('.page').hide();
            $('#faq').show();
        },

        wordOfTheDay: function(day) {

            var that = this;
            if ( app.dailyWords ) {

                day = _.contains(['today', 'yesterday', 'tomorrow'], day) ? day : 'today';
                var wd = app.dailyWords[day],
                    wod = new Backbone.Model({data: wd, day: day}),
                    dV = new app.DailyView({model: wod});
                prevView = dV;
                dV.render();
            }
            else {

                var p = R.preauthPostData({

                    q: 'SELECT wd.idx, wd.lemma, wd.definition, wd.form, wl.word, wl.part_of_speech_detail \n' +
                       '  FROM word_definitions wd \n' +
                       '      JOIN wordlist wl ON wl.lemma = wd.lemma AND wd.form = wl.part_of_speech \n' +
                       "WHERE wd.idx >= (now()::date - '2014-05-01'::date) %% 1000 -1 \n" +
                       "  AND wd.idx <= (now()::date - '2014-05-01'::date) %% 1000 +1 \n" +
                       'ORDER BY wd.idx; \n'
                });
                p.then(function(resp) {

                        var recs = resp.records.rows,
                            groups = _.groupBy(recs, 'idx'),
                            firstIdx = parseInt(_.min(_.keys(groups)), 10);
                        app.dailyWords = {};
                        app.dailyWords['yesterday'] = groups[firstIdx];
                        app.dailyWords['tomorrow'] = groups[firstIdx+2];
                        app.dailyWords['today'] = groups[firstIdx+1];

                        that.wordOfTheDay(day);
                    },
                    function(err) {
                        console.log(err[0] + ' ' + err[1]);
                        //alert(err);
                    }
                )
            }
        },

        login: function() {

            if ( app.userId ) {
                app.milPalabrasRouter.navigate('', {trigger: true});
            }
            else {
                $('#login').show();
            }
        },

        logout: function() {

            window.console.log('logged out as ' + app.userId);

            app.userId = app.userKey = app.handle = undefined;
            $.cookie(app.constants.myKeyName, '');

            $('a.loginLink').attr('href', '#!/login');
            $('a.loginLink').text('acceder');
            $('a.loginLink').attr('data-help', 'login');
            $('span.user-id').text('');

            app.milPalabrasRouter.navigate('', {trigger: true});
        }
    });


    // create router instance
    app.milPalabrasRouter = new MilPalabrasRouter();

    // Create our global collection of available words.
    app.thousand_words = new app.ThousandWords();

    // Create our global collection of word definitions.
    app.translations = new app.Translations();

    // Create our global collection of **Threads**.
    app.threads = new app.Threads();

    // Create global-view to handle help tooltips everywhere
    app.globalView = new app.GlobalView();

    Backbone.history.start();


})();
