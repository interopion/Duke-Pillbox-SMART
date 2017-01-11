var Command = require("../Command.js");

module.exports = Command.extend({
    id : "help",

    toggle : function() {
        App.utils.modal($("body").is("modal-open") ? "close" : ".modal.help");
    },

    /**
     * @param {Function} cb Error-first callback
     */
    execute : function(cb) {
        this.toggle();
        setTimeout(cb, App.config.playbackSpeed);
    },

    /**
     * @param {Function} cb Error-first callback
     */
    undo : function(cb) {
        this.toggle();
        setTimeout(cb, App.config.playbackSpeed);
    }
});
