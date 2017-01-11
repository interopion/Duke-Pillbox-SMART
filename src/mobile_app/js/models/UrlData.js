/* global _, Backbone, $ */
var codec = require("../../../pillbox_codec.js");
var utils = require("../utils.js");

var UrlData = Backbone.Model.extend({
    defaults : {
        medications : [],
        patient     : {},
        play        : false,
        scan        : false,
        print       : true
    },

    sync : function(method, model, options) {
        var dfd = new $.Deferred();

        function resolve() {
            if (_.isFunction(options.success)) {
                options.success.apply(options, arguments);
            }
            dfd.resolve.apply(dfd, arguments);
        }

        function reject() {
            if (_.isFunction(options.error)) {
                options.error.apply(options, arguments);
            }
            dfd.reject.apply(dfd, arguments);
        }

        options = options || {};
        model.trigger('request', model, dfd, options);

        if (method == "read") {
            var query  = utils.parseQueryString(location.search),
                params = query.q,
                data   = {},
                errors = [];

            data.print  = utils.bool(query.print);
            data.scan   = utils.bool(query.scan ) || utils.bool(query.ioswrap);
            data.report = utils.bool(query.report);
            data.exercise_id = utils.uInt(query.exercise_id);

            if (params) {
                try {
                    $.extend(data, codec.decode(params));
                } catch (ex) {
                    errors.push(new Error("Bad data passed to pillbox"));
                    console.error(ex);
                }
            }

            if (!data.play && !data.scan) {
                if (!$.isArray(data.medications) || !data.medications.length) {
                    errors.push(new Error("No medicaions data"));
                }
                if (!data.patient || $.isEmptyObject(data.patient)) {
                    errors.push(new Error("No patient data"));
                }
            }

            resolve(data, errors);
        }
        else {
            reject(dfd, "error", "Method Not Allowed");
        }

        return dfd;
    }
});

module.exports = UrlData;
