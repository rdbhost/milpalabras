/*global Backbone */
var app = app || {};

(function () {
	'use strict';

    // Our basic Message model.
    app.Message = Backbone.Model.extend({

        // Default attributes for a message
        // and ensure that each message created has essential keys.
        defaults: {
            messageId: 0,
            title: '',
            body: '',
            postDate: new Date(),
            author: '',
            suppressed: false
        }

    });


    // Our basic Thread model.
    app.Thread = Backbone.Model.extend({

        // Default attributes for a thread
        defaults: {
            threadId: 0,
            title: '',
            messageList: [],
            startDate: false,
            initiatingUser: '',
            suppressed: false
        }

    });


})();
