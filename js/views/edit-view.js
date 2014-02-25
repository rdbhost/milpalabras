/*global Backbone */

(function ($) {
	'use strict';

    app.EditView = Backbone.View.extend({

        el: '#postform',

        template: _.template($('#postform-template').html()),

        // Delegated events for creating new items, and clearing completed ones.
        events: {
            'click #post-message': 'postFunction',
            'click #post-cancel': 'postCancel'
        },

        // Re-render the titles of the thread item.
        render: function () {

            this.$el.html(this.template(this.model.toJSON()));
            this.$el.show();

            return this;
        },

        postFunction: function(ev) {

            // todo - validate stuff
            var msg = this.$('[name="new-message"]').val(),
                subj = this.$('[name="subject"]').val(),
                a_id = this.$('[name="author"]').val(),
                t_id = this.$('[name="thread_id"]').val(),
                m_id = this.$('[name="message_id"]').val(),

                newModel = new app.Message({
                    body: msg,
                    title: subj,
                    thread_id: t_id,
                    message_id: m_id,
                    author: a_id
                });

            newModel.save();
            alert('message posted ' + ev);
            this._cleanup(ev);
        },

        postCancel: function(ev) {

            this._cleanup(ev);
        },

        _cleanup: function (ev) {
            this.$el.empty();
            this.undelegateEvents();
        }
    });

})(jQuery);
