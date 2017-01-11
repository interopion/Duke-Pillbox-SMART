/* global Backbone, _, $ */
var ModelView = require("./ModelView.js");

/**
 * The base class for collection views. Provides a functionality that will
 * make the model views to remove themselves when their model is removed
 * from the collection.
 */
var CollectionView = Backbone.View.extend({

    /**
     * The constructor accepts an options hash but the only used option
     * for now is "modelView" which should be a reference to the child
     * view constructor.
     */
    initialize : function(options)
    {
        if (options && options.modelView) {
            this.modelView = options.modelView;
        }

        if (!this.modelView) {
            this.modelView = ModelView;
        }

        /**
         * Contains references to the views which render the collection
         * models, organised by "model.cid". Note that each model might
         * have multiple views so the values of this map are arrays.
         */
        this.modelViews = {};

        /**
         * Automatically update the view by adding or removing child
         * views when the collection changes it's state
         */
        this.listenTo(this.collection, "reset" , this.render   );
        this.listenTo(this.collection, "add"   , this.addOne   );
        this.listenTo(this.collection, "remove", this.removeOne);

        // Call the super constructor (just in case)
        Backbone.View.prototype.initialize.apply(this, arguments);
    },

    /**
     * Just empty and (re)render.
     * @return {CollectionView} view Returns this instance.
     */
    render : function()
    {
        this.empty();
        this.collection.each(this.addOne, this);
        return this;
    },

    /**
     * Creates new child view (instance of options.modelView), then
     * pushes it to this.modeViews[model.cid], then renders it and
     * appends it to the collection view element.
     * @param {Backbone.Model} model The model to add. Should be one
     *     that the child view knows how to render.
     * @return {Backbone.View} view The new view
     */
    addOne : function(model)
    {
        var view = new this.modelView({ model : model });
        if (!this.modelViews[model.cid]) {
            this.modelViews[model.cid] = [];
        }
        this.modelViews[model.cid].push(view);
        this.$el.append(view.render().$el);
        return view;
    },

    /**
     * When a model is removed from the collection, make sure to remove
     * all the nested views that are associated with it (if any).
     * @param {Backbone.Model} model The model that has been removed.
     * @return void
     */
    removeOne : function(model)
    {
        var views = this.modelViews[model.cid];
        if (views) {
            _.each(views, function(view) {
                view.remove();
            });
            this.modelViews[model.cid] = [];
        }
    },

    /**
     * Removes al the child views (if any). As a result the view element
     * should also be emptied, but we call this.$el.empty() just in case
     * it contains something else and because jQuery will also unbind
     * it's listeners before emptying.
     */
    empty : function()
    {
        _.each(this.modelViews, function(views) {
            _.each(views, function(view) {
                view.remove();
            });
        });
        this.modelViews = {};
        this.$el.empty();
    },

    equalize : function() {
        var maxWidth  = 0,
            maxHeight = 0;

        this.$el.find("div.med").css({
            width    : "auto",
            height   : "auto",
            minWidth : 0,
            maxWidth : "none",
            minHeight: 0,
            maxHeight: "none"
        }).each(function(i, div) {
            var $div   = $(div),
                width  = $div.outerWidth(),
                height = $div.outerHeight();

            if (maxWidth < width) {
                maxWidth = width;
            }

            if (maxHeight < height) {
                maxHeight = height;
            }

        }).css({
            minWidth  : maxWidth,
            minHeight : maxHeight
        });
    }
});

module.exports = CollectionView;
