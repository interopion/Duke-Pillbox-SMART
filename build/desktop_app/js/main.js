(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* global $, _, Backbone, QRCode, FHIR */
/* Shared Local Vars ---------------------------------------------------- */
var RXNORM = require("../../rxnorm.js");
var utils  = require("./utils.js");
var CODEC  = require("../../pillbox_codec.js");

var CFG = {
    quantity : {
        "max"     : 2,
        "step"    : 0.5,
        "default" : 1
    },
    maxMeds: 50
};

// This will hold all the meds that we know of
var ALL_MEDS = null;

// This will hold all the meds fot the current patient (from SMART)
var PATIENT_MEDS = null;

// Will contain some basic demographics info about the current patient
var PATIENT = null;

// Will contain the QRCode instance
var QRCODE = null;

// Will contain the SMART instance
var SMART = null;

var INVALID_TIMING_CODE = "INVALID_TIMING_CODE";

// Maps our timing codes to humanized values. These will be rendered inside the
// "interval" drop-down
var PillboxTiming = {
    "M"   : "① Once a day - morning",
    "N"   : "① Once a day - noon",
    "E"   : "① Once a day - evening",
    "B"   : "① Once a day - bedtime",
    "ME"  : "② Twice a day",
    "MNE" : "③ Three times a day",
    "x4"  : "④ Four times a day",
    "x6"  : "⑥ Six times a day",
    "W"   : "Ⓦ Once a week",
    ""    : "◯ When Needed",
    "INVALID_TIMING_CODE" : "⚠ Please Select"
};

var TimingMap = {
    "1d_"    : "M"  , // one per day                  -> morning (assumed default)
    "1d_HS"  : "B"  , // one per day before sleep     -> bedtime
    "1d_WAKE": "M"  , // one per day after waking     -> morning
    "1d_AC"  : "M"  , // one per day before a meal    -> morning (assumed default)
    "1d_ACM" : "M"  , // one per day before breakfast -> morning
    "1d_ACD" : "N"  , // one per day before lunch     -> noon
    "1d_ACV" : "E"  , // one per day before dinner    -> evening
    "1d_PC"  : "M"  , // one per day after a meal     -> morning (assumed default)
    "1d_PCM" : "M"  , // one per day after breakfast  -> morning
    "1d_PCD" : "N"  , // one per day after lunch      -> noon
    "1d_PCV" : "E"  , // one per day after dinner     -> evening
    "2d_"    : "ME" , // twice a day                  -> morning and evening (assumed default)
    "3d_"    : "MNE", // three per day                -> morning, noon and evening (assumed default)
    "4d_"    : "x4" , // 4 times per day              -> morning, noon, evening, bedtime
    "6d_"    : "x6" , // 6 times per day              -> each 4h
    "1wk_"   : "W",   // weekly
    ""       : ""     // as needed
};

var timingCodeMap = {
    "BID" : "ME",  // Two times a day at institution specified time   -> morning and evening (assumed default)
    "TID" : "MNE", // Three times a day at institution specified time -> morning, noon and evening (assumed default)
    "QID" : "x4",  // Four times a day at institution specified time  -> morning, noon, evening, bedtime
    "AM"  : "M",   // Every morning at institution specified times.   -> morning (assumed default)
    "PM"  : "N",   // Every afternoon at institution specified times. -> noon
    "QD"  : "M",   // Every Day at institution specified times        -> morning (assumed default)
    "Q4H" : "x6",  // Every 4 hours at institution specified times    -> each 4h
    "Q6H" : "x4",   // Every 6 Hours at institution specified times   -> morning, noon, evening, bedtime

    // We guess these might exist too
    // -------------------------------------------------------------------------
    "1x/Day" : "M",   // one per day               -> morning (assumed default)
    "2x/Day" : "ME",  // twice a day               -> morning and evening (assumed default)
    "3x/Day" : "MNE", // three per day             -> morning, noon and evening (assumed default)
    "4x/Day" : "x4" , // 4 times per day           -> morning, noon, evening, bedtime
    "6x/Day" : "x6" , // 6 times per day           -> each 4h
    "Daily"  : "M",   // one per day               -> morning (assumed default)
    "Weekly" : "W",   // weekly
    "q4hr"   : "x6" , // 6 times per day           -> each 4h
    "q6hr"   : "x4" , // 4 times per day           -> morning, noon, evening, bedtime
    "q8hr"   : "MNE", // three per day             -> morning, noon and evening (assumed default)
    "q12hr"  : "ME",  // twice a day               -> morning and evening (assumed default)
    "q24hr"  : "M",   // one per day               -> morning (assumed default)
    "qWeek"  : "W",   // weekly
    "qDay"   : "M",   // one per day               -> morning (assumed default)
    "qAM"    : "M",   // one per day               -> morning (assumed default)
    "Once a day (at bedtime)": "E", // one per day -> evening
    "Once a Day (at bedtime)": "E", // one per day -> evening
    "Once a Day (before meals)" : "N"  , // lunch  -> noon
    "Every 8 hours" : "MNE", // three per day      -> morning, noon and evening (assumed default)
    "Every 7 days"  : "W",   // weekly
    "3 times a day" : "MNE", // three per day      -> morning, noon and evening (assumed default)
    "With breakfast": "M"    // one per day        -> morning (assumed default)

    // These (and others) are not supported (no UI is designed for them)
    // -------------------------------------------------------------------------
    // "10x/Day" : "",
    // "QOD" : ""// Every Other Day at institution specified times
};

var ferquencyMap = {
    "M"  : 1, // one per day                  -> morning (assumed default)
    "B"  : 1, // one per day before sleep     -> bedtime
    "N"  : 1, // one per day before lunch     -> noon
    "E"  : 1, // one per day before dinner    -> evening
    "ME" : 2, // twice a day                  -> morning and evening (assumed default)
    "MNE": 3, // three per day                -> morning, noon and evening (assumed default)
    "x4" : 4, // 4 times per day              -> morning, noon, evening, bedtime
    "x6" : 6, // 6 times per day              -> each 4h
    "W"  : 1,   // weekly
    ""   : 0
};

var periodUnitsMap = {
    "M"  : "d", // one per day                  -> morning (assumed default)
    "B"  : "d", // one per day before sleep     -> bedtime
    "N"  : "d", // one per day before lunch     -> noon
    "E"  : "d", // one per day before dinner    -> evening
    "ME" : "d", // twice a day                  -> morning and evening (assumed default)
    "MNE": "d", // three per day                -> morning, noon and evening (assumed default)
    "x4" : "d", // 4 times per day              -> morning, noon, evening, bedtime
    "x6" : "d", // 6 times per day              -> each 4h
    "W"  : "wk",   // weekly
    ""   : ""
};

var TEMPLATES = {};

/* Utils -------------------------------------------------------------------- */

/**
 * Generates and returns the URL pointing to the mobile app which contains the
 * compressed data and information about the current meds.
 * @return {String}
 */
function getPillboxURL() {

    var meds = PATIENT_MEDS.filter(function(med) {
        return !med.get("ui_disabled") && !med.get("ui_invalid");
    });

    if (meds.length > CFG.maxMeds) {
        alert(
            "You cannot pass more than " +
            CFG.maxMeds +
            " meds to the pillbox exercise!"
        );
        return false;
    }

    var data = {
        patient     : PATIENT.toJSON(),
        medications : _.map(meds, function(med) {
            return {
                "rxnorm": med.get("rxnorm"),
                "dosage": med.get("timingCode"),
                "qty"   : med.get("quantity")
            };
        })
    };

    var targetHost = CFG.mobileHost.replace(/\/?$/, "");

    // console.log("QRCODE DATA: ", JSON.stringify(data, null, 4));
    var compressedData = CODEC.encode(data);
    //console.log("COMPRESSED QRCODE DATA: ", compressedData, compressedData.length);
    //console.log("UNCOMPRESSED QRCODE DATA: ", JSON.stringify(CODEC.decode(compressedData), null, 4));

    return targetHost + "/?q=" + compressedData;
}

/**
 * Generates the QR code for the mpbile app and shows it in popup div
 * @return void
 */
function showQRCode() {
    var url = getPillboxURL();
    if (url) {
        $('#qrcode').attr("href", url);
        $('#qrlen').html(//"<small>(" + url.length + " chars in QR code)</small> " +
            '<a class="btn btn-danger close-modal-btn" href="#" title="Close"></a>'
        );
        // console.log(
        //     decodeURIComponent(url) + "\n" +
        //     url + "\n" +
        //     encodeURI(url) + "\n" +
        //     encodeURIComponent(url)
        // );
        QRCODE.makeCode(url);

        $("body").addClass("modal-open");
        $('#result').show().find(".close-modal-btn").off("click").on("click", function() {
            $(this).off();
            $("#result").hide();
            $("body").removeClass("modal-open");
            return false;
        });
    }
}

/**
 * Opens the mobile app in new tab passing the additional "print" argument it
 * the url. This will make the pillbox to print itself (when it finishes
 * loading it's esternal resources).
 * @return void
 */
function printPillbox() {
    var url = getPillboxURL();
    if (url) {
        window.open(url + "&print=1");
    }
}

/**
 * Loads XML configuration files from the given @url. Parses them and responds
 * with plain configuration object.
 */
function getConfig(url, cb) {
    $.ajax({
        url      : url,
        dataType : "xml",
        cache    : false
    }).then(
        function(xmlDoc) {
            var out = {};
            $("option", xmlDoc).each(function(i, option) {
                var name  = option.getAttribute("name"),
                    type  = option.getAttribute("type"),
                    value = option.textContent;

                switch (type) {
                case "string":
                    value = value || "";
                    break;
                case "boolean":
                    value = value.toLowerCase() == "true";
                    break;
                case "number":
                    value = parseFloat(value || 0);
                    break;
                default:
                    return cb(new Error(
                        "Invalid configuration - invalid or missing option@type"
                    ));
                }
                out[name] = value;
            });

            cb(null, out);
        },
        function() {
            cb("Error loading config file");
        }
    );
}

/**
 * This is used to sort the PatientMedsCollection colections by name (asc)
 */
function sortMedsByNameAsc(a, b) {
    var _a = a.attributes.name.toLowerCase(),
        _b = b.attributes.name.toLowerCase();
    if (_a < _b) { return -1; }
    if (_a > _b) { return  1; }
    return 0;
}

/**
 * This is used to sort the PatientMedsCollection colections by name (desc)
 */
function sortMedsByNameDesc(a, b) {
    var _a = a.attributes.name.toLowerCase(),
        _b = b.attributes.name.toLowerCase();
    if (_a < _b) { return  1; }
    if (_a > _b) { return -1; }
    return 0;
}

/**
 * Returns the given string with it's first letter capitalized.
 * @pram {String|*} The input string (will be converted to string if it's not)
 * @return {String}
 */
function ucFirst(str) {
    str = String(str).replace(/^\s*/, "");
    if (!str.length) {
        return str;
    }
    return str.charAt(0).toUpperCase() + str.substr(1);
}

/**
 * Converts the available dosage data from SMART to Pillbox code
 * @return {String} Pillbox code (empty string on failure)
 */
function getIntervalCode(attributes) {

    if (!attributes.dosage || !attributes.dosage.timing) {
        return INVALID_TIMING_CODE;
    }

    // Looking for dosage.timing.code.text - Happens in Cerner
    var code = attributes.dosage.timing.code;
    if (code && code.text) {
        if (!timingCodeMap.hasOwnProperty(code.text)) {
            console.warn(
                'Invalid timing code for "%s" - "%s"',
                attributes.name,
                code.text,
                code
            );
        }
        return timingCodeMap[code.text] || INVALID_TIMING_CODE;
    }

    // Standart approach
    if (!attributes.dosage.timing.repeat ||
        !attributes.dosage.timing.repeat.frequency ||
        !attributes.dosage.timing.repeat.periodUnits)
    {
        return INVALID_TIMING_CODE;
    }

    var model     = attributes.dosage.timing.repeat;
    var frequency = model.frequency;
    var units     = model.periodUnits;
    var period    = model.period || 1;
    var when      = model.when || "";

    // In Epic: frequency: 1, period: 8, periodUnits: "h" means 3 x day
    if (frequency === 1 && units.toLowerCase() == "h") {
        units = "d";
        frequency = Math.ceil(24/period);
    }

    // Similary: frequency: 1, period: 7, periodUnits: "d" means 1 x week
    if (frequency === 1 && period === 7 && units.test(/^d(ays?)?/i)) {
        units = "wk";
    }

    code = frequency + units + "_";

    if (frequency === 1) {
        code = frequency + units + "_" + when;
    }

    if (!TimingMap.hasOwnProperty(code)) {
        code = frequency + units + "_";
    }

    if (!TimingMap.hasOwnProperty(code)) {
        console.warn(
            'Invalid timing code for "%s" - "%s"; Dosage:',
            attributes.name,
            code,
            attributes.dosage
        );
    }

    return TimingMap[code] || INVALID_TIMING_CODE;
}

function getQuantity(attributes) {
    var dosage   = attributes.dosage,
        out      = 0,
        entities = ["tab", "tabs", "tab(s)", "tablet", "amp"],
        re       = /^\s*(\d*)\s*(.*)/g;

    if (dosage && dosage.doseQuantity) {
        out = String(dosage.doseQuantity.value || 1).toLowerCase();
        out = out.replace(re, function(all, qty, subj) {

            // dosage.doseQuantity.value might be string like "100mg" but might
            // also be a number. If it's a number look for the units in
            // dosage.doseQuantity.unit
            if (!subj) {
                subj = String(dosage.doseQuantity.unit || "");
            }

            // Only number - use the number (or 0)
            if (!subj) {
                return (qty || 0) * 1;
            }

            // Known entity - use the number as is (or 1)
            if (entities.indexOf(subj) > -1) {
                return (qty || 1) * 1;
            }

            // Unknown entity - use 1
            return 1;
        });
    }

    return out;
}

function getFrequency(attributes) {
    return ferquencyMap[attributes.timingCode] || 0;
}

function getPeriodUnits(attributes) {
    return periodUnitsMap[attributes.timingCode] || 0;
}

/* Model and Collection Classes --------------------------------------------- */
var MedModel = Backbone.Model.extend({
    idAttribute : "rxnorm",

    defaults : {
        name          : null,
        rxnorm        : null,
        quantity      : 0,
        frequency     : 0,
        periodUnits   : "",
        timingCode    : INVALID_TIMING_CODE,
        "ui_disabled" : false,
        "ui_invalid"  : false
    },

    /**
     * Converts the medication name to one that always starts with capital
     * letter.
     */
    parse : function(data) {

        // name ----------------------------------------------------------------
        data.name = data.name || "";
        if (CFG.autoCapitalizeMedNames) {
            data.name = ucFirst(data.name);
        }

        // timingCode ----------------------------------------------------------
        data.timingCode = getIntervalCode(data);

        // quantity ------------------------------------------------------------
        data.quantity = getQuantity(data);

        // frequency -----------------------------------------------------------
        data.frequency = getFrequency(data);

        // periodUnits ---------------------------------------------------------
        data.periodUnits = getPeriodUnits(data);

        // ui_invalid ----------------------------------------------------------
        data.ui_invalid = data.timingCode === INVALID_TIMING_CODE;

        return data;
    }
});

var PatientModel = Backbone.Model.extend({
    idAttribute : "mrn",
    defaults : {
        name      : "",
        birthdate : "",
        mrn       : null
    },
    parse : function(response) {
        return {
            name      : $.trim(String(response.name || "")),
            birthdate : $.trim(String(response.birthdate || "")),
            mrn       : response.mrn || null
        };
    },
    validate : function(attrs) {
        var errors = {};
        if (!$.trim(String(attrs.mrn || ""))) {
            errors.mrn = new Error("Patient MRN is required");
        }
        if (!$.trim(String(attrs.name || ""))) {
            errors.name = new Error("Patient name is required");
        }
        if (!$.trim(String(attrs.birthdate || ""))) {
            errors.birthdate = new Error("Patient birthdate is required");
        }
        return $.isEmptyObject(errors) ? undefined : errors;
    }
});

var PatientMedsCollection = Backbone.Collection.extend({

    model : MedModel,

    comparator: sortMedsByNameAsc,

    // Read-only, fetch from smart
    sync : function(method, collection, options) {//console.log(arguments);

        var dfd = new $.Deferred(),
            patient = _.result(collection, "patient");

        if (!patient) {
            throw new Error('PatientMedsCollection neds a "patient" property');
        }

        options = options || {};

        collection.trigger('request', collection, dfd, options);

        function reject(jqXHR, textStatus, errorThrown) {
            console.log(arguments);
            if (_.isFunction(options.error)) {
                options.error(jqXHR, textStatus, errorThrown);
            }
            dfd.reject(jqXHR, textStatus, errorThrown);
        }

        function getName (medication) {
            if (medication.text) {
                return medication.text;
            } else if (medication.coding && medication.coding[0].display) {
                return medication.coding[0].display;
            } else {
                return null;
            }
        }

        if (method == "read") {
            collection.patient.api.fetchAllWithReferences({
                type : "MedicationOrder",
                query: {
                    status: "active"
                }
            },
            ['MedicationOrder.medicationReference']).then(
                function(res, references, textStatus, jqXHR) {
                    var prescriptions = res.data.entry && _.filter(res.data.entry, function(r){
                        return r.resource.resourceType === 'MedicationOrder';
                    }) || [];

                    prescriptions = prescriptions.map(function(e) {
                        return e.resource;
                    });

                    var medications = [];
                    var l = prescriptions.length;

                    function resolve() {
                        if (_.isFunction(options.success)) {
                            options.success(medications, textStatus, jqXHR);
                        }
                        dfd.resolve(medications, textStatus, jqXHR);
                    }

                    if (l === 0) {
                        return resolve();
                    }

                    prescriptions.forEach(function(prescription) {

                        var med = {};

                        if (prescription.medicationCodeableConcept) {
                            med = prescription.medicationCodeableConcept;
                        }
                        else if (prescription.medicationReference) {
                            var reference = prescription.medicationReference.reference;
                            var refObj = references[reference];
                            med = refObj && refObj.code || {};
                        }

                        var coding = med.coding && _.find(med.coding, function(c) {
                            return c.system === "http://www.nlm.nih.gov/research/umls/rxnorm" ||
                                c.system == "urn:oid:2.16.840.1.113883.6.88";
                        });

                        var code = coding ? (coding.code || null) : null;

                        if (code) {
                            medications.push({
                                'name'  : getName(med),
                                'rxnorm': code,
                                'dosage': prescription.dosageInstruction ?
                                    prescription.dosageInstruction[0] : {}
                            });
                        }
                        else {
                            console.warn('Skipped invalid prescription (no rxnorm)', prescription);
                        }
                    });

                    return resolve();
                },
                reject
            );
        }

        // Create, Update, Delete
        else {
            dfd.reject(dfd, "error", "Method not supported");
        }

        return dfd;
    }
});

var MedsCollection = Backbone.Collection.extend({

    url : "meds.json",

    model : MedModel,

    initialize : function() {
        Backbone.Collection.prototype.initialize.apply(this, arguments);
        this.on("error", function(model_or_collection, resp) {
            console.error(resp.status + " " + resp.statusText);
        });
    }
});

/* Shared Local Vars -------------------------------------------------------- */
PATIENT_MEDS = new PatientMedsCollection();
ALL_MEDS     = new MedsCollection();
PATIENT      = new PatientModel();

/* Views -------------------------------------------------------------------- */
var PatientMedsView = Backbone.View.extend({

    className : "patient-meds",

    events : {
        "change tr[data-id] :checkbox.toggle-row" : "onCheckboxChange",
        "change :checkbox.toggle-all"             : "toggleAll",
        "change .qty"                             : "onQtyChange",
        "change select.interval"                  : "onIntervalChange",
        "click th[data-column]"                   : "toggleSort"
    },

    initialize : function(options) {
        this.options = $.extend(true, {
            sortDir : "asc",
            columns : [
                {
                    label : '<input type="checkbox" class="toggle-all" checked/>',
                    colStyle : {
                        width: 20,
                        textAlign : "center"
                    },
                    render : function(model) {
                        return '<input type="checkbox" value="' + model.get("rxnorm") + '"' +
                            (model.get("ui_disabled") ? '' : ' checked') + ' class="' +
                            'toggle-row"/>';
                    }
                },
                {
                    label  : 'Medication',
                    column : "name"
                },
                {
                    label : 'Interval',
                    colStyle : {
                        width : 220
                    },
                    render : function(model) {
                        var code = model.get("timingCode"),
                            html = ['<select class="interval">'];
                        _.each(PillboxTiming, function(txt, key) {
                            html.push(
                                '<option' + (code === key ? " selected" : "") +
                                ' value="' + key + '">' + txt + '</option>'
                            );
                        });
                        return html.join("") + '</select>';
                    }
                },
                {
                    render : function() {
                        return "X";
                    },
                    colStyle : {
                        color : "#999",
                        textAlign: "center",
                        width: 20,
                        paddingLeft: 0,
                        paddingRight: 0
                    }
                },
                {
                    label : 'Quantity',
                    colStyle : {
                        whiteSpace : "nowrap",
                        width      : 130
                    },
                    render : function(model) {
                        return '<input type="number" min="0" ' +
                            'max="' + CFG.quantity.max + '" ' +
                            'step="' + CFG.quantity.step + '" ' +
                            'value="' + model.get("quantity") + '" ' +
                            'class="qty" />';
                    }
                }
            ]
        }, options);

        this.listenTo(this.collection, "request", this.onRequest);
        this.listenTo(this.collection, "sync"   , this.onSync   );
        this.listenTo(this.collection, "error"  , this.onError  );
        this.listenTo(this.collection, "add"    , this.addOne   );
        this.listenTo(this.collection, "reset"  , this.onReset  );
        this.listenTo(this.collection, "change" , this.onChange );
        this.listenTo(this.collection, "sort"   , this.onSort   );
    },

    onQtyChange : function(e, data) {
        if (!data || typeof data != "object") {
            return;
        }

        var el    = $(e.target),
            tr    = el.closest("tr"),
            id    = tr.attr("data-id"),
            model = this.collection.get(id);
        model.set("quantity", data.value);
    },

    onIntervalChange : function(e) {
        var el    = $(e.target),
            tr    = el.closest("tr"),
            id    = tr.attr("data-id"),
            model = this.collection.get(id),
            val   = el.val(),
            data  = {
                timingCode: val,
                ui_invalid: val === INVALID_TIMING_CODE
            };

        switch (val) {
        case "M":
            data.frequency   = 1;
            data.periodUnits = "d";
            break;
        case "N":
            data.frequency   = 1;
            data.periodUnits = "d";
            break;
        case "E":
            data.frequency   = 1;
            data.periodUnits = "d";
            break;
        case "B":
            data.frequency   = 1;
            data.periodUnits = "d";
            break;
        case "ME":
            data.frequency   = 2;
            data.periodUnits = "d";
            break;
        case "MNE":
            data.frequency   = 3;
            data.periodUnits = "d";
            break;
        case "x4":
            data.frequency   = 4;
            data.periodUnits = "d";
            break;
        case "x6":
            data.frequency   = 6;
            data.periodUnits = "d";
            break;
        case "W":
            data.frequency   = 1;
            data.periodUnits = "wk";
            break;
        case INVALID_TIMING_CODE:
            data.periodUnits = "";
            break;
        default:// when needed
            data.frequency   = 0;
            data.periodUnits = "d";
            break;
        }

        model.set(data);
    },

    onCheckboxChange : function(e) {
        var tr = $(e.target).closest("tr"),
            cb = tr.find(":checkbox"),
            id = tr.attr("data-id");
        this.collection.get(id).set("ui_disabled", !cb.prop("checked"));
    },

    onChange : function(model/*, options*/) {
        var tr      = this.$el.find('tr[data-id="' + model.id + '"]'),
            invalid = model.get("ui_invalid"),
            on      = !model.get("ui_disabled");

        tr.toggleClass("disabled", (!invalid && !on))
            .toggleClass("invalid", !!invalid)
            .find(":checkbox")
            .prop("checked", on);
    },

    toggleAll : function(e) {
        this.collection.each(function(model) {
            model.set("ui_disabled", !e.target.checked);
        });
    },

    showLoadingIndicator : function() {
        this.loader.addClass("visible");
    },

    hideLoadingIndicator : function() {
        var view = this;
        setTimeout(function() {
            view.loader.removeClass("visible");
        }, 600);
    },

    onRequest : function(/*collection, xhr, options*/) {//console.info("onRequest");
        this.showLoadingIndicator();
        this._hasLoaded = true;
    },

    onSync : function(/*collection, resp, options*/) {//console.info("onSync");
        this.hideLoadingIndicator();
    },

    onError : function(/*collection, resp, options*/) {//console.info("onError");
        this.hideLoadingIndicator();
    },

    onReset : function(/*collection, options*/) {//console.info("onReset");
        this.collection.sort();
    },

    onSort : function() {//console.info("onSort");
        this.tbody.empty();
        this.renderTableBody();
    },

    toggleSort : function(e) {
        var col = $(e.target).closest("th[data-column]")
            .addClass("sorted")
            .removeClass(this.options.sortDir);
        col.siblings().removeClass("sorted asc desc");

        this.options.sortDir = this.options.sortDir == "asc" ? "desc" : "asc";
        this.collection.comparator = this.options.sortDir == "asc" ?
            sortMedsByNameAsc :
            sortMedsByNameDesc;
        this.collection.sort();
        col.addClass(this.options.sortDir);
    },

    render : function() {
        this.$el.html(
            '<div class="loading-indicator">Loading...</div>' +
            '<table class="grid"><thead/><tbody/></table>'
        );
        this.thead  = this.$el.find("thead");
        this.tbody  = this.$el.find("tbody");
        this.loader = this.$el.find(".loading-indicator");
        this.renderTableHead();
        this.renderTableBody();
        this.$el.trigger("customcontent");
        return this;
    },

    renderTableHead : function() {
        var row = $('<tr/>');
        _.each(this.options.columns, function(col) {
            var th = $('<th/>').appendTo(row);
            th.html(col.label || col.column);
            if (col.colStyle) {
                th.css(col.colStyle);
            }
            if (col.column) {
                th.attr("data-column", col.column).addClass("sorted asc");
            }
        });
        this.thead.html(row);
    },

    renderTableBody : function(message) {
        if (message || !this.collection.length) {
            message = message || this._hasLoaded ? "No Data Available" : "Please wait...";
            this.tbody.html([
                '<tr>',
                '<td colspan="' + this.options.columns.length +'">',
                '<p class="text-center"><b style="color:#777">',
                _.escape(message),
                '</b></p>',
                '</td>',
                '</tr>'
            ].join(""));
        }
        else {
            this.collection.each(this.addOne, this);
        }
    },

    addOne : function(model) {

        if (this.collection.length === 1) {
            this.tbody.empty();
        }

        var view = this,
            row  = $('<tr/>')
                .attr("data-id", model.id)
                .toggleClass("custom", !!model.get("ui_custom"))
                .toggleClass("disabled", !!model.get("ui_disabled"))
                .toggleClass("invalid", !!model.get("ui_invalid"))
                .appendTo(view.tbody);

        _.each(view.options.columns, function(col, colIndex) {
            var td = $('<td/>').appendTo(row);
            if (col.render) {
                td.html(col.render(model, col, colIndex));
            } else if (col.column) {
                td.text(model.get(col.column));
            }

            if (col.colStyle) {
                td.css(col.colStyle);
            }
        });

        row.trigger("customcontent");
    }
});

var MedsGridView = Backbone.View.extend({

    className : "grid-view",

    events : {
        "click .grid-paginator .next" : "nextPage",
        "click .grid-paginator .prev" : "prevPage",
        "click td"                    : "onSelectionChange",
        "input input[type=search]"    : "onSearch",
        "click th:last"               : "toggleSort",
        "click .add-selected-meds"    : "commitSelection",
        "click a.close-modal-btn"     : "close"
    },

    initialize : function(options) {
        this.options = $.extend(true, {
            columns : [
                {
                    label : '',
                    colStyle : {
                        width: 20,
                        textAlign : "center"
                    },
                    render : function(model) {
                        return '<input type="checkbox"' + (model.ui_selected ? ' checked' : '') + '/>';
                    }
                },
                {
                    label  : "Medication",
                    search : true,
                    column : "name",
                    colStyle : {
                        width: "100%"
                    }
                }
            ],
            limit : 10,
            offset: 0
        }, options);

        this.listenTo(this.collection, "change" , this.onChange);
        this.listenTo(this.collection, "sort" , this.renderTableBody);

        this.renderInitialLayout();
    },

    onChange : function(model) {
        var tr = this.$el.find('tr[data-id="' + model.id + '"]'),
            on = model.get("ui_selected"),
            xx = model.get("ui_disabled");

        if (xx) {
            return false;
        }

        tr.toggleClass("selected", on).find(":checkbox").prop("checked", on);

        this.$el.find(".add-selected-meds").prop(
            "disabled",
            this.collection.where({ ui_selected : true }).length === 0
        );
    },

    renderInitialLayout : function() {
        this.$el.addClass("grid-view").html(
            '<a class="btn btn-danger close-modal-btn" href="#" title="Close"></a>' +
            '<h2 style="margin:0">Select medications to add</h2><hr><br>' +
            '<input type="search" placeholder="Search" /><br>' +
            '<table class="grid"><thead/><tbody/></table>' +
            '<div class="grid-paginator">' +
                '<div class="btns">' +
                    '<a href="javascript:void 0" class="prev btn">' +
                        '<small>&#9664;</small>&nbsp;Prev' +
                    '</a>' +
                    '<a href="javascript:void 0" class="next btn">' +
                        'Next&nbsp;<small>&#9654;</small>' +
                    '</a>' +
                '</div>' +
            '</div>' +
            '<div class="grid-status"/>' +
            '<br clear="all"/><hr><p class="text-center">' +
                '<button class="add-selected-meds" disabled>✚ Add Selected</button>' +
            '</p>'
        );
        this.thead = this.$el.find("thead");
        this.tbody = this.$el.find("tbody");
    },

    render : function() {
        this.renderTableHead();
        this.renderTableBody();
        this.renderPaginator();
        this.renderStatus();
        return this;
    },

    renderTableHead : function() {
        var row = $('<tr/>');
        _.each(this.options.columns, function(col) {
            var th = $('<th/>').appendTo(row);
            th.html(col.label || col.column);
            if (col.colStyle) {
                th.css(col.colStyle);
            }
            if (col.column) {
                th.attr("data-column", col.column);
            }
        });
        this.thead.html(row);
    },

    renderTableBody : function() {
        var view      = this,
            data      = [],
            total     = 0,
            lastIndex,
            q = $.trim(String(view.search || "")).toLowerCase(),
            modelIndex,
            model;

        if (q) {
            view.options.offset = 0;

            view.collection.each(function(rec) {
                var exclude = false;

                rec.set("ui_disabled", !!PATIENT_MEDS.get(rec.id));

                $.each(view.options.columns, function(i, col) {
                    if (col.column && col.search) {
                        var value = String(rec.get(col.column)),
                            idx   = value.toLowerCase().indexOf(q);
                        if (idx == -1) {
                            exclude = true;
                            return false;
                        }
                    }
                });

                if (!exclude) {
                    data.push(rec.toJSON());
                }
            });
        } else {
            view.collection.each(function(rec) {
                rec.set("ui_disabled", !!PATIENT_MEDS.get(rec.id));
            });
            data = view.collection.toJSON();
        }

        total = data.length;
        lastIndex = Math.min(
            view.options.offset + view.options.limit,
            total
        );

        view.tbody.empty();

        this.lastIndex = lastIndex;
        this.total = total;

        function createCell(col, colIndex) {
            var td = $('<td/>').appendTo(this);
            if (col.render) {
                td.html(col.render(model, col, modelIndex, colIndex));
            } else if (col.column) {
                if (q) {
                    var str = String(model[col.column]),
                        idx = $.trim(str.toLowerCase()).indexOf(q);
                    if (idx > -1) {
                        td.html(
                            str.substr(0, idx) +
                            '<span class="search-match">' +
                            str.substr(idx, q.length) +
                            '</span>' +
                            str.substr(idx + q.length)
                        );
                    } else {
                        td.text(str);
                    }
                } else {
                    td.text(model[col.column]);
                }
            }

            if (col.colStyle) {
                td.css(col.colStyle);
            }
        }

        for(modelIndex = view.options.offset;
            modelIndex < lastIndex;
            modelIndex += 1)
        {
            model = data[modelIndex];

            //var disabled = !!PATIENT_MEDS.get(model.rxnorm);
            //model.set("ui_disabled", disabled);

            var row = $('<tr/>')
                    .attr("data-id", model.rxnorm)
                    .toggleClass("selected", !!model.ui_selected)
                    .toggleClass("disabled", !!model.ui_disabled)
                    .appendTo(view.tbody);

            _.each(view.options.columns, createCell, row);
        }

        this.$el.find(".add-selected-meds").prop(
            "disabled",
            this.collection.where({ ui_selected : true }).length === 0
        );
    },

    renderPaginator : function() {
        var total = this.total,
            off   = this.options.offset === 0;

        this.$el.find(".grid-paginator .prev")
            .prop("disabled", off)
            .toggleClass("disabled", off);

        off   = this.options.offset + this.options.limit >= total;

        this.$el.find(".grid-paginator .next")
            .prop("disabled", off)
            .toggleClass("disabled", off);
    },

    renderStatus : function() {
        this.$el.find(".grid-status").text(
            (this.options.offset + 1) +
            " to " +
            this.lastIndex +
            " of " +
            this.total
        );
    },

    nextPage : function() {
        this.options.offset += this.options.limit;
        this.render();
    },

    prevPage : function() {
        this.options.offset -= this.options.limit;
        this.render();
    },

    onSelectionChange : function(e) {
        var tr    = $(e.target).closest("tr"),
            input = tr.find(":checkbox"),
            id    = tr.attr("data-id"),
            model = this.collection.get(id);

        if (model) {
            if (model.get("ui_disabled") === true) {
                input.prop("checked", false);
                e.preventDefault();
            } else {
                model.set("ui_selected", !model.get("ui_selected"));
            }
        }
    },

    onSearch : function(e) {
        var q = $(e.target).val().trim();
        this.search = q;
        this.offset = 0;
        this.render();
    },

    toggleSort : function(e) {
        var col = $(e.target).closest("th[data-column]")
            .addClass("sorted")
            .removeClass(this.options.sortDir);
        col.siblings().removeClass("sorted asc desc");

        this.options.sortDir = this.options.sortDir == "asc" ? "desc" : "asc";
        this.collection.comparator = this.options.sortDir == "asc" ?
            sortMedsByNameAsc :
            sortMedsByNameDesc;
        this.collection.sort();
        col.addClass(this.options.sortDir);
    },

    commitSelection : function() {
        var selected = this.collection.where({
            ui_selected : true,
            ui_disabled : false
        });

        _.each(selected, function(model) {
            PATIENT_MEDS.add(model.toJSON(), {
                sort : !!CFG.sortMergeCustomMeds,
                parse: true
            });
            model.set({
                ui_selected : false,
                ui_disabled : false
            });
        });

        this.close();
    },

    close : function() {
        this.stopListening();
        this.$el.off().closest(".modal").empty().hide();
        $("body").removeClass("modal-open");
    }
});

var PatientView = Backbone.View.extend({
    events : {
        "chnage input[name=name]"      : "setName",
        "chnage input[name=birthdate]" : "setBirthdate",
        "chnage input[name=mrn]"       : "setMRN",
        "keyup  input[name=name]"      : "setName",
        "keyup  input[name=birthdate]" : "setBirthdate",
        "keyup  input[name=mrn]"       : "setMRN"
    },

    initialize : function() {
        this.listenTo(this.model, "change", this.check);
    },

    check : function() {
        var errors = this.model.validate(this.model.attributes) || {};
        _.each(["name", "mrn", "birthdate"], function(prop) {
            var input = this.$el.find('input[name="' + prop + '"]');
            if (input.length) {
                if (errors[prop]) {
                    input
                    .addClass("has-error")
                    .prop("title", errors[prop].message);
                } else {
                    input
                    .removeClass("has-error")
                    .prop("title", "Patient '" + prop + "' is OK");
                }
            }
        }, this);
    },

    setName : function(e) {
        this.model.set("name", e.target.value);
    },

    setBirthdate : function(e) {
        this.model.set("birthdate", e.target.value);
    },

    setMRN : function(e) {
        this.model.set("mrn", e.target.value);
    },

    render : function() {
        var view = this;
        view.$el.html(TEMPLATES.patientInfo(view.model.toJSON()));
        setTimeout(function() {
            view.$el.addClass("visible");
        }, 20);
        return this;
    }
});

var ReportView = Backbone.View.extend({
    events : {
        "show" : "onShow",
        "click .btn-replay" : "replay"
    },

    onShow : function() {
        if (PATIENT.hasFailed) {
            if ($.trim(CFG.backendHost)) {
                this.render();
            }
        }
        else if (!this._isRendered) {
            if (!PATIENT.id) {
                PATIENT.once("change", _.bind(this.onShow, this));
            } else {
                this.render();
                this._isRendered = true;
            }
        }
    },

    render : function() {
        var view = this;
        if (PATIENT.hasFailed) {
            view.$el.html('<p class="text-center">No patient data available</p>');
        } else {
            if (!this._isRendered) {
                view.$el.html('<p class="text-center">Loading...</p>');
            }
            view.fetch().then(
                function(data) {
                    view.data = data;
                    view.$el.html(TEMPLATES.report({
                        patient : PATIENT.toJSON(),
                        data    : data
                    }));
                },
                function() {
                    view.$el.html(
                        '<p class="text-center">' +
                        'The patient does not have any data stored so far' +
                        '</p>'
                    );
                }
            );

            if ($.trim(CFG.backendHost)) {
                setTimeout(_.bind(this.render, this), CFG.poolDelay);
            }
        }
        return this;
    },

    fetch : function() {
        if ($.trim(CFG.backendHost)) {
            return $.ajax({
                url : CFG.backendHost.replace(/\/?$/, "/"),
                data : {
                    mrn : PATIENT.id
                }
            });
        }
        else {
            var dfd = new $.Deferred();
            dfd.reject("The back-end service is not available!");
            return dfd.promise();
        }
    },

    replay : function() {
        $("#replay .title").text(
            PATIENT.get("name") + " - " +
            new Date(this.data.time).toLocaleString()
        );

        $('#replay').show().find(".close-modal-btn").off("click").on("click", function() {
            $(this).off();
            $("#replay").hide().find("iframe").attr("src", "about:blank");
            $("body").removeClass("modal-open");
            return false;
        });

        $("body").addClass("modal-open");

        $("#replay iframe").prop(
            "src",
            CFG.mobileHost.replace(/\/?$/, "/") + "?q=" + CODEC.encode({
                patient : PATIENT.toJSON(),
                play: 1
            })
        );

        $("#replay .close-modal-btn").off("blur").on("blur", function() {
            var btn = $(this);
            setTimeout(function() {
                if (btn.is(":visible")) {
                    btn.trigger("focus");
                }
            }, 100);
        }).trigger("focus");
    }
});

var MainView = Backbone.View.extend({
    events : {
        "click #generate"        : "makeCode",
        "click #add-meds"        : "addMeds",
        "click #open-translator" : "openTranslator"
    },

    initialize : function()
    {
        var view = this;

        var patientView = this.patientView = new PatientView({
            model : PATIENT,
            el    : ".patient-info"
        });

        QRCODE = new QRCode(document.getElementById("qrcode"), {
            width  : 600,
            height : 600,
            typeNumber : 40,
            correctLevel: 2
        });

        view.listenTo(PATIENT, "change", view.updateGenerateButton);

        $.when(
            $.get("./tpl/report.ejs"),
            $.get("./tpl/patientInfo.ejs")
        ).then(
            function(report, patientInfo) {
                TEMPLATES.report = _.template(
                    report[0], {
                        variable: "data"
                    }
                );

                TEMPLATES.patientInfo = _.template(
                    patientInfo[0],
                    {
                        variable: "data"
                    }
                );

                var patientMedsView = new PatientMedsView({
                    el         : ".patient-meds",
                    collection : PATIENT_MEDS
                }).render();

                new ReportView({
                    el : '.tab-panel[data-id="report"]'
                });

                patientMedsView.showLoadingIndicator();

                getConfig("config.xml", function(err, settings) {
                    if (err) {
                        return console.error(err);
                    }

                    $.extend(true, CFG, settings);

                    $.each(RXNORM, function(rxnorm, name) {
                        ALL_MEDS.add({
                            rxnorm    : rxnorm,
                            name      : name,
                            ui_custom : true
                        }, { parse: true });
                    });

                    FHIR.oauth2.ready(function(smart) {
                        SMART = smart;
                        SMART.patient.read().then(
                            function(pt) {
                                PATIENT.set({
                                    name      : pt.name[0].given.join(" ") + " " +  pt.name[0].family.join(" "),
                                    mrn       : pt.identifier[0].value,
                                    birthdate : pt.birthDate
                                });
                                patientView.render();

                                PATIENT_MEDS.patient = smart.patient;

                                PATIENT_MEDS.fetch({ reset : true }).then(
                                    function() {
                                        //console.log("success: ", arguments);
                                    },
                                    function(msg, dfd) {
                                        console.log("failure: ", arguments);
                                        patientMedsView.renderTableBody("No EMR data available. " + dfd[2]);
                                    }
                                );
                            },
                            function(msg, params) {
                                patientMedsView.hideLoadingIndicator();
                                patientView.render();
                                //console.log(arguments);
                                var txt = [], loc;
                                if (msg) {
                                    txt.push(msg);
                                }
                                if (params && params[0]) {
                                    if (params[0].statusText) {
                                        txt.push(params[0].statusText);
                                    }
                                    if (params[0].status && params[0].status == 401) {
                                        loc = "https://authorize.smartplatforms.org/login";
                                    }
                                }
                                txt = txt.join("\n");
                                if (txt) {
                                    console.warn(txt);
                                    patientMedsView.renderTableBody("No EMR data available. " + msg);
                                }
                                if (loc) {
                                    //location.href = loc;
                                }
                                PATIENT.hasFailed = true;
                            }
                        );
                    }, function(error) {
                        console.error(error);
                        patientMedsView.hideLoadingIndicator();
                        patientMedsView.renderTableBody(
                            "No EMR data available. " + err
                        );
                        PATIENT.hasFailed = true;
                        patientView.render();
                    });
                });

                view.listenTo(
                    PATIENT_MEDS,
                    "change add reset",
                    view.updateGenerateButton
                );
            },
            function(xhr, status, err) {
                console.error(err || status || "error");
            }
        );
    },

    updateGenerateButton : function()
    {
        this.patientView.check();
        this.$el.find("#generate").prop(
            "disabled",
            !PATIENT.isValid(PATIENT.attributes) ||
            !PATIENT_MEDS.length ||
            PATIENT_MEDS.where({ ui_disabled : false }).length === 0
        );
    },

    render : function()
    {
        return this;
    },

    addMeds : function()
    {
        $("#all-meds-popup").show();
        $("body").addClass("modal-open");
        new MedsGridView({
            el : "#all-meds-popup",
            collection : ALL_MEDS
        }).render();
    },

    makeCode : function(e)
    {
        e.preventDefault();
        showQRCode({
            patient : PATIENT.toJSON()
        });
    },

    openTranslator : function(e)
    {
        e.preventDefault();

        if ($.trim(CFG.backendHost)) {
            $("#translation-manager").show().find("iframe").attr(
                "src",
                CFG.backendHost.replace(/\/?$/, "") + "/translate.html"
            );
        }
        else {
            $("#translation-manager").empty().html(
                '<h4 style="color:red;text-align:center">' +
                    'The back-end service is not available!' +
                '</h4>'
            ).show();
        }
        $("body").addClass("modal-open");
    }
});


/* App ---------------------------------------------------------------------- */
function Workspace() {
    new MainView({ el : "body" });
}

// Export ----------------------------------------------------------------------
Workspace.util = {
    formatTime : utils.formatTime,
    pillboxTime : function(code) {
        return PillboxTiming[code];
    }
};

window.App = Workspace;
window.printPillbox = printPillbox;

$(function() {

    // Tabs --------------------------------------------------------------------
    $(document).on("click", ".tabs > .tab", function(e, force) {
        var $tab = $(this), id;

        if (!force && $tab.is(".active")) {
            return false;
        }

        $tab.addClass("active").siblings(".tab").removeClass("active");

        id = $tab.attr("data-id");
        if (id) {
            $tab.closest(".tabs").find(".tab-panel").each(function(i, o) {
                var $o = $(o),
                    isActive = $o.is(".active");
                if ($o.attr("data-id") == id) {
                    if (!isActive) {
                        $o.addClass("active").trigger("show");
                    }
                } else {
                    if (isActive) {
                        $o.removeClass("active").trigger("hide");
                    }
                }
            });
        }
    });
    $(".tabs > .tab.active").trigger("click", true);

    // Modals ------------------------------------------------------------------
    $(window).on("message", function(e) {
        if (e.originalEvent.data == "closeModals") {
            var $modal = $("body.modal-open .modal:visible");
            if ($modal.length) {
                $modal.trigger("close").hide()
                    .find("iframe").attr("src", "about:blank");
                $("body").removeClass("modal-open");
            }
        }
    });

    $(window).on("keydown", function(e) {
        if (e.keyCode == 27) {
            var $modal = $("body.modal-open .modal.kbd:visible");
            if ($modal.length) {
                $modal.trigger("close").hide();
                $("body").removeClass("modal-open");
            }
        }
    });
    $("body").on("mousedown", "#overlay", function() {
        var $modal = $("body.modal-open .modal.kbd:visible");
        if ($modal.length) {
            $modal.trigger("close").hide();
            $("body").removeClass("modal-open");
        }
        return false;
    });
});

require("./widgets/StepInput.js");

},{"../../pillbox_codec.js":4,"../../rxnorm.js":5,"./utils.js":2,"./widgets/StepInput.js":3}],2:[function(require,module,exports){
/**
 * Returns the int representation of the first argument or the
 * "defaultValue" if the int conversion is not possible.
 * @param {*} x The argument to convert
 * @param {*} defaultValue The fall-back return value. This is going to be
 * converted to integer too.
 * @return {Number} The resulting integer.
 */
function intVal( x, defaultValue ) {
    var out = parseInt(x, 10);
    if ( isNaN(out) || !isFinite(out) ) {
        out = defaultValue === undefined ? 0 : intVal( defaultValue );
    }
    return out;
}

/**
 * Returns the float representation of the first argument or the
 * "defaultValue" if the float conversion is not possible.
 * @param {*} x The argument to convert
 * @param {*} defaultValue The fall-back return value. This is going to be
 * converted to float too.
 * @return {Number} The resulting floating point number.
 */
function floatVal( x, defaultValue ) {
    var out = parseFloat(x);
    if ( isNaN(out) || !isFinite(out) ) {
        out = defaultValue === undefined ? 0 : floatVal( defaultValue );
    }
    return out;
}

/**
 * Rounds the given number to configurable precision.
 * @param {numeric} n The argument to round.
 * @param {Number} precision The precision (number of digits after the
 * decimal point) to use.
 * @return {Number} The resulting number.
 */
function roundToPrecision(n, precision) {
    n = parseFloat(n);
    if ( isNaN(n) || !isFinite(n) ) {
        return NaN;
    }
    if ( !precision || isNaN(precision) || !isFinite(precision) || precision < 1 ) {
        return Math.round( n );
    }
    var q = Math.pow(10, precision);
    return Math.round( n * q ) / q;
}

function formatTime(input, options) {
    var ms = Math.abs(intVal(input)),
        fragments = [
            { unit: "millisecond", weight: 1 },
            { unit: "second"     , weight: 1000 },
            { unit: "minute"     , weight: 1000 * 60 },
            { unit: "hour"       , weight: 1000 * 60 * 60 },
            { unit: "day"        , weight: 1000 * 60 * 60 * 24 },
            { unit: "week"       , weight: 1000 * 60 * 60 * 24 * 7 },
            { unit: "month"      , weight: 1000 * 60 * 60 * 24 * 365.25 / 12 },
            { unit: "year"       , weight: 1000 * 60 * 60 * 24 * 365.25 }
        ],
        out = [],
        cfg = $.extend(true, {
            separator : ", ",
            skipEmpty : true,
            abbr      : false,
            round     : 2,
            seconds   : true,
            minutes   : true,
            hours     : true,
            days      : true,
            weeks     : true,
            months    : true,
            years     : true
        }, options),
        last, i, f, n, l = 0;

    for ( i = fragments.length - 1; i >= 0; i--) {
        f = fragments[i];
        if (!cfg[f.unit + "s"]) {
            continue;
        }
        n = Math.floor(ms / f.weight);
        if (n || (!cfg.skipEmpty && cfg.round - i > 0)) {
            out.push(
                n + " " + f.unit + (n === 1 ? "" : "s")
            );
        }
        ms -= n * f.weight;

        if (n && ++l >= cfg.round) {
            break;
        }
    }

    last = out.pop();

    return out.join(cfg.separator) + (
        out.length ?
            " and " :
            ""
    ) + last;
}


module.exports = {
    intVal           : intVal,
    floatVal         : floatVal,
    formatTime       : formatTime,
    roundToPrecision : roundToPrecision
};

},{}],3:[function(require,module,exports){
var utils = require("../utils.js");

var stepInputTemplate = [
    '<div class="step-input">',
        '<input type="text" autocomplete="off"/>',
        '<a class="btn-up"></a>',
        '<a class="btn-down"></a>',
    '</div>'
].join("");

/**
 * Defines a widget that can replace any input[type="number"] with custom made
 * inputs which can work in old browsers and maintain (nearly) the same
 * appearance on every browser.
 * @param {DOMElement|jQuery|CSS selector} The input element
 * @param {Object} options The settings (@see StepInput.defaults)
 * @constructor
 */
function StepInput(elem, options) {

    /**
     * The options of the instance.
     * @type {Object}
     */
    this.options = {};

    if (elem) { // skip inheritance calls
        this.init(elem, options);
    }
}

/**
 * The default options for any StepInput instance.
 * @type {Object}
 * @static
 */
StepInput.defaults = {
    min            : 0,
    max            : 100,
    value          : "",
    step           : 1,
    roundPrecision : 0
};

$.extend(StepInput.prototype, {

    /**
     * The internal value
     * @type {Number}
     * @private
     */
    _value : null,

    /**
     * Sometimes it might be useful to multiply the increment step by something.
     * For example, if the input represents weight rendered in kg but stored
     * internaly in grams, then _stepMultiplier = 1000 can do the trick...
     */
    _stepMultiplier : 1,

    /**
     * Initialize the instance.
     * @param {DOMElement|jQuery|CSS selector} The input element
     * @param {Object} options The settings (@see StepInput.defaults)
     * @returns {StepInput} Returns the StepInput instance.
     */
    init : function(elem, options)
    {
        var inst = this, orig;

        orig = $(elem).eq(0);

        if (!orig.is('input[type="number"]')) {
            throw new Error(
                'The StepInput widget can only be used to replace number inputs'
            );
        }

        $.extend(true, this.options, StepInput.defaults, {
            min  : utils.floatVal(orig.attr("min" ), 0  ),
            max  : utils.floatVal(orig.attr("max" ), 100),
            step : utils.floatVal(orig.attr("step"), 1  ),
            size : utils.floatVal(orig.attr("size"), 0  ) || null,
            roundPrecision : utils.intVal(orig.attr("data-precision")) || 1
        }, options);

        this.root = $(stepInputTemplate);
        orig.after(this.root);

        this.input = this.root.find("input").data("StepInput", this);

        _.each(orig[0].attributes, function(attr) {
            if (attr.name != "type" && attr.name != "disabled") {
                this.input.attr(attr.name, attr.value);
            }
        }, this);

        this.value($.trim(orig.val()), true);
        this.root.toggleClass("disabled", orig.is(":disabled"));
        orig.remove();

        this.root
        .on("touchold", "b", false)
        .on("keydown", "input", function(e) {
            switch (e.keyCode) {
                case 38: // up
                    inst.step(1);
                    break;
                case 40: // down
                    inst.step(-1);
                    break;
            }
        })
        .on("touchstart mousedown", ".btn-up", function() {//debugger;
            if (!$(this).closest(".disabled").length) {
                inst.up();
                inst.input.trigger("focus");
            }
            return false;
        })
        .on("touchstart mousedown", ".btn-down", function() {
            if (!$(this).closest(".disabled").length) {
                inst.down();
                inst.input.trigger("focus");
            }
            return false;
        })
        .on("mouseleave mouseup touchend touchcancel", function() {
            if (!$(this).closest(".disabled").length) {
                inst.stop();
            }
        })
        .on("change", "input", function(e, virtual) {
            if (!virtual) {
                inst.value(inst.parse(this.value), true);
            }
        });

        return this;
    },

    /**
     * Sets or gets the value. If called without arguments acts as getter.
     * @param {numeric} n The value to set. Can also be an empty string to
     * clear the input value.
     * @param {Boolean} silent If set this will prevent the method from
     * triggering the change event on the input.
     * @returns {StepInput|Strung} When used as getter returns the input value
     * as string. Otherwise it returns the StepInput instance.
     */
    value : function(n, silent)
    {
        var hasChanged;

        if (n === undefined) {
            return this._value;
        }

        // Allow empty strings as argument to clear the input value (note
        // that this does not change the internal value.
        if (n === "") {
            if ( this.input.val() !== "" ) {
                this.input[0].value = "";
                if ( !silent ) {
                    if ($.isFunction(this.options.change)) {
                        this.options.change(this._value);
                    }
                    this.input.trigger("change", [{
                        value : this._value,
                        text  : this.input.val()
                    }]);
                }
            }
        } else {
            n = utils.floatVal(n);
            n = Math.max(Math.min(n, this.options.max), this.options.min);
            hasChanged = n !== this._value;
            this._value = n;
            this.input[0]._valueAsNumber = n;
            this.input[0].value = (this.options.format || this.format).call(
                this,
                utils.roundToPrecision(this._value, this.options.roundPrecision)
            );

            if (hasChanged) {

                this.root.toggleClass("max", n >= this.options.max);
                this.root.toggleClass("min", n <= this.options.min);

                this.onChange(n);
                if ( !silent ) {
                    if ($.isFunction(this.options.change)) {
                        this.options.change(this._value);
                    }
                    this.input.trigger("change", [{
                        value : this._value,
                        text  : this.input.val()
                    }]);
                }
            }
        }
        return this;
    },

    /**
     * Changes the internal value by adding @n. The argument can be positive
     * number to increment the value or negative to decrement it. The result
     * will fit withing the allowed range and will be clipped if necessary.
     * @param {Number} n
     * @private
     */
    step : function(n)
    {
        if ( this.canStep(n) ) {
            this.value(this._value + n * this.options.step * this._stepMultiplier);
        } else {
            if (n > 0) {
                this.value(Math.min(
                    this._value + n * this.options.step * this._stepMultiplier,
                    this.options.max
                ));
            }
            else if (n < 0) {
                this.value(Math.max(
                    this._value + n * this.options.step * this._stepMultiplier,
                    this.options.min
                ));
            }
        }
        return this;
    },

    /**
     * Checks if the number can be a valid step, i.e. if the result of
     * adding it to the internal value would make it overflow.
     * @param {Number} n The step to test
     * @returns {Boolean} TRUE if valid, false otherwise
     */
    canStep : function(n)
    {
        return  this._value + n * this.options.step >= this.options.min &&
                this._value + n * this.options.step <= this.options.max;
    },

    up : function( recursive )
    {
        var inst = this;

        if ( this._timer ) {
            window.clearTimeout( this._timer );
        }

        if ( !recursive ) {
            this._startValue = this._value;
        }

        this.step(1);
        this._timer = setTimeout(function() {
            inst.up(true);
        }, recursive ? 50 : 500);
    },

    down : function( recursive )
    {
        var inst = this;

        if ( this._timer ) {
            window.clearTimeout( this._timer );
        }

        if ( !recursive ) {
            this._startValue = this._value;
        }

        this.step(-1);
        this._timer = setTimeout(function() {
            inst.down(true);
        }, recursive ? 50 : 500);
    },

    stop : function()
    {
        if ( this._timer ) {
            window.clearTimeout( this._timer );
        }
        if ( this._startValue !== this._value ) {
            this._startValue = this._value;
            this.input.trigger("change", [true]);
        }
        return this;
    },

    /**
     * Formats the given value for display. This method is called when a new
     * value is about to be written at the input and is expected to return
     * the formated string. Can be overriden for custom formatting behaviors.
     * @param {numeric} n The value to fomat
     * @returns {String} The formatted value
     */
    format : function(n)
    {
        n = utils.floatVal(n);
        return n === 0 ?
            "Use" :
            n.toFixed(this.options.roundPrecision);
    },

    /**
     * Make sure to keep this in sync with the format method
     */
    parse : function(x)
    {
        return utils.floatVal(x);
    },

    /**
     * Just a stub. This method is called when the internal value has changed.
     * Can be overriden to do some specific tasks.
     * @param x The new value that was set.
     */
    onChange : function() {}
});

// init ------------------------------------------------------------------------
$(document).on("customcontent", function(e) {
    $('input[type="number"]', e.target).each(function(i, o) {
        if (!$(o).data("StepInput")) {
            new StepInput(o);
        }
    });
});

},{"../utils.js":2}],4:[function(require,module,exports){
/**
 * This module encodes and decodes JSON objects so that they can be passed as
 * URL fragments. It serializes the data in a way that offers huge level of
 * compression (tipically 100% to 500%) but the price is that we loose any
 * flexibility. Most of the compression is achieved by converting the structure
 * to (nested) array. The keys of the objects are not used at all and the only
 * reason this can be decoded later is because the order is in fact hard-coded
 * here.
 */

/**
 * This is used to join the fragments at the first level (patient, medications
 * and play). This character will not be changed by encodeURIComponent so we can
 * save some extra bytes this way.
 */
var separator1 = "!";

/**
 * This is used to join the fragments at the first level which are arrays
 * (medications). This character will not be changed by encodeURIComponent so we
 * can save some extra bytes this way.
 */
var separator2 = "*";

/**
 * This is used to join the nested arrays (each med and the patent's properties).
 * This character will not be changed by encodeURIComponent so we can save some
 * extra bytes this way.
 */
var separator3 = "~";

/**
 * This is used to escape the special characters (!, ~, * and \ itself)
 */
var escapeChar = "\\";

//var p = CryptoJS.lib.WordArray.random(128/8).toString();
var p = "464c73e695b950d0085cf10db0f654bd";

/**
 * Converts it's argument to boolean. If the argument is a string, the following
 * are converted to false (case insensitive): "0", "false", "no"
 * @param {*}
 * @return {Boolean}
 */
function bool(x) {
    if (typeof x == "string") {
        x = x.toLowerCase();
        return x && x != "0" && x != "false" && x != "no";
    }
    return !!x;
}

/**
 * Escapes a string according to the settings above
 * @param {String} input The input string to escape
 * @return {String} The escaped string
 */
function escape(input) {
    var out = String(input);
    out = out.replace(escapeChar, escapeChar + escapeChar);
    out = out.replace(separator1, escapeChar + separator1);
    out = out.replace(separator2, escapeChar + separator2);
    out = out.replace(separator3, escapeChar + separator3);
    return out;
}

/**
 * Unescapes a string according to the settings above
 * @param {String} input The input string to unescape
 * @return {String} The unescaped string
 */
function unescape(input) {
    var out = String(input);
    out = out.replace(escapeChar + escapeChar, escapeChar);
    out = out.replace(escapeChar + separator1, separator1);
    out = out.replace(escapeChar + separator2, separator2);
    out = out.replace(escapeChar + separator3, separator3);
    return out;
}

function encode(data) {
    data = data || {};

    var out = [
        [
            escape(data.patient ? data.patient.mrn       : "0"       ),
            escape(data.patient ? data.patient.name      : "John Doe"),
            escape(data.patient ? data.patient.birthdate : "Unknown" )
        ].join(separator3),
        [],
        bool(data.play) ? 1 : 0
    ];

    // Represent meds as argiment arrays like so: [id, dosage, qty]
    _.each(data.medications || [], function(med) {
        out[1].push([
            escape(med.rxnorm),
            escape(med.dosage),
            escape(med.qty)
        ].join(separator3));
    });

    out[1] = out[1].join(separator2);
    out = out.join(separator1);
    out = CryptoJS.AES.encrypt(out, p).toString();

    return out;
}

function decode(str) {
    var out = {
        patient     : {},
        medications : [],
        play        : 0
    }, toks;

    str = CryptoJS.AES.decrypt(str, p).toString(CryptoJS.enc.Utf8);

    toks = str.split(separator1);
    toks[0] = toks[0].split(separator3);
    toks[1] = (toks[1] || "").split(separator2);

    out.patient.mrn       = unescape(toks[0][0]);
    out.patient.name      = unescape(toks[0][1]);
    out.patient.birthdate = unescape(toks[0][2]);

    _.each(toks[1], function(list) {
        var data = list.split(separator3);
        out.medications.push({
            rxnorm : unescape(data[0]),
            dosage : unescape(data[1]),
            qty    : parseFloat(unescape(data[2]))
        });
    });

    out.play = bool(toks[2]);

    return out;
}

module.exports = {
    escape   : escape,
    unescape : unescape,
    encode   : encode,
    decode   : decode
};

},{}],5:[function(require,module,exports){
module.exports = {
    "104112": "mesalamine 400 MG Enteric Coated Tablet [Asacol]",
    "104884": "Metoclopramide 1 MG/ML Oral Solution",
    "106256": "Triamcinolone 1 MG/ML Topical Cream",
    "106346": "Mupirocin 0.02 MG/MG Topical Ointment",
    "1167622": "EpiPen",
    "1169778": "Flomax 0.4 mg",
    "1169923": "ActoPlusMet 500/15mg",
    "150840": "Estrogens, Conjugated (USP) 0.625 MG Oral Tablet [Premarin]",
    "151124": "anastrozole 1 MG Oral Tablet [Arimidex]",
    "153357": "donepezil 10 MG Oral Tablet [Aricept]",
    "153591": "glimepiride 2 MG Oral Tablet [Amaryl]",
    "153666": "irbesartan 150 MG Oral Tablet [Avapro]",
    "153843": "glimepiride 1 MG Oral Tablet [Amaryl]",
    "153892": "montelukast 10 MG Oral Tablet [Singulair]",
    "197319": "Allopurinol 100mg",
    "197379": "Atenolol 100 MG Oral Tablet",
    "197381": "Atenolol 50 MG Oral Tablet",
    "197382": "Atenolol 100 MG / Chlorthalidone 25 MG Oral Tablet",
    "197449": "Cefaclor 500 MG Oral Capsule",
    "197528": "Clonazepam 1 MG Oral Tablet",
    "197574": "Desoximetasone 2.5 MG/ML Topical Cream",
    "197582": "Dexamethasone 4 MG Oral Tablet",
    "197589": "Diazepam 10 MG Oral Tablet",
    "197606": "Digoxin 0.25 MG Oral Tablet",
    "197633": "Doxycycline 100 MG Oral Tablet",
    "197745": "Guanfacine 1 MG Oral Tablet",
    "197770": "Hydrochlorothiazide 50 MG Oral Tablet",
    "197803": "Ibuprofen 20 MG/ML Oral Suspension",
    "197885": "Hydrochlorothiazide 12.5 MG / Lisinopril 10 MG Oral Tablet",
    "197901": "Lorazepam 1 MG Oral Tablet",
    "198014": "Naproxen 500 MG Oral Tablet",
    "198039": "Nitroglycerin 0.4 MG Sublingual Tablet",
    "198080": "Phenazopyridine 200 MG Oral Tablet",
    "198145": "Prednisone 10 MG Oral Tablet",
    "198191": "Ranitidine 150 MG Oral Tablet",
    "198211": "Simvastatin 40 MG Oral Tablet",
    "198240": "Tamoxifen 10 MG Oral Tablet",
    "198305": "Triamcinolone 0.25 MG/ML Topical Cream",
    "198342": "Urea 400 MG/ML Topical Cream",
    "198365": "Prochlorperazine 10 MG Oral Tablet",
    "198382": "famciclovir 500 MG Oral Tablet",
    "199026": "Doxycycline 100 MG Oral Capsule",
    "199246": "glimepiride 2 MG Oral Tablet",
    "199247": "glimepiride 4 MG Oral Tablet",
    "199381": "potassium citrate 10 MEQ Extended Release Tablet",
    "199903": "Hydrochlorothiazide 12.5 MG Oral Capsule",
    "200033": "carvedilol 25 MG Oral Tablet",
    "200329": "Omeprazole 40 MG Enteric Coated Capsule",
    "200345": "Simvastatin 80 MG Oral Tablet",
    "202301": "Estrogens, Conjugated (USP) 1.25 MG Oral Tablet [Premarin]",
    "204135": "Desonide 0.0005 MG/MG Topical Ointment",
    "206206": "lansoprazole 30 MG Enteric Coated Capsule [Prevacid]",
    "206475": "Thyroxine 0.088 MG Oral Tablet [Synthroid]",
    "206485": "Thyroxine 0.112 MG Oral Tablet [Levoxyl]",
    "206486": "Thyroxine 0.112 MG Oral Tablet [Synthroid]",
    "206533": "Thyroxine 0.2 MG Oral Tablet [Levothroid]",
    "206742": "Triiodothyronine 0.005 MG Oral Tablet [Cytomel]",
    "208149": "Sertraline 100 MG Oral Tablet [Zoloft]",
    "208406": "Sulfamethoxazole 40 MG/ML / Trimethoprim 8 MG/ML Oral Suspension [Sulfatrim]",
    "210596": "Cetirizine 10 MG Oral Tablet [Zyrtec]",
    "211307": "Azithromycin 20 MG/ML Oral Suspension [Zithromax]",
    "211816": "Levofloxacin 500 MG Oral Tablet [Levaquin]",
    "213169": "clopidogrel 75 MG Oral Tablet [Plavix]",
    "213186": "sibutramine 10 MG Oral Capsule [Meridia]",
    "213199": "Omnicef 300mg",
    "213271": "sildenafil 100 MG Oral Tablet [Viagra]",
    "213469": "celecoxib 200 MG Oral Capsule [Celebrex]",
    "215098": "Alesse",
    "218344": "Metrogel-Vaginal",
    "239191": "Amoxicillin 50 MG/ML Oral Suspension",
    "259543": "Clarithromycin 500 MG Extended Release Tablet",
    "259966": "Methylprednisolone 4 MG Oral Tablet",
    "260333": "Ramipril 10 MG Oral Capsule [Altace]",
    "261091": "cefdinir 25 MG/ML Oral Suspension [Omnicef]",
    "261339": "moxifloxacin 400 MG Oral Tablet [Avelox]",
    "261962": "Ramipril 10 MG Oral Capsule",
    "262095": "atorvastatin 80 MG Oral Tablet [Lipitor]",
    "283342": "Guaifenesin 600 MG / Phenylephrine 30 MG Extended Release Tablet [Crantex LA]",
    "284400": "pantoprazole 40 MG Enteric Coated Tablet [Protonix]",
    "284429": "24 HR Methylphenidate 18 MG Extended Release Tablet [Concerta]",
    "284497": "tazarotene 1 MG/ML Topical Cream [Tazorac]",
    "284544": "Benzoyl Peroxide 0.05 MG/MG / Clindamycin 0.01 MG/MG Topical Gel [Benzaclin]",
    "285004": "Etodolac 400 MG Extended Release Tablet",
    "285128": "bimatoprost 0.3 MG/ML Ophthalmic Solution [Lumigan]",
    "308047": "Alprazolam 0.25 MG Oral Tablet",
    "308189": "Amoxicillin 80 MG/ML Oral Suspension",
    "308194": "Amoxicillin 875 MG Oral Tablet",
    "308607": "benazepril 10 MG Oral Tablet",
    "309054": "cefdinir 25 MG/ML Oral Suspension",
    "309094": "Ceftriaxone 500mg",
    "309098": "Cefuroxime 500 MG Oral Tablet",
    "309114": "Cephalexin 500 MG Oral Capsule",
    "309309": "Ciprofloxacin 500 MG Oral Tablet",
    "309367": "Clotrimazole 10 MG/ML Topical Cream",
    "309428": "Codeine 2 MG/ML / Guaifenesin 20 MG/ML Oral Solution",
    "309438": "Codeine 2 MG/ML / Promethazine 1.25 MG/ML Oral Solution",
    "309462": "Acetaminophen 300 MG / Codeine 30 MG Oral Tablet",
    "309889": "Digoxin 0.25 MG Oral Tablet [Lanoxin]",
    "310149": "Erythromycin 0.005 MG/MG Ophthalmic Ointment",
    "310333": "fexofenadine 180 MG Oral Tablet",
    "310429": "Furosemide 20 MG Oral Tablet",
    "310489": "24 HR Glipizide 2.5 MG Extended Release Tablet",
    "310812": "Hydrochlorothiazide 25 MG / Triamterene 37.5 MG Oral Tablet",
    "310893": "Hydrocortisone 25 MG/ML / pramoxine 10 MG/ML Topical Cream",
    "310942": "Hydroxyzine 25 MG Oral Capsule",
    "311304": "Thyroxine 0.1 MG Oral Tablet [Synthroid]",
    "311353": "Lisinopril 2.5 MG Oral Tablet",
    "311354": "Lisinopril 5 MG Oral Tablet",
    "311470": "Meclizine 25 MG Oral Tablet",
    "311681": "Metronidazole 500 MG Oral Tablet",
    "311753": "mometasone furoate 1 MG/ML Topical Cream",
    "311945": "Niacin 1000 MG Extended Release Tablet [Niaspan]",
    "311946": "Niacin 500 MG Extended Release Tablet [Niaspan]",
    "311992": "Nitrofurantoin 100 MG Oral Capsule",
    "312055": "Nystatin 100000 UNT/ML Oral Suspension",
    "312289": "Naloxone 0.5 MG / Pentazocine 50 MG Oral Tablet",
    "312320": "Permethrin 10 MG/ML Topical Lotion",
    "312504": "Potassium Chloride 10 MEQ Extended Release Capsule",
    "312615": "Prednisone 20 MG Oral Tablet",
    "312664": "Promethazine 25 MG Oral Tablet",
    "312938": "Sertraline 100 MG Oral Tablet",
    "312961": "Simvastatin 20 MG Oral Tablet",
    "313219": "Terazosin 5mg",
    "313586": "venlafaxine 75 MG Oral Tablet",
    "313797": "Amoxicillin 25 MG/ML Oral Suspension",
    "313850": "Amoxicillin 40 MG/ML Oral Suspension",
    "313960": "Diphenhydramine 2.5 MG/ML Oral Solution [Diphen]",
    "314062": "Triiodothyronine 0.005 MG Oral Tablet",
    "314076": "Lisinopril 10 MG Oral Tablet",
    "314077": "Lisinopril 20 MG Oral Tablet",
    "314106": "Metronidazole 250 MG Oral Tablet",
    "314200": "pantoprazole 40 MG Enteric Coated Tablet",
    "316133": "Leflunomide 10 MILLIGRAM In 1 TABLET ORAL TABLET, FILM COATED",
    "316153": "lisinopril 20mg",
    "317797": "Thyroxine 0.088 MG Oral Tablet",
    "323925": "Ferrous gluconate 325mg",
    "329066": "Amoxicillin 875mg",
    "351396": "Hydrocortisone 25 MG/ML Rectal Cream [Proctozone HC]",
    "351761": "valsartan 80 MG Oral Tablet [Diovan]",
    "352027": "carbinoxamine 1 MG/ML / Dextromethorphan 4 MG/ML / Pseudoephedrine 15 MG/ML Oral Solution [Carbofed DM Drops]",
    "352063": "valdecoxib 20 MG Oral Tablet [Bextra]",
    "352272": "Escitalopram 10 MG Oral Tablet [Lexapro]",
    "352304": "ezetimibe 10 MG Oral Tablet [Zetia]",
    "352318": "atomoxetine 18 MG Oral Capsule [Strattera]",
    "352319": "atomoxetine 25 MG Oral Capsule [Strattera]",
    "353534": "Ventolin HFA",
    "381056": "Isosorbide Dinitrate 10 MG Oral Tablet",
    "402097": "Cialis 20mg",
    "403917": "24 HR Bupropion 150 MG Extended Release Tablet",
    "404473": "moxifloxacin 5 MG/ML Ophthalmic Solution [Vigamox]",
    "404630": "Ciprofloxacin 3 MG/ML / Dexamethasone 1 MG/ML Otic Suspension [Ciprodex]",
    "404673": "Memantine 10 MG Oral Tablet [Namenda]",
    "539712": "Macrobid 100mg",
    "543354": "ezetimibe 10 MG / Simvastatin 40 MG Oral Tablet [Vytorin]",
    "562508": "Amoxicillin 875 MG / Clavulanate 125 MG Oral Tablet",
    "565167": "Diovan 160mg",
    "565420": "Singulair 10mg",
    "572018": "Metrocream 0.75%",
    "580261": "tiotropium 0.018 MG/ACTUAT Inhalant Powder [Spiriva]",
    "582620": "Nizatidine 15 MG/ML Oral Solution [Axid]",
    "597966": "Atorvastatin 20mg",
    "597983": "Atorvastatin 40mg",
    "615186": "duloxetine 60 MG Enteric Coated Capsule [Cymbalta]",
    "617264": "Alendronate 70 MG Oral Tablet",
    "617318": "atorvastatin 20 MG Oral Tablet [Lipitor]",
    "617423": "Amoxicillin 40 MG/ML / Clavulanate 5.7 MG/ML Oral Suspension",
    "617993": "Amoxicillin 120 MG/ML / clavulanate potassium 8.58 MG/ML Oral Suspension",
    "630208": "Albuterol 0.83 MG/ML Inhalant Solution",
    "637189": "Chantix 1mg",
    "686924": "carvedilol 3.13 MG Oral Tablet",
    "729929": "24 HR venlafaxine 75 MG Extended Release Capsule [Effexor]",
    "745679": "200 ACTUAT Albuterol 0.09 MG/ACTUAT Metered Dose Inhaler",
    "745752": "200 ACTUAT Albuterol 0.09 MG/ACTUAT Metered Dose Inhaler [ProAir HFA]",
    "745813": "120 ACTUAT Budesonide 0.08 MG/ACTUAT / formoterol 0.0045 MG/ACTUAT Metered Dose Inhaler [Symbicort 80/4.5]",
    "746201": "120 ACTUAT mometasone furoate 0.05 MG/ACTUAT Nasal Inhaler [Nasonex]",
    "746735": "Advair discus 250/50",
    "748857": "Yasmin 28 Day Pack",
    "750244": "Low-Ogestrel 28 Day Pack",
    "752370": "120 ACTUAT Triamcinolone 0.055 MG/ACTUAT Nasal Inhaler [Nasacort]",
    "753482": "Apri 28 Day Pack",
    "755272": "Ranitidine 15 MG/ML Oral Solution [Zantac]",
    "762675": "Methylprednisolone 4 MG Oral Tablet",
    "790840": "24 HR Nisoldipine 8.5 MG Extended Release Tablet [Sular]",
    "795735": "Chantix Continuing Months Of Therapy Pack",
    "795737": "Chantix First Month of Therapy Pack",
    "801663": "vitamin D3 2000 iu",
    "812178": "multivitamin ",
    "823934": "Hydrochlorothiazide 12.5 MG / irbesartan 150 MG Oral Tablet [Avalide 150/12.5]",
    "824191": "Augmentin 875mg",
    "828348": "Cyclobenzaprine hydrochloride 10 MG Oral Tablet",
    "828576": "Acetaminophen 650 MG / propoxyphene napsylate 100 MG Oral Tablet",
    "834102": "Penicillin V Potassium 500 MG Oral Tablet",
    "834127": "chlorhexidine gluconate 1.2 MG/ML Mouthwash",
    "845660": "24 HR Bupropion 150 MG Extended Release Tablet [Budeprion]",
    "854873": "zolpidem 10 MG Oral Tablet",
    "855334": "Warfarin 5 MG Oral Tablet [Coumadin]",
    "855918": "Diclofenac 75 MG / Misoprostol 0.2 MG Enteric Coated Tablet [Arthrotec 75/200]",
    "856377": "Trazodone 50 MG Oral Tablet",
    "856903": "Acetaminophen 500 MG / Hydrocodone 5 MG Oral Tablet",
    "858869": "carbinoxamine 0.4 MG/ML / Hydrocodone 1 MG/ML / Pseudoephedrine 6 MG/ML Oral Solution [Histex HC]",
    "859046": "Pramipexole 0.5 MG Oral Tablet [Mirapex]",
    "859088": "200 ACTUAT Albuterol 0.09 MG/ACTUAT Metered Dose Inhaler [Ventolin HFA]",
    "859258": "Chlorpheniramine 1.6 MG/ML / Hydrocodone 2 MG/ML Extended Release Suspension [Tussionex PennKinetic]",
    "859749": "rosuvastatin 10 MG Oral Tablet [Crestor]",
    "859753": "rosuvastatin 20 MG Oral Tablet [Crestor]",
    "860975": "Metformin XR 500mg",
    "860981": "Metformin 750 MG Extended Release Tablet",
    "861007": "Metformin 500 MG Oral Tablet",
    "861771": "Metformin 1000 MG / sitagliptin 50 MG Oral Tablet [Janumet 50/1000]",
    "866427": "Metoprolol 25 MG Extended Release Tablet",
    "866429": "24 HR Metoprolol 25 MG Extended Release Tablet [Toprol-XL]",
    "866511": "Metoprolol 100 MG Oral Tablet",
    "866514": "Metoprolol 50 MG Oral Tablet",
    "866924": "Metoprolol 25 MG Oral Tablet",
    "877300": "{4 (Risedronate 35 MG Oral Tablet [Actonel]) } Pack [Actonel 35]",
    "966158": "Synthroid 25mcg",
    "966171": "Synthroid 75mcg",
    "966247": "Synthroid 50mcg",
    "997489": "Allegra"
};

},{}]},{},[1]);
