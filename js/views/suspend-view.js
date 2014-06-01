/*global Backbone */

(function ($) {
	'use strict';

    app.SuspendView = Backbone.View.extend({

        el: '#suspend .form',

        template: _.template($('#suspend-template').html()),

        // Delegated events for creating new items, and clearing completed ones.
        events: {
            'click #post-suspend': 'postSuspend',
            'click #cancel-suspend': 'cancelSuspend',
            'change':  '_manageButtons'
        },

        // Render the edit box
        render: function () {

            var data = this.model.toJSON();

            this.$el.html(this.template(data));
            this.$el.closest('#suspend').show();
            this._manageButtons();

            return this;
        },

        postSuspend: function(ev) {

            var reason = this.$('[name="suspend-reason"]:checked').val(),
                msgId = this.$('[name="message_id"]').val(),
                msgModel = app.thread.findWhere({'message_id': parseInt(msgId, 10)});

            if ( reason ) {

                var suspReason = new app.SuspendReason({
                      'message_id': msgModel.attributes.message_id,
                      'reason': reason
                    });

                suspReason.save();

                msgModel.suppress();
                app.thread.remove(msgModel);

                this._cleanup();
                app.threadView.render();

            }

            ev.stopImmediatePropagation();
        },

        cancelSuspend: function(ev) {

            this._cleanup(ev);
        },

        _cleanup: function (ev) {
            this.$el.closest('#suspend').hide();
            this.$el.empty();
            this.undelegateEvents();
        },

        _manageButtons: function() {

            var reason = this.$('[name="suspend-reason"]:checked').val();

            if ( reason ) {

                this.$el.find('#post-suspend').removeAttr('disabled');
            }
            else {
                this.$el.find('#post-suspend').attr('disabled', 'disabled');
            }
        }
    });

})(jQuery);
