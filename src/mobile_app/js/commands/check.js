var Command = require("../Command.js");

module.exports = Command.extend({
    id : "check",

    /**
     * @param {Function} cb Error-first callback
     */
    execute : function(cb) {
        App.check();
        setTimeout(cb, App.config.playbackSpeed);
    },

    /**
     * @param {Function} cb Error-first callback
     */
    undo : function(cb) {
        App.uncheck();
        setTimeout(cb, App.config.playbackSpeed);
    }
});
