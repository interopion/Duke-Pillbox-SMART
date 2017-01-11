var Command = require("../Command.js");
var MedView = require("../views/MedView.js");

function getContainerForCollection(collection) {
    if (collection === App.collections.AllMeds) {
        return App.views.MedsList.$el;
    }
    if (collection === App.collections.MorningMeds) {
        return App.views.moorningView.$el;
    }
    if (collection === App.collections.NoonMeds) {
        return App.views.noonView.$el;
    }
    if (collection === App.collections.EveningMeds) {
        return App.views.eveningView.$el;
    }
    if (collection === App.collections.BedtimeMeds) {
        return App.views.fourXView.$el;
    }
    if (collection === App.collections.WeeklyMeds) {
        return App.views.weeklyView.$el;
    }
    if (collection === App.collections.DeletedMeds) {
        return App.views.TrashView.$el;
    }
    if (collection === App.collections.AsNeededMeds) {
        return App.views.AsNeededMeds.$el;
    }
}

function moveMed(model, targetCollection, cmd, cb) {

    var sourceCollection = model.collection;
    // if (!sourceCollection) {
    //     return cb(new Error("Model not part of collection"));
    // }

    if (sourceCollection === targetCollection) {
        return cb(new Error("Moving model to it's current collection"));
    }

    // First find the original view element
    var sourceElement = $('[data-model-cid="' + model.cid + '"]');
    if (!sourceElement.length) {
        sourceElement = sourceCollection === App.collections.DeletedMeds ?
            $('.pillbox-trash [data-rxnorm="' + model.get("rxnorm") + '"]'):
            $('.pillbox-meds-list [data-rxnorm="' + model.get("rxnorm") + '"]');
    }
    if (!sourceElement.length) {
        return cb(new Error("sourceElement not found"));
    }

    // find the target container
    var container = getContainerForCollection(targetCollection);
    if (!container || !container.length) {
        return cb(new Error("container not found"));
    }

    // Create the proxy
    var proxy = sourceElement.clone().addClass("animation-proxy");

    sourceElement.scrollIntoView(200, function() {

        // Now create an invisible helper element
        var helper = new MedView({ model : model }).render().$el;

        // make sure the helper is invisible (but measurable)
        helper.addClass("animation-proxy").css({
            "visibility" : "hidden"
        }).appendTo(container);

        proxy.css({
            width    : sourceElement.outerWidth(),
            height   : sourceElement.outerHeight(),
            position : "fixed",
            zIndex   : 100,
            top      : sourceElement.offset().top,
            left     : sourceElement.offset().left,
            opacity  : 0.7,
            margin   : 0,
            overflow : "hidden",
            whiteSpace: "nowrap",
            //"boxSizing" : "border-box",
            //display : "inline-block"
        }).appendTo("body");

        helper.scrollIntoView(200, function() {

            proxy.css("transition", "all 0.4s ease-in-out");

            setTimeout(function() {
                // measure the target coordinates
                var x = helper.offset().left;
                var y = helper.offset().top;
                var w = helper.outerWidth();
                var h = helper.outerHeight();
                var o = 1;

                // If the med will be moved to the all meds list or to the
                // recycle bin, then find the absolute center of the container
                // instead of appending to it
                if (targetCollection == App.collections.AllMeds ||
                    targetCollection == App.collections.DeletedMeds)
                {
                    x = container.offset().left + 5;// + container.width()/2;
                    y = container.offset().top + container.height()/2 - 20;// + container.height()/2;
                    w = container.width() - 20;
                    //h = container.height();
                    //x -= w/2;
                    //y -= h/2;
                    //proxy.css()
                    o = 0;
                }

                //var _x = 0,//sourceElement.offset().left + sourceElement.scrollLeft(),
                //    _y = proxy.offset().top;// + sourceElement.scrollTop();
                proxy.css({
                    transform : "translate(" +
                        (x - proxy.offset().left) + "px, " +
                        (y - proxy.offset().top ) + "px)",
                    width     : w,
                    height    : h,
                    opacity   : o
                });
                setTimeout(function() {
                    if (sourceCollection) {
                        sourceCollection.remove(model);
                    }
                    if (targetCollection !== App.collections.AllMeds) {
                        targetCollection.add(model);
                    }
                    helper.remove();
                    proxy.remove();
                    cb();
                }, App.config.playbackSpeed + 20);
            }, 20);
        });
    });
}

