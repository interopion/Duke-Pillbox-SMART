/* global Backbone, $, _ */

var META = {
    MorningMeds  : { className: "morning-meds"  , label: "common.morning" },
    NoonMeds     : { className: "noon-meds"     , label: "common.noon"    },
    EveningMeds  : { className: "evening-meds"  , label: "common.evening" },
    BedtimeMeds  : { className: "bedtime-meds"  , label: "common.bedtime" },
    WeeklyMeds   : { className: "weekly-meds"   , label: "common.weekly"  },
    AsNeededMeds : { className: "as-needed-meds", label: "common.AsNeeded"}
};

var templates = {

    reportBox: _.template([
        '<h4>',
        '<label>Did you take it</label>',
        '<span data-translatecontent="<%-data.label%>"></span>',
        '</h4>',
        '<div class="report-box-meds"/>'
    ].join(""), { variable: "data" }),

    med: _.template([
        '<div class="med-image" style="background-image:url(\'<%-data.image%>\')"/>',
        '<div class="btn-group">',
        '  <button class="yes active">Yes</button>',
        '  <button class="no">No</button>',
        '</div>' +
        '<h5><%-data.name%></h5>',
        '<b class="btn-half<%=data.qty === 1 ? "" : " accent"%>">',
        '<%-data.qty === 0 ? "As Needed" : data.qty%>',
        '</b>',
        '<div style="clear:both"/>',
        '<textarea placeholder="Tell us why you didn\'t take it (optional)"/>'
    ].join(""), { variable: "data" })

};

var MedModel = require("../models/MedModel.js").extend({
    idAttribute: "rxnorm",
    defaults: {
        rxnorm : null,
        name   : "",
        qty    : 0,
        dosage : "",
        image  : "",
        answer : null,
        message: null
    }
});

var MedCollection = Backbone.Collection.extend({
    model: MedModel
});

var MedView = Backbone.View.extend({
    className: "report-med",

    events: function() {
        var out = {
                "input textarea": "comment"
            },
            mousedown = "ontouchstart" in document ? "touchstart" : "mousedown";

        out[mousedown + " .btn-group button"] = "answer";
        return out;
    },

    initialize: function() {
        this.listenTo(this.model, "change:answer" , this.onChangeAnswer);
        this.listenTo(this.model, "change:message", this.onChangeMessage);
    },

    render: function() {
        this.$el.html(templates.med(this.model.toJSON()));
        var view = this, model = this.model;
        this.model.onReady(function() {
            // console.log(arguments);
            view.renderImage(model.image);
        });
        return this;
    },

    renderImage : function() {
        this.$el.find(".med-image").css({
            backgroundImage : "url('" + this.model.get("image") + "')"
        });
    },

    onChangeAnswer: function(model, answer) {
        this.$el.toggleClass("yes", answer == "yes")
                .toggleClass("no", answer == "no");
        if (answer == "yes") {
            this.model.set("message", "");
        }
    },

    onChangeMessage: function(model, message) {
        this.$el.find("textarea").val(message);
    },

    answer: function(e) {
        e.preventDefault();
        var result = $(e.target).closest("button").is(".yes") ? "yes" : "no";
        this.model.set("answer", result);
    },

    comment: function(e) {
        this.model.set("message", $.trim($(e.target).val()), { silent: true });
    }
});

var MedGroupView = Backbone.View.extend({

    /**
     * Obtains the className of the box using the META data
     * @return {String} The calssName to set
     */
    className: function() {
        var className = "report-box";
        var meta = META[this.model.label];
        if (meta) {
            className += " " + meta.className;
        }
        return className;
    },

    /**
     * Renders the box and fills it with MedViews
     * @return {MedGroupView} Returns the instance
     */
    render: function() {
        this.$el.html(templates.reportBox({
            label: META[this.model.label].label
        }));
        this.medsContainer = this.$el.find(".report-box-meds");
        this.model.meds.each(this.addOne, this);
        return this;
    },

    /**
     * Appends one MedView to the box
     * @param  {MedModel} model
     * @return {MedView}  Returns the appended view
     */
    addOne: function(model) {
        var view = new MedView({ model: model });
        this.medsContainer.append(view.render().el);
        return view;
    }
});

var ReportView = Backbone.View.extend({

    /**
     * Uses only the non-empty parts of the model to create normalized
     * med collections.
     * @constructor
     */
    initialize: function() {
        // console.log(this.model);
        this.collections = {};
        _.each(this.model, function(group, label) {
            if (group.length) {
                var collection = this.normalizeMeds(group);
                this.collections[label] = collection;
                this.listenTo(collection, "change:answer", this.logAnswers);
            }
        }, this);
    },

    /**
     * Whenever an yes/no answer is given, check if all of the questions are
     * answered and enable the submit button if they are.
     * @return {void}
     */
    logAnswers: function() {
        var canSubmit = !_.some(this.collections, function(collection) {
            return collection.some(function(model) {
                return model.get("answer") === null;
            });
        }, this);
        this.$el.closest(".modal-body").find(".btn-primary").prop(
            "disabled",
            !canSubmit
        );
    },

    /**
     * Converts the array of objects to MedCollection.
     * Groups the meds by rxnorm and sums the qty.
     * @param  {Array} inputMeds
     * @return {MedCollection}
     */
    normalizeMeds: function(inputMeds) {
        var byId = _.groupBy(inputMeds, "rxnorm");
        _.each(byId, function(meds, id) {
            byId[id] = _.reduce(meds, function(memo, m) {
                memo.qty += m.qty;
                return memo;
            }, $.extend({}, meds[0], { qty: 0 }));
        });
        return new MedCollection(_.toArray(byId));
    },

    /**
     * Renders the entire report view
     * @return {ReportView} Returns the instance
     */
    render: function() {
        this.$el.empty();
        _.each(this.collections, this.renderGroup, this);
        return this;
    },

    renderGroup: function(data, label) {
        var model = {
            meds : data,
            label: label
        };

        this.$el.append(
            new MedGroupView({ model: model }).render().el
        );
    },

    export: function() {
        var json = [];

        _.each(this.collections, function(c, name) {
            json = json.concat(_.map(c.models, function(model) {
                var out = _.omit(model.toJSON(), "image");
                out.target = name;
                return out;
            }));
        });

        return json;
    }

});

module.exports = ReportView;
