var utils = require("./utils.js");

/**
 * Localization system
 *
 * USAGE:
 *
 * 1. Define some locales like this:
 * createLocale({ language : "English"  , langAbbr : "en" });
 * createLocale({ language : "Bulgarian", langAbbr : "bg" });
 *
 * 2. Define some string translations like this:
 * localizations = {
 *    STR_SHORT_TERM_VIEW_1  : {
 *        en : "Short Term View",
 *        bg : "Последни данни"
 *    },
 *    STR_LAST_THREE_BP_DAYS_2 : {
 *        en : "Shows the last three BP measurements",
 *        bg : "Последните три дни с измервания на кръвното налягане"
 *    },
 *    ...
 * };
 *
 * 3. To make the innerHTML of an element translatable use attr like:
 * data-translatecontent="STR_SHORT_TERM_VIEW_1"
 *
 * 4. To make the value of an attribute translatable use attr like:
 * data-translateattr="title=STR_LAST_THREE_BP_DAYS_2"
 *
 * 5. To set the defaul (initial) locale set it's abbr as the value of the lang
 * attribute of the HTML tag like so:
 * <html lang="en"> or <html lang="bg">
 *
 * 6. To have a language selectors automatically generated for you, just provide
 * empty container for them having the CSS class "language-selector". You can
 * also define your custom styles for them like:
 * .language-selector { ... }
 * .language-selector span { ...The label styles... }
 * .language-selector select { ...The select itself... }
 */

/**
 * Contains the actual translations (will be augmented later)
 */
var localizations = {};

/**
 * Contains the locale objects - one for each supported language.
 */
var locales = {};

/**
 * The factory for locale objects. Creates one and registers it at
 * locales using it's "langAbbr" as an unique key.
 */
function createLocale(options) {
    var out = $.extend(true, {}, {

        /**
         * The name of the language to use. This will be displayed at the
         * language selection UI controls and is ALWAYS in english.
         * @type {String}
         */
        language : null,

        /**
         * The language abbreviation. This is a short string that can be
         * used to identify the language (used internaly as key to store the
         * translated strings). If not provided, it will be set to the first
         * three letters of the @language setting (lowercased).
         * @type {String}
         */
        langAbbr : null,

        /**
         * The writing dirrection of the language. Can be "ltr" or "rtl".
         * Defaults to "ltr".
         * @type {String}
         */
        dir : "ltr",

        /**
         * If we search for some string that has no translation defined for
         * the desired language, it can fail-back to the same string from the
         * language identified by this abbr.
         * @type {String}
         */
        failback : "en-US",

        /**
         * Set this to false to disable the locale. That will hide it from
         * the UI making it unreachable.
         * @type {Boolean}
         */
        enabled  : true,
        // TODO: more options here (dates, units etc.)?

        nativeName : null

    }, options);

    // Currently "language" is the only required property so make sure to
    // validate it
    out.language = $.trim(String(out.language || ""));
    if (!out.language) {
        throw new Error("Please define locale.language");
    }

    if (!out.nativeName) {
        out.nativeName = out.language;
    }

    // Create "langAbbr" in case it is missing
    if (!out.langAbbr) {
        out.langAbbr = out.language.toLowerCase().substr(0, 3);
    }

    // Prevent failback recursion
    if ( out.failback == out.langAbbr ) {
        out.failback = null;
    }

    // Register self
    locales[out.langAbbr] = out;

    // return the resulting object
    return out;
}

/**
 * Sets the current language. Writes the change to the "lang" cookie and
 * updates the "lang" attribute of the HTML element. Finally, it also
 * triggers a "set:language" event to notify the interested parties.
 * @return {void}
 */
function setLanguage(lang) {
    utils.setCookie("lang", lang, 365);
    $("html").attr("lang", lang).trigger("set:language", [lang]);
}

/**
 * Return the abbreveation of the current language by trying various strategies.
 * 1. First try to read it from a "lang" cookie (if the user has previously
 *    choosen a language).
 * 2. Then try the navigator.laguage property
 * 3. Then try the "lang" attribute of the HTML element
 * 4. Finally failback to "en"
 * @return {String}
 */
function getLanguage() {
    var lang = String(
        utils.getCookie("lang") ||
        $("html").attr("lang") ||
        navigator.language     ||
        "en-US"
    ).replace(/^(.*?)-(.*)/, function(all, a, b) {
        return a.toLowerCase() + "-" + b.toUpperCase();
    });

    if (locales[lang]) {
        if (!locales[lang].enabled) {
            lang = "en-US";
            setLanguage(lang);
        }
        return lang;
    }

    return "en-US";
}

/**
 * Returns the translated value of the @key for the given language @lang
 * or the current language. If called with three arguments, writes the
 * @value at @key and returns the written value.
 */
