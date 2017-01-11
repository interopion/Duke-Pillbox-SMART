/* global $, App */
var ModelView = require("./ModelView.js");
// var rxnormImg = require("../rxnorm_images.js");

//var imageCache = {};

/**
 * Opens the preview image popup
 * @param {String} url The image location
 * @param {String} name Optional. The medication name
 * @return void
 */
function previewImage(url, name) {
    var popup = $('<div class="image-preview"/>').appendTo("body");

    $('<div class="overlay"/>').appendTo("body")
    .on("mousedown.closeImagePreview", function() {
        popup.remove();
        $(this).off().remove();
    });

    popup.append(
        $('<img/>').attr("src", url)
    );

    if (name) {
        popup.append($('<big/>').text(name));
    }
}

/**
 * Renders single med (no matter if it's inside the meds list or the pillbox
 * or the trash)
 */
var MedView = ModelView.extend({

    className : "med",

    events : {
        "mousedown .btn-half" : "toggleHalf",
        "mousedown"           : "grab",
        "dragend"             : "onDragEnd",
        "mouseup"             : "onDragEnd",
        "mouseleave"          : "onDragEnd",
        "dragstart"           : "onDragStart",
        "click span"          : "toggleFullText",
        "click .drag-handle"  : "previewImage"
    },

    /**
     * Listen for changes on the properties that have visual representation
     */
    initialize : function() {
        this.listenTo(this.model, "change:qty"  , this.renderQty  );
        this.listenTo(this.model, "change:name" , this.renderName );
        this.listenTo(this.model, "change:image", this.renderImage);
        ModelView.prototype.render.apply(this, arguments);
    },

    /**
     * Opens the preview image popup when the image is clicked
     */
    previewImage : function(e) {
        e.stopPropagation();
        previewImage(
            this.model.get("image") || './img/pill.svg',
            this.model.get("name")
        );
    },

    /**
     * The pills can switch between whole and half pill when the user clicks on
     * the dedicated control
     */
    toggleHalf : function(e) {
        e.preventDefault();
        e.stopPropagation();
        App.runCommand(
            "toggleHalfPill",
            {
                collectionID : this.model.collection.id,
                modelIndex   : this.model.collection.models.indexOf(this.model)
            }
        );
    },

    /**
     * When he user clicks on the title span, it will togle between the full and
     * the short version
     */
    toggleFullText : function() {
        this.$el.find("span").toggleClass("full");
        this.$el.trigger("resize");
    },

    render : function() {
        var view  = this,
            model = this.model,
            qty   = model.get("qty") + "";

        this.$el.empty()
            .attr({
                "draggable"      : true,
                "data-model-cid" : this.model.cid,
                "data-rxnorm"    : this.model.get("rxnorm"),
                "title"          : this.model.get("name")
            })
            .toggleClass("half", qty == "0.5")
            .toggleClass("as-needed", qty == "0")
            .append('<span/>')
            .append('<div class="drag-handle"/>')
            .append(
                '<label class="btn-half' + (qty=="0.5" ? ' active' : '') + '"/>'
            );

        if (!this.model._isReady) {
            view.renderName();
        }

        model.onReady(function() {
            view.renderName();
            view.renderImage(model.image);
        });

        return this;
    },

    renderImage : function() {
        this.$el.find(".drag-handle").css({
            backgroundImage : "url('" + this.model.get("image") + "')"
        });
    },

    renderQty : function() {
        var qty = this.model.get("qty") + "",
            origin = location.origin,
            img;

        if (qty == "0") {
            this.$el.addClass("as-needed");
        } else {
            var lbl = this.$el.find(".btn-half")
                .addClass("attention")
                .toggleClass("active", qty == "0.5");
            this.$el.toggleClass("half", qty == "0.5");
            setTimeout(function() {
                lbl.removeClass("attention");
            }, 300);
        }

        if (!origin) {
            origin = location.protocol + "//" + location.host;
        }
        img = this.model.get("image").replace(origin, "");

        if (qty == "0.5" && (/\/img\/pill\.svg$/).test(img)) {
            this.model.set("image", img.replace(/pill\.svg$/, "half_pill.svg"));
        }
        else if (+qty > 0.5 && (/\/img\/half_pill\.svg$/).test(img)) {
            this.model.set("image", img.replace(/half_pill\.svg$/, "pill.svg"));
        }
    },

    /**
     * Renders the medication name. To increase readability, this method
     * attempts find the "main" name and render it in bold. The "main name" is
     * found by matching everything before the first numeric characte
     * (the dosage). In any case, the full name is also available in title
     * attribute.
     */
    renderName : function() {
        var name = this.model.get("name"),
            idx  = name.search(/\s\d/);

        this.$el.attr("title", this.model.get("name")).find("span").html(
            idx > -1 ?
                '<b>' + name.substr(0, idx) + '</b>' + name.substr(idx) :
                name
        );
    },

    // DnD Methods
    // -------------------------------------------------------------------------

    /**
     * This is called on mousedown to set the cursor to grab
     * @return void
     */
    grab : function() {
        this.$el.addClass("dragging");
    },

    /**
     * Make App.DRAGGED_MODEL point to this model
     */
    onDragStart : function(e) {
        App.DRAGGED_MODEL = this.model;

        // dataTransfer is not used but we need it because Firefox will ignore
        // the DnD otherwise
        if (e.originalEvent && e.originalEvent.dataTransfer) {
            e.originalEvent.dataTransfer.setData(
                "text",
                this.model.cid
            );
        }
    },

    /**
     * Clear the App.DRAGGED_MODEL reference and reset the view appearance
     */
    onDragEnd : function() {
        App.DRAGGED_MODEL = null;
        this.$el.removeClass("dragging");
    }
});

module.exports = MedView;
