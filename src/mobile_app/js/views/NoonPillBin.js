var PillBin = require("./PillBin.js");

var NoonPillBin = PillBin.extend({

    className : "pillbox-container noon-meds",

    collection: App.collections.NoonMeds,

    render : function() {
        PillBin.prototype.render.call(this);
        this.$el.prepend(
            '<div class="pillbox-container-title" data-translatecontent="common.noon"/>'
        ).trigger("customcontent");
        return this;
    },

    initialize : function() {
        PillBin.prototype.initialize.apply(this, arguments);
        this.listenTo(this.collection, "add reset remove", this.equalize);
        this.$el.on("resize", _.bind(this.equalize, this));
    }
});

module.exports = NoonPillBin;
