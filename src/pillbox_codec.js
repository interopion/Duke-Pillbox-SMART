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