function str( key, lang, value ) {
    var o, locale, arglen = arguments.length;

    key = String(key);

    // "LANGUAGE" is a special key that should return the name of the
    // language as defined in locales
    if (key == "LANGUAGE") {
        return locales[getLanguage()].language;
    }

    // Support for string namespacing - the key can be a JS path (using the
    // dot syntax)
    if (key.indexOf(".") > 0) {
        o = utils.jPath(localizations, key);
    } else {
        o = localizations[key];
    }

    if (o === undefined) {
        return "Missing string '" + key + "'";
    }

    lang = lang || getLanguage();

    locale = locales[lang];

    if ( !locale ) {
        return "Missing locale for '" + lang + "'";
    }

    if ( !o[lang] && arglen < 3 ) {
        if (locale.failback) {
            return str(key, locale.failback);
        }
        return "Missing translation for '" + key + "' / '" + lang + "'";
    }

    if (arglen > 2) {
        utils.jPath(o, lang, value);
    }

    return o[lang];
}

/**
 * Gets the list of enabled locales. This is used to generate language
 * selectors (disabled locales should not be available there).
 * @return {Array}
 */
function getEnabledLocales() {
    var len = 0, enabledLocales = [];
    $.each(locales, function(i, locale) {
        if (locale.enabled) {
            enabledLocales[len++] = locale;
        }
    });
    return enabledLocales;
}

/**
 * Translates the given input splitting it by ",". This allows for
 * concatenating multiple translations and plain strings.
 * @TODO: Allow backslash escaped commas
 */
function translate(input, lang) {
    var def = input.split(","),
        len = def.length,
        out = [], i, s;

    for (i = 0; i < len; i++) {
        s = def[i];
        out.push(s.indexOf(".") > 0 ? str($.trim(s), lang) : s);
    }

    return out.join("");
}

/**
 * Replaces the innerHTML of an element by the translated version of it's
 * "data-translatecontent" attribute. Note that this function is designed as
 * an event handler so "this" refers to the element that should be translated
 * and it is assumed that that element has "data-translatecontent" attribute.
 * @return {void}
 */
function translateInnerHTML() {
    $(this).html(
        translate(this.getAttribute("data-translatecontent"))
    );
}

/**
 * Creates (or updates) an attribute of an element. Note that this function
 * is designed as an event handler so "this" refers to the element that
 * should be translated and it is assumed that that element has
 * "data-translateattr" attribute.
 * @return {void}
 */
function translateAttribute() {
    var src = this.getAttribute("data-translateattr"),
        pos = src.indexOf("="),
        attrName, attrValue;
    if (pos > -1) {
        attrName  = $.trim(src.substr(0, pos));
        attrValue = $.trim(src.substr(pos + 1));
        if (attrName && attrValue) {
            attrValue = translate(attrValue);
            $(this).attr(attrName, attrValue);
        }
    }
}

/**
 * Translates everything inside the @context node or the entire document
 * if no context is provided
 */
function translateHTML(context) {
    $('[data-translatecontent]',context||document).each(translateInnerHTML);
    $('[data-translateattr]'   ,context||document).each(translateAttribute);
}

function createLanguageSelectors() {
    var enabledLocales = getEnabledLocales(),
        cur = getLanguage();

    $(".language-selector").each(function(i, o) {
        $(o).empty();


        // Display the one or more than two languages as select
        var html = '<select name="language" class="language-select">';
        $.each(enabledLocales, function(i, locale) {
            html += '<option value="' + locale.langAbbr + '">' +
                locale.nativeName +
                '</option>';
        });
        html += '</select>';

        $(o).append('<span data-translatecontent="common.language,:" style="text-transform:capitalize">Language </span>').append(
            $(html).val(cur).change(function() {
                setLanguage($(this).val());
            })
        );
    });
}

function localize(langs, translations) {

    $.each(langs || {}, function(i, lang) {
        createLocale(lang);
    });

    $.extend(true, localizations, translations);

    $(function() {
        createLanguageSelectors();
        $("html").bind("set:language", function(e, lang) {
            $(".language-selector select").val(lang);
            translateHTML(e.target.parentNode || e.target);
        });
        setLanguage(getLanguage());

        $(document).on("customcontent", function(e) {
            translateHTML(e.target.parentNode || e.target);
        });
    });

    return {
        translateHTML           : translateHTML,
        localizations           : localizations,
        locales                 : locales,
        createLocale            : createLocale,
        getLanguage             : getLanguage,
        setLanguage             : setLanguage,
        str                     : str,
        getEnabledLocales       : getEnabledLocales,
        createLanguageSelectors : createLanguageSelectors
    };
}

module.exports = {
    translateHTML           : translateHTML,
    localizations           : localizations,
    locales                 : locales,
    createLocale            : createLocale,
    getLanguage             : getLanguage,
    setLanguage             : setLanguage,
    str                     : str,
    getEnabledLocales       : getEnabledLocales,
    createLanguageSelectors : createLanguageSelectors,
    localize                : localize
};
