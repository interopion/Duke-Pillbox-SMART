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
