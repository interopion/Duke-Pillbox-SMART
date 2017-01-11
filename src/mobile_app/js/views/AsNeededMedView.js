var MedView = require("./MedView.js");

var PillboxTiming = {
    "M"   : "Once a day - morning",
    "N"   : "Once a day - noon",
    "E"   : "Once a day - evening",
    "B"   : "Once a day - bedtime",
    "ME"  : "Twice a day",
    "MNE" : "Three times a day",
    "x4"  : "Four times a day",
    "x6"  : "Six times a day",
    "W"   : "Once a week",
    ""    : "When Needed"
};

var AsNeededMedView = MedView.extend({

    render : function() {
        var orig = App.collections.AllMeds.findWhere({
            rxnorm : this.model.get("rxnorm")
        });
        this.model.set("qty", orig.get("qty"));
        var qty = this.model.get("qty") + "";
        var dsg = this.model.get("dosage") + "";
        var psp = $('<div class="prescription"/>');

        MedView.prototype.render.call(this);

        this.$el.append('<div/>');
        this.$el.append(psp);

        psp.append($('<b class="dosage"/>').text(PillboxTiming[dsg] || ""));
        psp.append('<b>x</b>');
        psp.append($('<b class="qty"/>').text(qty && qty != "0" ? qty : "as needed"));
        this.$el.trigger("resize");
        //console.log(this.model.toJSON());
        return this;
    }
});

module.exports = AsNeededMedView;
