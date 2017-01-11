/* global App */
var CollectionView = require("./CollectionView.js");
var MedView        = require("./MedView.js");

// A single bin inside the pillbox. This has DnD!
var PillBin = CollectionView.extend({
    className : "drop-target",
    modelView : MedView,
    events : {
        "dragover"  : "onDragOver",
        "dragenter" : "onDragEnter",
        "drop"      : "drop" ,
        "dragleave" : "onDragLeave",
        "dragend"   : "onDragEnd"
    },

    onDragEnter : function(e) {
        if (App.DRAGGED_MODEL && App.DRAGGED_MODEL.collection.id !== this.collection.id) {
            e.preventDefault(); // allow drop
        }
    },

    onDragOver : function(e) {
        if (App.DRAGGED_MODEL && App.DRAGGED_MODEL.collection.id !== this.collection.id) {
            e.preventDefault(); // allow drop
            this.$el.addClass("drag-over");
        }
    },

    onDragLeave : function() {
        this.$el.removeClass("drag-over");
    },

    onDragEnd : function() {
        this.$el.removeClass("drag-over");
    },

    drop : function(e) {
        e.preventDefault();
        if (App.DRAGGED_MODEL) {
            App.runCommand("moveMedicine", {
                //model  : App.DRAGGED_MODEL,
                //target : this.collection,

                sourceCollectionID : App.DRAGGED_MODEL.collection.id,
                targetCollectionID : this.collection.id,
                sourceModelIndex   : App.DRAGGED_MODEL.collection.models.indexOf(App.DRAGGED_MODEL)
            });
            App.DRAGGED_MODEL = null;
        }
        this.$el.removeClass("drag-over");//.scrollIntoView();
    }
});

module.exports = PillBin;
