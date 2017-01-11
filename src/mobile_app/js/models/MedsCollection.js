var MedModel = require("./MedModel.js");

/**
 * Collection of medications
 */
var MedsCollection = Backbone.Collection.extend({
    model : MedModel,

    initialize : function(models, options) {
        if (!options || !options.id) {
            throw new Error("Collection id is required");
        }
        this.id = options.id;
        return Backbone.Collection.prototype.initialize.apply(this, arguments);
    }
});

module.exports = MedsCollection;
