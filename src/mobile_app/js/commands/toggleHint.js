var Command = require("../Command.js");

module.exports = Command.extend({
    id : "toggleHint",

    /**
     * @param {Function} cb Error-first callback
     */
    execute : function(cb) {
        App.toggleHint();
        setTimeout(cb, App.config.playbackSpeed);
    },

    /**
     * @param {Function} cb Error-first callback
     */
    undo : function(cb) {
        App.toggleHint();
        setTimeout(cb, App.config.playbackSpeed);
    }
});
