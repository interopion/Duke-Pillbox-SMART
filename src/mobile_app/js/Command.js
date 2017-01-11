var Class = require("./Class.js");
var Command = Class.extend(_.extend(Backbone.Events, {
    id : null,
    execute : function(params, cb) {
        cb(new Error("execute not implemented for " + this.id));
    },
    undo : function(params, cb) {
        cb(new Error("undo not implemented for " + this.id));
    },
    toJSON : function() {
        return [ this.id ];
    }
}));

module.exports = Command;
