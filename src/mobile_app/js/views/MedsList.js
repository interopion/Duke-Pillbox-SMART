var CollectionView = require("./CollectionView.js");
var MedView        = require("./MedView.js");

// Renders the meds list
var MedsList = CollectionView.extend({
    collection : App.collections.AllMeds,
    modelView  : MedView,
    className  : "pillbox-meds-list"
});

module.exports = MedsList;
