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
