var Command = require("../Command.js");

module.exports = Command.extend({
    id : "toggleCheck",

    /**
     * @param {Function} cb Error-first callback
     */
    execute : function(cb) {
        App.toggleCheck();
        setTimeout(cb, App.config.playbackSpeed);
    },

    /**
     * @param {Function} cb Error-first callback
     */
    undo : function(cb) {
        App.toggleCheck();
        setTimeout(cb, App.config.playbackSpeed);
    }
});
