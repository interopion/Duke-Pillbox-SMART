/* global App, Backbone */

var PatientView  = require("../views/PatientView.js");

var MainView = Backbone.View.extend({
    events : {
        "mousedown .btn-save"  : "record",
        "mousedown .btn-check" : "toggleCheck",
        "mousedown .btn-hint"  : "hint",
        "mousedown .btn-help"  : "help",
        "mousedown .btn-clear" : "clear",
        "mousedown .btn-exit"  : "exit"
    },

    initialize : function() {
        this.listenTo(
            App.collections.MorningMeds,
            "add remove reset sync change",
            this.updateUI
        );
        this.listenTo(
            App.collections.NoonMeds,
            "add remove reset sync change",
            this.updateUI
        );
        this.listenTo(
            App.collections.EveningMeds,
            "add remove reset sync change",
            this.updateUI
        );
        this.listenTo(
            App.collections.BedtimeMeds,
            "add remove reset sync change",
            this.updateUI
        );
        this.listenTo(
            App.collections.WeeklyMeds,
            "add remove reset sync change",
            this.updateUI
        );
        this.listenTo(
            App.collections.AsNeededMeds,
            "add remove reset sync change",
            this.updateUI
        );
    },

    render : function() {
        this.renderPatientInfo();
        this.updateUI();
        return this;
    },

    renderPatientInfo : function() {
        var patientView = new PatientView({
            model : App.models.Patient,
            el : this.$el.find(".patient-info")
        });
        patientView.render();
    },

    updateUI : function() {
        var view = this;
        if (view.updateUItimer) {
            clearTimeout(view.updateUItimer);
        }
        view.updateUItimer = setTimeout(function() {
            var hasAny = App.collections.MorningMeds.length ||
                App.collections.NoonMeds    .length ||
                App.collections.EveningMeds .length ||
                App.collections.WeeklyMeds  .length ||
                App.collections.BedtimeMeds .length ||
                App.collections.AsNeededMeds.length > 0;

            view.$el.find(".btn-clear, .btn-save")
                .prop("disabled", !!view.userState || !hasAny)
                .toggleClass("disabled", !!view.userState || !hasAny);

            if (App.autoCheck) {
                App.check();
            }
        }, 0);
    },

    // footer buttons ------------------------------------------------------
    toggleCheck : function(e) {
        if (e) {
            e.preventDefault();
        }
        App.runCommand("toggleCheck");
    },

    clear : function(e) {
        if (e) {
            e.preventDefault();
        }
        App.runCommand("clear");
    },

    record: function(e) {
        if (e) {
            e.preventDefault();
        }
        console.log(JSON.stringify(App.history.toJSON(), null, 4));
    },

    hint : function(e) {
        if (e) {
            e.preventDefault();
        }
        App.runCommand("toggleHint");
    },

    help : function(e) {
        if (e) {
            e.preventDefault();
        }
        App.runCommand("help");
    },

    exit : function(e) {
        if (e) {
            e.preventDefault();
        }
        App.exit();
    }
});

module.exports = MainView;
