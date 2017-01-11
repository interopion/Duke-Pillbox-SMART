var PillBin = require("./PillBin.js");

var EveningPillBin = PillBin.extend({

    className : "pillbox-container evening-meds",

    collection: App.collections.EveningMeds,

    render : function() {
        PillBin.prototype.render.call(this);
        this.$el.prepend(
            '<div class="pillbox-container-title" data-translatecontent="common.evening"/>'
        ).trigger("customcontent");
        return this;
    },

    initialize : function() {
        PillBin.prototype.initialize.apply(this, arguments);
        this.listenTo(this.collection, "add reset remove", this.equalize);
        this.$el.on("resize", _.bind(this.equalize, this));
    }
});

module.exports = EveningPillBin;
