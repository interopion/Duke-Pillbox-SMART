/* global $, App, _ */
/**
 * Returns the float representation of the first argument or the
 * "defaultValue" if the float conversion is not possible.
 * @param {*} x The argument to convert
 * @param {*} defaultValue The fall-back return value. This is going to be
 *                         converted to float too.
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
 * Returns the int representation of the first argument or the
 * "defaultValue" if the int conversion is not possible.
 * @param {*} x The argument to convert
 * @param {*} defaultValue The fall-back return value. This is going to be
 *                         converted to integer too.
 * @return {Number} The resulting integer.
 */
function intVal( x, defaultValue ) {
    var out = parseInt(x, 10);
    if ( isNaN(out) || !isFinite(out) ) {
        out = defaultValue === undefined ? 0 : intVal( defaultValue );
    }
    return out;
}

function uInt( x, defaultValue ) {
    return Math.max(
        intVal( x, defaultValue ),
        0
    );
}

function uFloat( x, defaultValue ) {
    return Math.max(
        floatVal( x, defaultValue ),
        0
    );
}

function bool(x) {
    if (typeof x == "string") {
        x = x.toLowerCase();
        return x && x != "0" && x != "false" && x != "no";
    }
    return !!x;
}

/**
 * Set (create or update) a cookie.
 * @param {String} name The name of the cookie
 * @param {*} value The value of the cookie
 * @param {Number} days (optional) The cookie lifetime in days. If omitted the
 *                                 cookie is a session cookie.
 * @return {void}
 */
function setCookie( name, value, days ) {
    if ( String(name).indexOf(";") > -1 ) {
        throw "The cookie name cannot contain ';'";
    }
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toGMTString();
    }
    document.cookie = name + "=" + value + expires + "; path=/";
}

/**
 * Reads a cookie identified by it's name.
 * @param {String} name The name of the cookie
 * @return {String|null} The value of the cookie or null on failure
 */
function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1,c.length);
        }
        if (c.indexOf(nameEQ) === 0) {
            return c.substring(nameEQ.length,c.length);
        }
    }
    return null;
}

/**
 * Erases a cookie by setting it's expiration date in the past.
 * @param {String} name The name of the cookie
 * @return {void}
 */
function deleteCookie(name) {
    setCookie(name, "", -1);
}

function jPath(obj, path, value) {

    var cur = obj,

        /**
         * If this function has been called to set, get or delete a property
         * @type {String}
         */
        mode = arguments.length == 2 ? "get" : value === undefined ? "delete" : "set",

        /**
         * The RegExp used to parse the paths
         * @type {RegExp}
         */
        reg = new RegExp("\\[['\"]?([^\\]]+)['\"]?\\]", "g"),

        /**
         * The path exploded to segments
         * @type {Array}
         */
        segments = path.replace(reg, ".$1").split("."),

        /**
         * The length of the path segments
         * @type {Number}
         */
        l = segments.length,

        /**
         * The path that we are currently in as an array of path segments.
         * @type {Array}
         */
        curPath = [],

        name, i;

    for ( i = 0; i < l; i++ ) {

        curPath[i] = name = segments[i];

        if (cur instanceof Array) {
            name = parseInt(name, 10);
        }

        if ( i == l - 1 ) { // last
            if (mode == "get") {
                return cur[name];
            }

            if (mode == "delete") {
                delete cur[name];
                return;
            }

            cur[name] = value;
            return;
        }

        //if (!cur) {
        //    if (mode == "set") {
        //        cur = {};
        //    } else {
        //        return;
        //    }
        //}

        cur = cur[name];
    }
}

function errback(cb) {
    return function(err) {
        if (err) {
            console.error(err);
        } else {
            if (_.isFunction(cb)) {
                cb.apply(this, arguments);
            }
        }
    };
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
            skipEmpty : false,
            abbr      : false,
            round     : 8,
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
                n + " " + App.localizator.str(
                    "time." + f.unit + (cfg.abbr ? "_abbr" : "") + (n === 1 ? "" : "_plural")
                )
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
            " " + App.localizator.str("time.join_and") + " " :
            ""
    ) + last;
}

function getAjaxError(jqxhr, textStatus, thrownError) {
    var out = [];
    if (jqxhr.status) {
        out.push(jqxhr.status);
        if (jqxhr.responseJSON) {
            out.push(
                jqxhr.responseJSON.message ||
                jqxhr.responseJSON.code ||
                jqxhr.statusText ||
                "Server Error"
            );
        } else {
            out.push(thrownError || "Server Error");
        }
    }
    else {
        out.push("Connection failure");
    }
    return out.join(" ");
}

function modal(selector) {

    $("body.modal-open .modal").trigger("close").hide();
    $("body").removeClass("modal-open");

    if (selector == "close") {
        return;
    }

    var $el = $(selector).css("height", "100%").css({
        visibility: "hidden",
        display   : "block",
        width     : "100%",
        height    : "auto",
        maxWidth  : 760//, //ww * 0.8,
        //maxHeight : "80%"//wh * 0.8
    });

    var w = $el.outerWidth(),
        h = $el.outerHeight();
    $el.css({
        top       : "50%",
        left      : "50%",
        width     : w,
        height    : h,
        marginLeft: -w/2,
        marginTop : -h/2,
        visibility: "visible"
    });

    $("body").addClass("modal-open");
}

function Queue() {
    var tasks = [],
        isRunning;

    function run() {
        if (tasks.length) {
            if (!isRunning) {
                isRunning = true;
                tasks.shift()(function(err) {
                    if (err) {
                        console.error(err);
                    }
                    isRunning = false;
                    run();
                });
            }
        } else {
            isRunning = false;
        }
    }

    function add() {
        tasks.push.apply(tasks, arguments);
        run();
    }

    return {
        add : add,
        clear : function() {
            tasks = [];
        }
    };
}

/**
 * Parses the input @str as query string and returns the get parameters
 * as object.
 * @param {String} str The input string. If it contains "?" - it will be removed
 * along with enything before it.
 * @param {Boolean} decode Pass false (exactly) to skip the decoding of keys and
 * values using decodeURIComponent.
 * @return {Object} The GET parameters in key/value pairs
 */
function parseQueryString(str, decode) {
    var out = {}, tokens, len, pair, key, value, i;

    str = String(str).replace(/.*?\?/, "");

    if (str.length) {
        tokens = str.split("&");
        len    = tokens.length;

        for (i = 0; i < len; i++) {
            pair  = tokens[i].split("=");
            key   = pair.shift();
            value = pair.join("");
            if (decode !== false) {
                key   = decodeURIComponent(key);
                value = decodeURIComponent(value);
            }

            out[key] = out.hasOwnProperty(key) ?
                [].concat(out[key], value) :
                value;
        }
    }

    return out;
}

function getConfig(path, cb) {
    $.ajax({
        url      : path,
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

exports.intVal           = intVal;
exports.uInt             = uInt;
exports.floatVal         = floatVal;
exports.uFloat           = uFloat;
exports.setCookie        = setCookie;
exports.getCookie        = getCookie;
exports.deleteCookie     = deleteCookie;
exports.jPath            = jPath;
exports.errback          = errback;
exports.modal            = modal;
exports.formatTime       = formatTime;
exports.getAjaxError     = getAjaxError;
exports.Queue            = Queue;
exports.parseQueryString = parseQueryString;
exports.bool             = bool;
exports.getConfig        = getConfig;
exports.ucFirst          = ucFirst;
