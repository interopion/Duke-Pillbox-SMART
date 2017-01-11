/* global App, $, Backbone, jQuery */
var utils  = require("../utils.js");
var RXNORM = require("../../../rxnorm.js");
var rxnormImg = require("../rxnorm_images.js");

var imageCache = {};
var defaultSrc = $('<a href="./img/pill.svg"/>').prop("href");

function preload(src, model, id) {
    var img = new Image();
    img.onload = function() {
        imageCache[id] = this.src;
        model.set("image", this.src);
    };
    img.onerror = function() {
        if (src != defaultSrc) {
            preload(defaultSrc, model, id);
        }
    };
    img.src = src;
}

/**
 * This model represents medications. The medications in this app are NOT
 * 100% compatible with the SMART version. Here the dosage is expressed
 * using custom letter codes.
 */
var MedModel = Backbone.Model.extend({

    // Set "idAttribute" to something that does not exist! This will force
    // Backbone to identify models by "cid" (client ID) instead of id,
    // which is what we need in this case
    idAttribute : "%^&^%",

    defaults : {
        "name"   : "",
        "rxnorm" : "",
        "dosage" : "N",
        "qty"    : 1,
        "image"  : ""
    },

    initialize : function() {

        this.on("change:name", this._checkReady);
        this.on("change:image", this._checkReady);

        Backbone.Model.prototype.initialize.apply(this, arguments);

        this._checkReady();

        if (!this._isReady) {
            this.loadName();
            this.loadImage();
        }
    },

    _checkReady : function() {
        if (this._isReady) {
            return;
        }

        var name  = this.get("name"),
            image = this.get("image");

        if (name && image && image != "about:blank" && name != "Loading...") {
            this._isReady = true;
            this.trigger("ready");
        }
    },

    onReady : function(cb) {
        this._checkReady();
        if (this._isReady) {
            cb();
        } else {
            this.once("ready", cb);
        }
    },

    loadName : function() {
        var model   = this,
            rxnorm  = model.get("rxnorm"),
            current = model.get("name");

        if (current && current != "Loading...") {
            return this._checkReady();
        }

        $.ajax({
            dataType: "json",
            url     : App.config.nihNameServiceURL + "/REST/rxcui/" + rxnorm +
                      "/property.json?propName=RxNorm%20Name"
        }).then(function(data) {
            var name = "rxnorm: " + rxnorm + " (no name)";

            if (data.propConceptGroup &&
                data.propConceptGroup.propConcept &&
                data.propConceptGroup.propConcept.length)
            {
                name = data.propConceptGroup.propConcept[0].propValue;
            }

            if (App.config.autoCapitalizeMedNames) {
                name = utils.ucFirst(name);
            }

            model.set("name", name);
        });
    },

    loadImage : function() {

        if (this._isLoadingImage) {
            return;
        }

        this._isLoadingImage = true;

        var model = this,
            id    = model.get("rxnorm"),
            cur   = model.get("image");

        if (cur && cur != "about:blank") {
            return this._checkReady();
        }

        if (!imageCache[id]) {

            // First look for custom image
            if (rxnormImg[id]) {
                preload("./img/meds/" + rxnormImg[id], model, id);
            }

            // Then try to search in external API
            else if (App.config.showPillImages) {
                jQuery.getJSON(
                    App.config.nihImageServiceURL + "/api/rximage/1/rxnav" +
                    "?resolution=600&rxcui=" + id,
                    function(data) {
                        if (data.nlmRxImages.length && data.nlmRxImages[0].imageUrl) {
                            preload(data.nlmRxImages[0].imageUrl, model, id);
                        } else {
                            preload(defaultSrc, model, id);
                        }
                    }
                );
            }

            // Finally use the default pill.svg
            else {
                preload(defaultSrc, model, id);
            }
        } else {
            model.set("image", imageCache[id]);
        }
    },

    parse : function(response) {
        var data = {
            rxnorm : response.rxnorm,
            dosage : response.dosage,
            name   : String(RXNORM[response.rxnorm] || ""),
            qty    : utils.floatVal(response.qty),
            image  : ""
        };

        if (App.config.autoCapitalizeMedNames) {
            data.name = utils.ucFirst(data.name);
        }

        data.name = data.name || "Loading...";

        return data;
    },

    validate : function(attrs) {
        if (!attrs.rxnorm) {
            return new Error("rxnorm is missing");
        }
    }
});

module.exports = MedModel;
