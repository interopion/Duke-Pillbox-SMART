var PillBin = require("./PillBin.js");

var WeeklyPillBin = PillBin.extend({

    className : "pillbox-container weekly-meds",

    collection: App.collections.WeeklyMeds,

    render : function() {
        PillBin.prototype.render.call(this);
        this.$el.prepend(
            '<div class="pillbox-container-title" data-translatecontent="common.weekly"/>'
        ).trigger("customcontent");
        return this;
    },

    initialize : function() {
        PillBin.prototype.initialize.apply(this, arguments);
        this.listenTo(this.collection, "add reset remove", this.equalize);
        this.$el.on("resize", _.bind(this.equalize, this));
    }
});

module.exports = WeeklyPillBin;
