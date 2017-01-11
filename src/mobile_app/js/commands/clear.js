var Command = require("../Command.js");


module.exports = Command.extend({
    id : "clear",

    /**
     * @param {Function} cb Error-first callback
     */
    execute : function(cb) {
        this.lastState = App.getState();
        App.setState({});
        setTimeout(cb, App.config.playbackSpeed);
    },

    /**
     * @param {Function} cb Error-first callback
     */
    undo : function(cb) {
        if (this.lastState) {
            App.setState(this.lastState);
            this.lastState = null;
        }
        setTimeout(cb, App.config.playbackSpeed);
    }
});
