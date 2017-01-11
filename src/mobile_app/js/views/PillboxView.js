var viewClasses = {
    moorningView : require("./MorningPillBin.js"),
    noonView     : require("./NoonPillBin.js"),
    eveningView  : require("./EveningPillBin.js"),
    fourXView    : require("./FourXPillBin.js"),
    weeklyView   : require("./WeeklyPillBin.js"),
    AsNeededMeds : require("./AsNeededPillBin.js")
};

// PillboxView is just a layout that contains 5 PillBin child-views
var PillboxView = Backbone.View.extend({
    className : "pillbox",
    initialize : function() {
        _.each(viewClasses, function(fn, name) {
            var view = (new fn()).render();
            App.views[name] = view;
            this[name] = view;
            view.$el.appendTo(this.$el);
        }, this);
    }
});

module.exports = PillboxView;
