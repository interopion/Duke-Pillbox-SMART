var PillBin = require("./PillBin.js");
var MedView = require("./MedView.js");

var TrashView = PillBin.extend({
    collection : App.collections.DeletedMeds,
    modelView  : MedView,
    className  : "pillbox-trash",
    initialize : function() {
        PillBin.prototype.initialize.apply(this, arguments);
        this.listenTo(this.collection, "add", this.onDelete);
    },

    onDragOver : function(e) {
        if (!App.DRAGGED_MODEL ||
            App.DRAGGED_MODEL.collection === App.collections.AllMeds) {
            return true;
        }
        e.preventDefault(); // allow drop
        this.$el.addClass("drag-over");
    },
    onDelete : function() {
        var msg = this.$el.find(".deleted-msg").trigger("customcontent");
        msg.addClass("visible");
        setTimeout(function() {
            msg.removeClass("visible");
        }, 1000);
    },
    render : function() {
        PillBin.prototype.render.call(this);
        this.$el.append('<div class="deleted-msg" data-translatecontent="common.item_deleted"/>');
        return this;
    }
});

module.exports = TrashView;
