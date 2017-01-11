var Command = require("../Command.js");

module.exports = Command.extend({
    id : "toggleHalfPill",

    initialize : function(options) {
        if (!options || typeof options != "object") {
            throw new Error("Invalid or missing options");
        }

        if (!options.collectionID || !App.collections[options.collectionID]) {
            throw new Error("Invalid or missing collectionID");
        }

        if (!options.modelIndex && options.modelIndex !== 0) {
            throw new Error("Invalid or missing modelIndex");
        }

        this.options = options;
    },

    /**
     * @param {Function} cb Error-first callback
     */
    execute : function(cb) {
        var model = App.collections[this.options.collectionID].at(this.options.modelIndex);

        if (!model) {
            //throw new Error("Invalid modelIndex");
            return cb();
        }

        var qty = model.get("qty") + "";
        qty = qty == "1" ? 0.5 : 1;
        model.set("qty", qty);
        setTimeout(cb, App.config.playbackSpeed);
    },

    /**
     * @param {Function} cb Error-first callback
     */
    undo : function(cb) {
        this.execute(cb);
    },

    toJSON : function() {
        return [ this.id, this.options ];
    }
});
