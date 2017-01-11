var PillBin         = require("./PillBin.js");
var AsNeededMedView = require("./AsNeededMedView.js");

var AsNeededPillBin = PillBin.extend({

    className : "pillbox-container as-needed-meds",

    collection: App.collections.AsNeededMeds,

    modelView : AsNeededMedView,

    render : function() {
        PillBin.prototype.render.call(this);
        this.$el.prepend(
            '<div class="pillbox-container-title" ' +
            'data-translatecontent="common.AsNeeded"/>'
        ).trigger("customcontent");
        return this;
    },

    initialize : function() {
        PillBin.prototype.initialize.apply(this, arguments);
        this.listenTo(this.collection, "add reset remove", this.equalize);
        this.$el.on("resize", _.bind(this.equalize, this));
    },

    /**
     * The "As Needed" is special because it shouldn't allow the user to drop
     * the same med twice.
     */
    onDragOver : function(e) {
        if (!App.DRAGGED_MODEL) {
            return true;
        }

        if (this.collection.findWhere({
            "rxnorm" : App.DRAGGED_MODEL.get("rxnorm")
        })) {
            return true; // reject drop
        }

        e.preventDefault(); // allow drop
        this.$el.addClass("drag-over");
    }
});

module.exports = AsNeededPillBin;