$.fn.scrollParent = function() {
    var node = this[0], overflow;
    while (node && node.tagName) {
        overflow = $(node).css("overflow");
        if (overflow == "auto" || overflow == "scroll") {
            return $(node);
        }
        node = node.parentNode;
    }
    return null;
};

$.fn.scrollIntoView = function(duration, complete) {
    return this.each(function(i, o) {
        var $el = $(o),
            scrollParent = o,
            scrollTop = 0,
            node = o,
            clientHeight,
            height,
            top = 0,
            overflow;

        while (node && node.tagName) {
            overflow = $(node).css("overflow");
            if (overflow == "auto" || overflow == "scroll") {
                scrollParent = node;
                break;
            }

            node = node.parentNode;
        }

        node = o;
        while (node && node !== scrollParent) {
            top += node.offsetTop;
            node = node.offsetParent;
        }

        var mTop = parseFloat($el.css("marginTop"));

        //console.log(scrollParent, overflow);

        if (scrollParent !== o) {
            scrollTop    = scrollParent.scrollTop;
            clientHeight = scrollParent.clientHeight;
            height       = $el.outerHeight(true);

            if (top + height - scrollTop > clientHeight) {
                return $(scrollParent).stop(1, 1).animate({ scrollTop: top + height + mTop - (clientHeight-50) }, {
                    duration : duration || "normal",
                    complete : complete || $.noop
                });
            }

            if (top < scrollTop) {
                return $(scrollParent).stop(1, 1).animate({ scrollTop: top - (mTop+50) }, {
                    duration : duration || "normal",
                    complete : complete || $.noop
                });
            }
        }

        return $({x:0}).animate({x:100}, {
            duration : duration || "normal",
            complete : complete || $.noop
        });
    });
};

module.exports = Command.extend({
    id : "moveMedicine",

    /**
     * @param {Object} params
     * @param {Backbone.Model} params.model The model to be moved
     * @param {Backbone.Collection} params.target The collection that the model
     * should be moved to
     */
    initialize : function(params)
    {
        if (!params || typeof params != "object") {
            throw new Error("Params object is required");
        }

        if (!params.sourceCollectionID || !App.collections[params.sourceCollectionID]) {
            throw new Error("Invalid or missing sourceCollectionID parameter");
        }

        if (!params.targetCollectionID || !App.collections[params.targetCollectionID]) {
            throw new Error("Invalid or missing targetCollectionID parameter");
        }

        if (!params.sourceModelIndex && params.sourceModelIndex !== 0) {
            throw new Error("Invalid or missing sourceModelIndex parameter");
        }

        //var model = App.collections[params.sourceCollectionID].at(params.sourceModelIndex);
        //if (!model) {
        //    throw new Error("Invalid sourceModelIndex parameter");
        //}

        this.sourceCollection = App.collections[params.sourceCollectionID];
        this.targetCollection = App.collections[params.targetCollectionID];
        this.sourceIndex      = params.sourceModelIndex;
        this.params           = params;

        // if (this.sourceCollection.id == "AllMeds") {
        //     this.model = model.clone();
        //     this.model.set("qty", this.model.get("qty") + "" == "0.5" ? 0.5 : 1);
        // } else {
        //     this.model = model;
        // }

        //console.dir(this.toJSON());
    },

    toJSON : function() {
        return [ this.id, this.params ];
    },

    /**
     * @param {Function} cb Error-first callback
     */
    execute : function(cb) {
        var model = App.collections[this.params.sourceCollectionID].at(this.params.sourceModelIndex);
        if (!model) {
            throw new Error("Invalid sourceModelIndex parameter");
        }

        if (this.sourceCollection.id == "AllMeds") {
            model = model.clone();
            var qty = model.get("qty") + "";
            if (qty != "0.5" && qty != "0") {
                model.set("qty", 1);
            }
        }

        if (App.DRAGGED_MODEL) {
            if (model.collection) {
                model.collection.remove(model);
            }
            this.targetCollection.add(model);
            cb();
        } else {
            moveMed(model, this.targetCollection, this, cb);
        }
    },

    /**
     * @param {Function} cb Error-first callback
     */
    undo : function(cb) {
        var model = App.collections[this.params.sourceCollectionID].at(this.params.sourceModelIndex);
        if (!model) {
            throw new Error("Invalid sourceModelIndex parameter");
        }

        if (this.sourceCollection.id == "AllMeds") {
            model = model.clone();
            model.set("qty", model.get("qty") + "" == "0.5" ? 0.5 : 1);
        }

        moveMed(model, this.sourceCollection, this, cb);
    }
});
