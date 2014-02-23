

(function(_, Backbone) {

    Backbone.ajaxSync = Backbone.sync;

    Backbone.sync = function(method, model, params) {

        var f = Backbone.getSyncMethod(model);
        return f(method, model, params);
    };

    Backbone.getSyncMethod = function(model) {

        if ( typeof model.syncModel === 'function' ) {

            return model.syncModel;
        }
        else {

            return Backbone.ajaxSync;
        }
    }

})(_, Backbone);