var PatientView = Backbone.View.extend({
    render : function() {
        this.$el.html([
            '<i class="icon icon-user"></i> <b>',
            this.model.get("name") || "N/A",
            "</b> &nbsp; DOB: <b>",
            this.model.get("birthdate") || "N/A",
            "</b> &nbsp; MRN: <b>",
            this.model.get("mrn") || "N/A",
            "</b>"
        ].join(""));
        return this;
    }
});

module.exports = PatientView;
