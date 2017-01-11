var PatientModel = Backbone.Model.extend({

    idAttribute : "mrn",

    defaults : {
        name      : null,
        birthdate : null,
        mrn       : null
    },

    validate : function(attrs) {
        if (!attrs.name) {
            return new Error("Patient name is missing");
        }
        if (!attrs.birthdate) {
            return new Error("Patient birthdate is missing");
        }
        if (!attrs.mrn) {
            return new Error("Patient mrn is missing");
        }
    }
});

module.exports = PatientModel;
