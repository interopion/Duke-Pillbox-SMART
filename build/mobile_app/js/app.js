(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

// Inspired by John Resig's Simple JavaScript Inheritance
module.exports = (function(){
    var initializing = false,
        fnTest = /xyz/.test(function(){ return "xyz";}) ? /\b_super\b/ : /.*/;

    // The base Class implementation (does nothing)
    var Class = function(){};

    // Create a new Class that inherits from this class
    Class.extend = function(prop) {
        var _super = this.prototype;

        // Instantiate a base class (but only create the instance,
        // don't run the init constructor)
        initializing = true;
        var prototype = new this();
        initializing = false;

        function method(name, fn) {
            return function() {
                var tmp = this._super;

                // Add a new ._super() method that is the same method
                // but on the super-class
                this._super = _super[name];

                // The method only need to be bound temporarily, so we
                // remove it when we're done executing
                var ret = fn.apply(this, arguments);
                this._super = tmp;

                return ret;
            };
        }

        // Copy the properties over onto the new prototype
        for (var name in prop) {
            // Check if we're overwriting an existing function
            prototype[name] = typeof prop[name] == "function" &&
            typeof _super[name] == "function" && fnTest.test(prop[name]) ?
                method(name, prop[name]) :
                prop[name];
        }

        // The dummy class constructor
        function Class() {
            // All construction is actually done in the initialize method
            if ( !initializing && this.initialize ) {
                this.initialize.apply(this, arguments);
            }
        }

        // Populate our constructed prototype object
        Class.prototype = prototype;

        // Enforce the constructor to be what we expect
        Class.prototype.constructor = Class;

        // And make this class extendable
        Class.extend = arguments.callee;

        return Class;
    };

    return Class;
})();

},{}],2:[function(require,module,exports){
var Class = require("./Class.js");
var Command = Class.extend(_.extend(Backbone.Events, {
    id : null,
    execute : function(params, cb) {
        cb(new Error("execute not implemented for " + this.id));
    },
    undo : function(params, cb) {
        cb(new Error("undo not implemented for " + this.id));
    },
    toJSON : function() {
        return [ this.id ];
    }
}));

module.exports = Command;

},{"./Class.js":1}],3:[function(require,module,exports){
var Command = require("../Command.js");

module.exports = Command.extend({
    id : "check",

    /**
     * @param {Function} cb Error-first callback
     */
    execute : function(cb) {
        App.check();
        setTimeout(cb, App.config.playbackSpeed);
    },

    /**
     * @param {Function} cb Error-first callback
     */
    undo : function(cb) {
        App.uncheck();
        setTimeout(cb, App.config.playbackSpeed);
    }
});

},{"../Command.js":2}],4:[function(require,module,exports){
var Command = require("../Command.js");


module.exports = Command.extend({
    id : "clear",

    /**
     * @param {Function} cb Error-first callback
     */
    execute : function(cb) {
        this.lastState = App.getState();
        App.setState({});
        setTimeout(cb, App.config.playbackSpeed);
    },

    /**
     * @param {Function} cb Error-first callback
     */
    undo : function(cb) {
        if (this.lastState) {
            App.setState(this.lastState);
            this.lastState = null;
        }
        setTimeout(cb, App.config.playbackSpeed);
    }
});

},{"../Command.js":2}],5:[function(require,module,exports){
var Command = require("../Command.js");

module.exports = Command.extend({
    id : "help",

    toggle : function() {
        App.utils.modal($("body").is("modal-open") ? "close" : ".modal.help");
    },

    /**
     * @param {Function} cb Error-first callback
     */
    execute : function(cb) {
        this.toggle();
        setTimeout(cb, App.config.playbackSpeed);
    },

    /**
     * @param {Function} cb Error-first callback
     */
    undo : function(cb) {
        this.toggle();
        setTimeout(cb, App.config.playbackSpeed);
    }
});

},{"../Command.js":2}],6:[function(require,module,exports){
var Command = require("../Command.js");
var MedView = require("../views/MedView.js");

function getContainerForCollection(collection) {
    if (collection === App.collections.AllMeds) {
        return App.views.MedsList.$el;
    }
    if (collection === App.collections.MorningMeds) {
        return App.views.moorningView.$el;
    }
    if (collection === App.collections.NoonMeds) {
        return App.views.noonView.$el;
    }
    if (collection === App.collections.EveningMeds) {
        return App.views.eveningView.$el;
    }
    if (collection === App.collections.BedtimeMeds) {
        return App.views.fourXView.$el;
    }
    if (collection === App.collections.WeeklyMeds) {
        return App.views.weeklyView.$el;
    }
    if (collection === App.collections.DeletedMeds) {
        return App.views.TrashView.$el;
    }
    if (collection === App.collections.AsNeededMeds) {
        return App.views.AsNeededMeds.$el;
    }
}

function moveMed(model, targetCollection, cmd, cb) {

    var sourceCollection = model.collection;
    // if (!sourceCollection) {
    //     return cb(new Error("Model not part of collection"));
    // }

    if (sourceCollection === targetCollection) {
        return cb(new Error("Moving model to it's current collection"));
    }

    // First find the original view element
    var sourceElement = $('[data-model-cid="' + model.cid + '"]');
    if (!sourceElement.length) {
        sourceElement = sourceCollection === App.collections.DeletedMeds ?
            $('.pillbox-trash [data-rxnorm="' + model.get("rxnorm") + '"]'):
            $('.pillbox-meds-list [data-rxnorm="' + model.get("rxnorm") + '"]');
    }
    if (!sourceElement.length) {
        return cb(new Error("sourceElement not found"));
    }

    // find the target container
    var container = getContainerForCollection(targetCollection);
    if (!container || !container.length) {
        return cb(new Error("container not found"));
    }

    // Create the proxy
    var proxy = sourceElement.clone().addClass("animation-proxy");

    sourceElement.scrollIntoView(200, function() {

        // Now create an invisible helper element
        var helper = new MedView({ model : model }).render().$el;

        // make sure the helper is invisible (but measurable)
        helper.addClass("animation-proxy").css({
            "visibility" : "hidden"
        }).appendTo(container);

        proxy.css({
            width    : sourceElement.outerWidth(),
            height   : sourceElement.outerHeight(),
            position : "fixed",
            zIndex   : 100,
            top      : sourceElement.offset().top,
            left     : sourceElement.offset().left,
            opacity  : 0.7,
            margin   : 0,
            overflow : "hidden",
            whiteSpace: "nowrap",
            //"boxSizing" : "border-box",
            //display : "inline-block"
        }).appendTo("body");

        helper.scrollIntoView(200, function() {

            proxy.css("transition", "all 0.4s ease-in-out");

            setTimeout(function() {
                // measure the target coordinates
                var x = helper.offset().left;
                var y = helper.offset().top;
                var w = helper.outerWidth();
                var h = helper.outerHeight();
                var o = 1;

                // If the med will be moved to the all meds list or to the
                // recycle bin, then find the absolute center of the container
                // instead of appending to it
                if (targetCollection == App.collections.AllMeds ||
                    targetCollection == App.collections.DeletedMeds)
                {
                    x = container.offset().left + 5;// + container.width()/2;
                    y = container.offset().top + container.height()/2 - 20;// + container.height()/2;
                    w = container.width() - 20;
                    //h = container.height();
                    //x -= w/2;
                    //y -= h/2;
                    //proxy.css()
                    o = 0;
                }

                //var _x = 0,//sourceElement.offset().left + sourceElement.scrollLeft(),
                //    _y = proxy.offset().top;// + sourceElement.scrollTop();
                proxy.css({
                    transform : "translate(" +
                        (x - proxy.offset().left) + "px, " +
                        (y - proxy.offset().top ) + "px)",
                    width     : w,
                    height    : h,
                    opacity   : o
                });
                setTimeout(function() {
                    if (sourceCollection) {
                        sourceCollection.remove(model);
                    }
                    if (targetCollection !== App.collections.AllMeds) {
                        targetCollection.add(model);
                    }
                    helper.remove();
                    proxy.remove();
                    cb();
                }, App.config.playbackSpeed + 20);
            }, 20);
        });
    });
}

$.fn.scrollParent = function() {
    var node = this[0], overflow;
    while (node && node.tagName) {
        overflow = $(node).css("overflow");
        if (overflow == "auto" || overflow == "scroll") {
            return $(node);
        }
        node = node.parentNode;
    }
    return null;
};

$.fn.scrollIntoView = function(duration, complete) {
    return this.each(function(i, o) {
        var $el = $(o),
            scrollParent = o,
            scrollTop = 0,
            node = o,
            clientHeight,
            height,
            top = 0,
            overflow;

        while (node && node.tagName) {
            overflow = $(node).css("overflow");
            if (overflow == "auto" || overflow == "scroll") {
                scrollParent = node;
                break;
            }

            node = node.parentNode;
        }

        node = o;
        while (node && node !== scrollParent) {
            top += node.offsetTop;
            node = node.offsetParent;
        }

        var mTop = parseFloat($el.css("marginTop"));

        //console.log(scrollParent, overflow);

        if (scrollParent !== o) {
            scrollTop    = scrollParent.scrollTop;
            clientHeight = scrollParent.clientHeight;
            height       = $el.outerHeight(true);

            if (top + height - scrollTop > clientHeight) {
                return $(scrollParent).stop(1, 1).animate({ scrollTop: top + height + mTop - (clientHeight-50) }, {
                    duration : duration || "normal",
                    complete : complete || $.noop
                });
            }

            if (top < scrollTop) {
                return $(scrollParent).stop(1, 1).animate({ scrollTop: top - (mTop+50) }, {
                    duration : duration || "normal",
                    complete : complete || $.noop
                });
            }
        }

        return $({x:0}).animate({x:100}, {
            duration : duration || "normal",
            complete : complete || $.noop
        });
    });
};

module.exports = Command.extend({
    id : "moveMedicine",

    /**
     * @param {Object} params
     * @param {Backbone.Model} params.model The model to be moved
     * @param {Backbone.Collection} params.target The collection that the model
     * should be moved to
     */
    initialize : function(params)
    {
        if (!params || typeof params != "object") {
            throw new Error("Params object is required");
        }

        if (!params.sourceCollectionID || !App.collections[params.sourceCollectionID]) {
            throw new Error("Invalid or missing sourceCollectionID parameter");
        }

        if (!params.targetCollectionID || !App.collections[params.targetCollectionID]) {
            throw new Error("Invalid or missing targetCollectionID parameter");
        }

        if (!params.sourceModelIndex && params.sourceModelIndex !== 0) {
            throw new Error("Invalid or missing sourceModelIndex parameter");
        }

        //var model = App.collections[params.sourceCollectionID].at(params.sourceModelIndex);
        //if (!model) {
        //    throw new Error("Invalid sourceModelIndex parameter");
        //}

        this.sourceCollection = App.collections[params.sourceCollectionID];
        this.targetCollection = App.collections[params.targetCollectionID];
        this.sourceIndex      = params.sourceModelIndex;
        this.params           = params;

        // if (this.sourceCollection.id == "AllMeds") {
        //     this.model = model.clone();
        //     this.model.set("qty", this.model.get("qty") + "" == "0.5" ? 0.5 : 1);
        // } else {
        //     this.model = model;
        // }

        //console.dir(this.toJSON());
    },

    toJSON : function() {
        return [ this.id, this.params ];
    },

    /**
     * @param {Function} cb Error-first callback
     */
    execute : function(cb) {
        var model = App.collections[this.params.sourceCollectionID].at(this.params.sourceModelIndex);
        if (!model) {
            throw new Error("Invalid sourceModelIndex parameter");
        }

        if (this.sourceCollection.id == "AllMeds") {
            model = model.clone();
            var qty = model.get("qty") + "";
            if (qty != "0.5" && qty != "0") {
                model.set("qty", 1);
            }
        }

        if (App.DRAGGED_MODEL) {
            if (model.collection) {
                model.collection.remove(model);
            }
            this.targetCollection.add(model);
            cb();
        } else {
            moveMed(model, this.targetCollection, this, cb);
        }
    },

    /**
     * @param {Function} cb Error-first callback
     */
    undo : function(cb) {
        var model = App.collections[this.params.sourceCollectionID].at(this.params.sourceModelIndex);
        if (!model) {
            throw new Error("Invalid sourceModelIndex parameter");
        }

        if (this.sourceCollection.id == "AllMeds") {
            model = model.clone();
            model.set("qty", model.get("qty") + "" == "0.5" ? 0.5 : 1);
        }

        moveMed(model, this.sourceCollection, this, cb);
    }
});

},{"../Command.js":2,"../views/MedView.js":26}],7:[function(require,module,exports){
var Command = require("../Command.js");

module.exports = Command.extend({
    id : "toggleCheck",

    /**
     * @param {Function} cb Error-first callback
     */
    execute : function(cb) {
        App.toggleCheck();
        setTimeout(cb, App.config.playbackSpeed);
    },

    /**
     * @param {Function} cb Error-first callback
     */
    undo : function(cb) {
        App.toggleCheck();
        setTimeout(cb, App.config.playbackSpeed);
    }
});

},{"../Command.js":2}],8:[function(require,module,exports){
var Command = require("../Command.js");

module.exports = Command.extend({
    id : "toggleHalfPill",

    initialize : function(options) {
        if (!options || typeof options != "object") {
            throw new Error("Invalid or missing options");
        }

        if (!options.collectionID || !App.collections[options.collectionID]) {
            throw new Error("Invalid or missing collectionID");
        }

        if (!options.modelIndex && options.modelIndex !== 0) {
            throw new Error("Invalid or missing modelIndex");
        }

        this.options = options;
    },

    /**
     * @param {Function} cb Error-first callback
     */
    execute : function(cb) {
        var model = App.collections[this.options.collectionID].at(this.options.modelIndex);

        if (!model) {
            //throw new Error("Invalid modelIndex");
            return cb();
        }

        var qty = model.get("qty") + "";
        qty = qty == "1" ? 0.5 : 1;
        model.set("qty", qty);
        setTimeout(cb, App.config.playbackSpeed);
    },

    /**
     * @param {Function} cb Error-first callback
     */
    undo : function(cb) {
        this.execute(cb);
    },

    toJSON : function() {
        return [ this.id, this.options ];
    }
});

},{"../Command.js":2}],9:[function(require,module,exports){
var Command = require("../Command.js");

module.exports = Command.extend({
    id : "toggleHint",

    /**
     * @param {Function} cb Error-first callback
     */
    execute : function(cb) {
        App.toggleHint();
        setTimeout(cb, App.config.playbackSpeed);
    },

    /**
     * @param {Function} cb Error-first callback
     */
    undo : function(cb) {
        App.toggleHint();
        setTimeout(cb, App.config.playbackSpeed);
    }
});

},{"../Command.js":2}],10:[function(require,module,exports){
/* global App, $, _, Backbone */
var utils = require("./utils.js");

function History() {

    var

        // Contains the storred commands
        _list = [],

        // The cirrent length of the commads list
        _len  = 0,

        // The current positio within the history (the _list)
        _pos  = -1,

        // Reference to the current command (if any)
        _cur  = null,

        // Reference to the instance
        inst  = this,

        // Flag to help avoid nested add() calls (if a command
        // invokes another command)
        _ignoreAdd,

        // Increments on any save request
        _saveCounter = 0,

        // The session ID that is created by the backend after the first
        // recorded action. It is then passed to any further requests so that
        // they can be recognized as part of the same session
        _sessionID,

        // Task queue used by the undoAll and redoAll functions
        QUEUE = utils.Queue(),

        // Usage statistics are collected here
        STATS = {
            startTime : null,
            endTime   : null,
            counts : {
                actions : 0,// total number of commands
                check   : 0,
                hint    : 0,
                clear   : 0,
                help    : 0
            }
        };

    /**
     * Undo everything
     */
    function undoAll()
    {
        var undo = function(cb) {
            inst.undo(cb);
        };

        for (var i = _pos; i >= 0; i--) {
            QUEUE.add(undo);
        }

        // at the end make sure to close any dialogs
        QUEUE.add(function(cb) {
            App.utils.modal("close");
            cb();
        });
    }

    /**
     * Redo everything
     */
    function redoAll()
    {
        var redo = function(cb) {
            inst.redo(cb);
        };

        for (var i = _pos; i < _len - 1; i++) {
            QUEUE.add(redo);
        }

        // at the end make sure to close any dialogs
        QUEUE.add(function(cb) {
            App.utils.modal("close");
            cb();
        });
    }

    function onDomReady()
    {
        $(document)
        .on("click", '[data-cmd="undo"]', function() {
            QUEUE.add(function(cb) {
                inst.undo(cb);
            });
        })
        .on("click", '[data-cmd="redo"]', function() {
            QUEUE.add(function(cb) {
                inst.redo(cb);
            });
        })
        .on("click", '[data-cmd="undoAll"]', undoAll)
        .on("click", '[data-cmd="redoAll"]', redoAll);

        inst.on("change", function() {
            var canUndo = _len > 0 && _pos > -1,
                canRedo = _len > 0 && _pos < _len - 1;

            $('[data-cmd="undo"], [data-cmd="undoAll"]')
            .prop("disabled", !canUndo)
            .toggleClass("disabled", !canUndo);

            $('[data-cmd="redo"], [data-cmd="redoAll"]')
            .prop("disabled", !canRedo)
            .toggleClass("disabled", !canRedo);

            if (App.config.autoSave && !$("body").is(".playing")) {
                inst.save($.noop);
            }
        });
    }

    // Instance Methods
    // ------------------------------------------------------------------------

    this.inject = function(data)
    {
        _list = [];
        _pos  = -1;
        _len  = 0;
        STATS = {
            startTime : data.stats.startTime || null,
            endTime   : data.stats.endTime || null,
            counts : {
                actions : 0,// total number of commands
                check   : 0,
                hint    : 0,
                clear   : 0,
                help    : 0
            }
        };
        _.each(data.actions, function(params) {
            var cmd = new App.commands[params[0]](params[1]);
            inst.add(cmd);
        });

        this._data = data;
    };

    this.save = function(cb)
    {
        if (!App.config.backendHost) {
            return cb();
        }

        var data = this.toJSON();
        data.requestNumber = ++_saveCounter;

        $.ajax({
            type: "POST",
            contentType: "application/json; charset=UTF-8",
            dataType: "json",
            url: App.config.backendHost + "/?mrn=" + App.models.Patient.id,
            data: JSON.stringify(data)
        }).then(
            function(resp) {
                _sessionID = resp.id || undefined;
                cb(null, resp);
            },
            function(jqXHR, textStatus, errorThrown) {
                cb(new Error(
                    App.utils.getAjaxError(jqXHR, textStatus, errorThrown)
                ));
            }
        );
    };

    this.end = function(cb) {
        if (!STATS.endTime) {
            STATS.endTime = Date.now();
            if (inst._data || $("body").is(".playing")) {
                cb(null, inst._data);
            } else {
                this.save(function(err, data) {
                    if (err) {
                        return cb(err);
                    }
                    inst._data = data;
                    _sessionID = undefined;
                    cb(null, data);
                });
            }
        } else {
            cb(null, inst._data);
        }
    };

    this.start = function() {
        if (!STATS.startTime) {
            STATS.startTime = Date.now();
        }
    };

    this.replay = function() {
        var i;
        $("body").addClass("playing");

        if ($("body").is(".hint")) {
            App.toggleHint();
        }

        if ($("body").is(".auto-check")) {
            App.toggleCheck();
        }

        QUEUE.clear();

        App.setState({});

        _pos = -1;
        var redo = function(cb) {
            inst.redo(function() {
                App.utils.modal("close");
                App.check(true);
                setTimeout(cb, App.config.playbackGap);
            });
        };
        for (i = _pos; i < _len; i++) {
            if (_list[i] && _list[i].id == "toggleHalfPill") {
                _list[i].execute($.noop);
            }
            QUEUE.add(redo);
        }
        QUEUE.add(function(cb) {
            App.utils.modal("close");
            App.exit();
            $("body").removeClass("playing");
            cb();
        });
    };

    this.toJSON = function() {
        var out = {
            id      : _sessionID,
            time    : Date.now(),
            stats   : STATS,
            actions : _.map(_list, function(cmd) {
                return cmd.toJSON();
            }),
            state       : App.getState(),
            targetState : App.getTargetState(),
            completePct : App.check(true),
            medications : App.collections.AllMeds.toJSON()
        };

        return out;
    };

    /**
     * Adds new command to the history after the current one (if any)
     */
    this.add = function(cmd) {
        if (_ignoreAdd) {
            return;
        }

        // Update statistics
        STATS.counts.actions += 1;
        if (cmd.id == "toggleCheck") {
            if ($("body").is(".auto-check")) {
                STATS.counts.check += 1;
            }
        } else if (cmd.id == "toggleHint") {
            if ($("body").is(".hint")) {
                STATS.counts.hint += 1;
            }
        } else if (cmd.id == "clear") {
            STATS.counts.clear += 1;
        } else if (cmd.id == "help") {
            STATS.counts.help += 1;
        }

        // if we are NOT at the end of the histoory chain and the new command
        // is NOT the same as the one next the current one, then onvalidate
        // all the remaining commands (remove them)
        if (_pos < _len - 1 && _list[_pos + 1] !== cmd) {
            this.trigger("remove", _list.splice(_pos + 1));
        }

        _len = _list.push(cmd);
        _pos = _len - 1;
        _cur = _list[_pos];
        this.trigger("add", _cur, _pos);
        this.trigger("change", _cur, _pos);

        if (App.config.autoExit &&
            !$("body").is(".hint") &&
            App.check(true) == 100)
        {
            App.exit();
        }
    };

    /**
     * Undo undoes the current operation and decrements
     * the history position ponter
     * @param {Function} cb Error-first callback
     */
    this.undo = function(cb)
    {
        // First check if it is possible to undo
        if (!_cur) {
            return cb(new Error("undo: No command found"));
        }

        // If the current command has opened some dialog UI - close it
        App.utils.modal("close");

        // undo the current command
        _cur.undo(function(err, result) {
            if (err) {
                return cb(err);
            }
            _cur = _list[--_pos];
            inst.trigger("change", _cur, _pos);
            cb(null, result);
        });
    };

    /**
     * Redo executes the next pending operation again and advances
     * the history position ponter
     * @param {Function} cb Error-first callback
     */
    this.redo = function(cb)
    {
        // First check if it is possible to redo
        if (_pos >= _len - 1) {
            return cb(new Error(
                "redo: Trying to redo when no other command are available"
            ));
        }

        _ignoreAdd = true;

        // If the current command has opened some dialog UI - close it
        App.utils.modal("close");

        // execute the next command
        _list[_pos + 1].execute(function(err, result) {
            _ignoreAdd = false;
            if (err) {
                return cb(err);
            }
            _cur = _list[++_pos];
            inst.trigger("change", _cur, _pos);
            cb(null, result);
        });
    };

    $(onDomReady);
}
_.extend(History.prototype, Backbone.Events);

module.exports = History;

},{"./utils.js":19}],11:[function(require,module,exports){
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

},{"./utils.js":19}],12:[function(require,module,exports){
/* global $, _*/
(function() {

    $("html").toggleClass("touch", 'ontouchend' in document);

    /* Shared local variables ----------------------------------------------- */
    var utils = require("./utils.js");
    var localizator = require("./localizator.js");
    var ReportView  = require("./views/ReportView.js");

    var App = window.App = {
        utils       : require("./utils.js"),
        localizator : localizator,
        localize    : localizator.localize,
        history     : new (require("./history.js"))(),
        views       : {},
        models      : {},
        commands    : {
            moveMedicine   : require("./commands/moveMedicine.js"),
            clear          : require("./commands/clear.js"),
            check          : require("./commands/check.js"),
            toggleCheck    : require("./commands/toggleCheck.js"),
            toggleHint     : require("./commands/toggleHint.js"),
            toggleHalfPill : require("./commands/toggleHalfPill.js"),
            help           : require("./commands/help.js")
        }
    };

    var MedsCollection = require("./models/MedsCollection.js");
    var PatientModel = require("./models/PatientModel.js");
    var UrlData = require("./models/UrlData");

    // This will be set after the URL is parsed...
    var COMMAND;

    // dataTransfer object behavior is not consistent enough!
    App.DRAGGED_MODEL = null;

    /* Models and Collections ----------------------------------------------- */
    App.collections = {
        AllMeds      : new MedsCollection([], { id : "AllMeds"      }),
        MorningMeds  : new MedsCollection([], { id : "MorningMeds"  }),
        NoonMeds     : new MedsCollection([], { id : "NoonMeds"     }),
        EveningMeds  : new MedsCollection([], { id : "EveningMeds"  }),
        WeeklyMeds   : new MedsCollection([], { id : "WeeklyMeds"   }),
        BedtimeMeds  : new MedsCollection([], { id : "BedtimeMeds"  }),
        AsNeededMeds : new MedsCollection([], { id : "AsNeededMeds" }),
        DeletedMeds  : new MedsCollection([], { id : "DeletedMeds"  })
    };

    App.models.UrlData = new UrlData();
    App.models.Patient = new PatientModel();

    App.play = function() {
        $("body").addClass("playing");

        $.ajax({
            type       : "GET",
            contentType: "application/json; charset=UTF-8",
            dataType   : "json",
            url        : App.config.backendHost + "/?mrn=" + App.models.Patient.id,
            xhrFields: {
                withCredentials: false
            }
        }).then(
            function(data) {
                App.collections.AllMeds.reset(data.medications, { parse: true });
                App.history.inject(data);
                App.history.replay();
            },
            function(jqXHR, textStatus, errorThrown) {
                console.error(
                    App.utils.getAjaxError(jqXHR, textStatus, errorThrown)
                );
            }
        );
    };

    App.getState = function() {
        return {
            MorningMeds  : this.collections.MorningMeds.models,
            NoonMeds     : this.collections.NoonMeds   .models,
            EveningMeds  : this.collections.EveningMeds.models,
            WeeklyMeds   : this.collections.WeeklyMeds .models,
            BedtimeMeds  : this.collections.BedtimeMeds.models,
            AsNeededMeds : this.collections.AsNeededMeds.models
        };
    };

    App.setState = function(state) {
        this.collections.MorningMeds .reset(state.MorningMeds  || []);
        this.collections.NoonMeds    .reset(state.NoonMeds     || []);
        this.collections.EveningMeds .reset(state.EveningMeds  || []);
        this.collections.WeeklyMeds  .reset(state.WeeklyMeds   || []);
        this.collections.BedtimeMeds .reset(state.BedtimeMeds  || []);
        this.collections.AsNeededMeds.reset(state.AsNeededMeds || []);
        this.collections.DeletedMeds .reset(state.DeletedMeds  || []);
        if (this.autoCheck) {
            this.check();
        }
    };

    App.getTargetState = function() {
        var out = {
            MorningMeds : [],
            NoonMeds    : [],
            EveningMeds : [],
            WeeklyMeds  : [],
            BedtimeMeds : [],
            AsNeededMeds: []
        };

        this.collections.AllMeds.each(function(model) {
            var props = model.toJSON(), i = 0, n = props.qty, data, asNeeded;

            // when needed
            if (!props.dosage) {
                out.AsNeededMeds.push($.extend(true, {}, props));
            } else {
                if (n === 0) {
                    n = 1;
                    asNeeded = true;
                }
                while (i < n) {
                    data = $.extend(true, {}, props);
                    // "qty" is incremented with a step of 0.5. For each
                    // integer step we add 1 med model. However, if qty is
                    // not an integer, that we should add one more and the
                    // user is expected to toggle it to "1/2" to set the
                    // correct dosage...
                    //console.log(data.qty, i);
                    data.qty = i === n - 0.5 ? 0.5 : asNeeded ? 0 : 1;

                    switch (data.dosage) {
                    case "M":
                        out.MorningMeds.push(data);
                        break;
                    case "N":
                        out.NoonMeds.push(data);
                        break;
                    case "E":
                        out.EveningMeds.push(data);
                        break;
                    case "B":
                        out.BedtimeMeds.push(data);
                        break;
                    case "ME":
                        out.MorningMeds.push(data);
                        out.EveningMeds.push(data);
                        break;
                    case "MNE":
                        out.MorningMeds.push(data);
                        out.NoonMeds   .push(data);
                        out.EveningMeds.push(data);
                        break;
                    case "x4":
                        out.MorningMeds.push(data);
                        out.NoonMeds   .push(data);
                        out.EveningMeds.push(data);
                        out.BedtimeMeds.push(data);
                        break;
                    case "W":
                        out.WeeklyMeds.push(data);
                        break;
                    case "x6":
                        out.AsNeededMeds.push(data);
                        break;
                    }

                    i += 1;
                }
            }
        });

        return out;
    };

    App.check = function(returnPercentage) {
        var userState   = this.getState(),
            targetState = this.getTargetState(),
            completeSegments = 0,
            targetSegments = 0,
            map = {
                MorningMeds  : ".morning-meds",
                NoonMeds     : ".noon-meds",
                EveningMeds  : ".evening-meds",
                WeeklyMeds   : ".weekly-meds",
                BedtimeMeds  : ".four-x-meds",
                AsNeededMeds : ".as-needed-meds"
            };

        _.each(targetState, function(collection) {
            targetSegments += (collection.length ? 1 : 0);
        });

        _.each(targetState, function(collection, name) {
            var container = $(map[name]);
            var sorter = function(a, b) {
                if (a.rxnorm == b.rxnorm) {
                    return a.qty - b.qty;
                }
                return a.rxnorm - b.rxnorm;
            };

            // console.log(JSON.stringify(collection.slice().sort(sorter)));
            // console.log(JSON.stringify(_.map(userState[name], function(model) {
            //     return model.attributes;
            // }).sort(sorter)));

            var isOK = _.isEqual(
                collection.slice().sort(sorter),
                _.map(userState[name], function(model) {
                    return model.attributes;
                }).sort(sorter)
            );

            if (!returnPercentage) {
                container.toggleClass("has-error", !isOK)
                    .toggleClass("has-success", isOK);
            }

            completeSegments += isOK && collection.length ? 1 : 0;
        });

        return completeSegments/targetSegments * 100;
    };

    App.uncheck = function() {
        $(".pillbox-container").removeClass("has-success has-error");
    };

    App.toggleCheck = function() {
        this.autoCheck = !this.autoCheck;
        $("body").toggleClass("auto-check", !!this.autoCheck);

        if (this.autoCheck) {
            this.check();
        } else {
            this.uncheck();
        }
    };

    App.toggleHint = function() {
        // Clear hint and restore user state
        if (this.userState) {
            this.setState(this.userState);
            this.userState = null;
            $("body").removeClass("hint");
        }

        // Clear user state and render hint
        else {
            this.userState = this.getState();
            this.setState(this.getTargetState());
            $("body").addClass("hint");
        }
    };

    App.print = function() {

        $("body").removeClass("has-menu");
        $("html").addClass("print loading");

        if (!App.userState) {
            App.userState = App.getState();
        }

        var targetState = App.getTargetState();
        var len = 0;
        var printDone;

        function doPrint() {
            printDone = true;
            App.collections.MorningMeds .trigger("reset");
            App.collections.NoonMeds    .trigger("reset");
            App.collections.EveningMeds .trigger("reset");
            App.collections.WeeklyMeds  .trigger("reset");
            App.collections.BedtimeMeds .trigger("reset");
            App.collections.AsNeededMeds.trigger("reset");
            $("html").removeClass("loading");
            window.print();
            if (COMMAND != "print") {
                $("html").removeClass("print");
                $("body").removeClass("hint");
                App.setState(App.userState);
                App.userState = null;
            }
        }

        App.setState(targetState);
        $("body").addClass("hint");


        _.each(targetState, function(collection, key) {
            App.collections[key].each(function(model) {
                len += 1;
                model.onReady(function() {
                    if (--len < 1 && !printDone) {
                        doPrint();
                    }
                });
            });
        });
    };

    App.runCommand = function(id, params) {
        if (!id || !App.commands.hasOwnProperty(id)) {
            throw new Error("No such command");
        }
        var cmd = new App.commands[id](params);

        cmd.execute(function(err) {
            if (err) {
                return console.error(err);
            }
            App.history.add(cmd);
        });
    };

    App.showHelp = function() {
        this.utils.modal(".modal.help");
    };

    App.exit = function() {
        this.history.end(function(err/*, data*/) {
            if (err) {
                console.error(err);
                return;
            }
            /*
            var html = [],
                pct  = data.completePct;

            html.push(
                localizator.str("common.you_achieved"),
                " ",
                Math.round(pct) + "% ",
                localizator.str("common.success_rate")
            );

            if (data.stats.endTime && data.stats.startTime) {
                html.push(
                    " ",
                    localizator.str("common.in"), " ",
                    App.utils.formatTime(
                        data.stats.endTime - data.stats.startTime,
                        {
                            skipEmpty : true,
                            round     : 2
                        }
                    )
                );
            }

            $(".modal.thankyou .score").html(html.join(""));
            */
            $(".modal.thankyou .btn-reload")[
                App.models.UrlData.get("play") ? "hide" : "show"
            ]();
            App.utils.modal(".modal.thankyou");
        });
    };

    App.selectLanguage = function() {
        $("body").removeClass("has-menu");
        this.utils.modal(".modal.select-language");
    };

    App.toggleMenu = function() {
        $("body").toggleClass("has-menu");
    };

    App.sendFeedback = function() {
        $("body").removeClass("has-menu");
        this.utils.modal(".modal.feedback");
        $(".modal.feedback .btn-primary").off().on("click", function() {
            var message = $.trim($("#feedback-message").val()),
                subject,
                $btn;
            if (message) {
                $btn = $(this).prop("disabled", true).addClass("loading");
                subject = $.trim($("#feedback-subject").val());

                $.ajax({
                    url        : App.config.backendHost + "/feedback",
                    method     : "POST",
                    contentType: "application/json; charset=UTF-8",
                    dataType   : "json",
                    data: JSON.stringify({
                        message : message,
                        subject : subject,
                        mrn     : App.models.Patient.id
                    })
                }).then(
                    function() {
                        // alert("Thank You!");
                    },
                    function(jqXHR, textStatus, errorThrown) {
                        console.error(
                            App.utils.getAjaxError(jqXHR, textStatus, errorThrown)
                        );
                    }
                ).always(function() {
                    $btn.prop("disabled", false).removeClass("loading");
                    setTimeout(function() {
                        $btn.trigger("close").closest(".modal").hide();
                        $("body").removeClass("modal-open");
                    }, 100);
                });
            }
        });
    };

    App.reportTakenMeds = function(blockUI) {
        $("body").removeClass("has-menu");

        $(".modal.report").toggleClass("kbd", !blockUI);

        var targetState = App.getTargetState();

        var view = new ReportView({
            el   : ".modal.report .scroller",
            model: targetState
        });
        view.render().$el.trigger("customcontent");
        this.utils.modal(".modal.report");

        var $btn = $(".modal.report .btn-primary");

        if (!blockUI) {
            $(".modal.report .close-btn")
            .off(".closemodal")
            .on("click.closemodal", function() {
                $("body").removeClass("modal-open").removeClass("empty");
            });
        }

        $btn.off().on("click", function() {
            if (this.disabled) {
                return false;
            }

            $btn.prop("disabled", true).addClass("loading");

            $.ajax({
                url        : App.config.backendHost + "/report",
                method     : "POST",
                contentType: "application/json; charset=UTF-8",
                dataType   : "json",
                data: JSON.stringify({
                    meds: view.export(),
                    mrn : App.models.Patient.id
                })
            }).then(
                function() {
                    if (blockUI) {
                        $(".modal.report").html(
                            '<div class="thankyou-message">' +
                                '<h1>Thank You!</h1>' +
                                '<p>Your report has been stored in our database.</p>' +
                            '</div>'
                        );
                    }
                },
                function(jqXHR, textStatus, errorThrown) {
                    console.error(
                        App.utils.getAjaxError(jqXHR, textStatus, errorThrown)
                    );
                    if (blockUI) {
                        $(".modal.report").html(
                            '<div class="thankyou-message">' +
                                '<h1>An Error Occurred!</h1>' +
                                '<p>Please try again later.</p>' +
                            '</div>'
                        );
                    }
                }
            ).always(function() {
                $btn.prop("disabled", false).removeClass("loading");
                setTimeout(function() {
                    if (!blockUI) {
                        $btn.trigger("close").closest(".modal").hide();
                        $("body").removeClass("modal-open");
                        $("body").removeClass("empty");
                    }
                }, 100);
            });
        });
    };

    /* Views ---------------------------------------------------------------- */
    var MedsList    = require("./views/MedsList.js");
    var PillboxView = require("./views/PillboxView.js");
    var TrashView   = require("./views/TrashView.js");
    var MainView    = require("./views/MainView.js");

    function initDOM()
    {
        // Close buttons in dialogs
        $("html").on("click", ".modal .close-btn", function() {
            $(this).trigger("close").closest(".modal").hide();
            $("body").removeClass("modal-open");
        });

        // Close modals with Esc key
        $(window).on("keydown", function(e) {
            if (e.keyCode == 27) {
                var $modal = $("body.modal-open .modal.kbd:visible");
                if ($modal.length) {
                    $modal.trigger("close").hide();
                    $("body").removeClass("modal-open");
                }
            }
        });

        // Close modals by clicking on the overlay
        $("body").on("mousedown touchstart", ".modal-overlay", function() {
            var $modal = $("body.modal-open .modal.kbd:visible");
            if ($modal.length) {
                $modal.trigger("close").hide();
                $("body").removeClass("modal-open");
            }
            return false;
        });

        $("html").trigger("customcontent").addClass("loaded");

        // Build the language selector
        var enabledLocales = App.localizator.getEnabledLocales(),
            cur = App.localizator.getLanguage();

        $(".language-selector").each(function(i, o) {
            var $o = $(o).empty();


            // Display the one or more than two languages as select
            $.each(enabledLocales, function(j, locale) {
                var a = $(
                    '<a href="javascript:void 0;" ' +
                    'data-lang="' + locale.langAbbr + '">' +
                    locale.nativeName +
                    (
                        locale.language === locale.nativeName ?
                            '' :
                            ' <span style="font-weight:200">(' +
                            locale.language +
                            ')</span>'
                    ) +
                    '</a>'
                ).on(
                    "ontouchend" in document ? "touchstart" : "mousedown",
                    function(event) {
                        event.preventDefault();
                        event.stopPropagation();
                        App.localizator.setLanguage(locale.langAbbr);
                    }
                )
                .toggleClass('active', cur == locale.langAbbr);

                $o.append(
                    $('<li class="list-nav-item"/>').append(a)
                    .css("textTransform", "capitalize")
                );
            });
        });

        $("html").bind("set:language", function(e, lang) {
            $(".language-selector .list-nav-item > a").each(function(i, a) {
                $(a).toggleClass("active", a.getAttribute("data-lang") == lang);
            });
        });
    }

    function initViews(cfg)
    {
        App.views.MainView    = new MainView({ el : document.body }).render();
        App.views.PillboxView = new PillboxView().render();
        App.views.MedsList    = new MedsList().render();
        App.views.TrashView   = new TrashView().render();
        App.views.PillboxView.$el.appendTo(cfg.layout);
        App.views.MedsList   .$el.appendTo(cfg.layout);
        App.views.TrashView  .$el.appendTo(cfg.layout);
        $("html").trigger("customcontent");
    }

    App.init = function(options) {

        utils.getConfig("config.xml", function(err, settings) {
            if (err) {
                return console.error(err);
            }

            var cfg = App.config = $.extend(true, {
                layout : "body",
                server : ""
            }, settings, options);

            $.getScript(cfg.backendHost + "/translations.js", function() {
                initDOM();

                $(cfg.layout).empty();

                App.models.UrlData.fetch().then(function(data, errors) {
                    // console.log(data);
                    var dataIsValid = !errors || !errors.length;
                    COMMAND = "exercise";
                    if (data.play) {
                        COMMAND = "play";
                    }
                    else if (data.print) {
                        COMMAND = "print";
                    }
                    else if (data.scan) {
                        COMMAND = "scan";
                    }
                    else if (data.report) {
                        COMMAND = "report";
                    }

                    if (COMMAND != "report") {
                        $("body").removeClass("empty");
                    }

                    // Patient -------------------------------------------------
                    if (dataIsValid) {
                        App.models.Patient.set(data.patient);
                        if (!App.models.Patient.isValid()) {
                            errors.push(App.models.Patient.validationError);
                            dataIsValid = false;
                        }
                    }

                    // Play ----------------------------------------------------
                    if (dataIsValid && data.play) {
                        initViews(cfg);
                        return App.play();
                    }

                    // Medications ---------------------------------------------
                    if (dataIsValid) {

                        App.collections.AllMeds.reset(
                            App.models.UrlData.get("medications"),
                            { parse: true }
                        );

                        dataIsValid = App.collections.AllMeds.every(
                            function(model) {
                                if (!model.isValid()) {
                                    errors.push(model.validationError);
                                    return false;
                                }
                                return true;
                            }
                        );
                    }

                    // report --------------------------------------------------
                    if (COMMAND == "report") {
                        return App.reportTakenMeds(true);
                    }

                    // Print ---------------------------------------------------
                    if (dataIsValid && data.print) {
                        initViews(cfg);
                        return App.print();
                    }

                    /*
                    # if ioswrap:
                    #     if valid data parameter:
                    #        display greeting with two options - "get started" and "scan a new QR code"
                    #        when finished with pillbox give option to "scan a new QR code"
                    #     else:
                    #        display greeting with one option - "scan QR code"
                    #        when finished with pillbox give option to "scan a new QR code"
                    # else:
                    #     if valid data parameter:
                    #        display greeting with one option - "get started"
                    !        when finished with pillbox give option to close window
                    #     else:
                    #        display error message
                    */
                    //console.dir(data);
                    if (data.scan) {
                        $("body").addClass("can-scan");
                        if (dataIsValid) {
                            initViews(cfg);
                            App.utils.modal(".modal.wellcome");
                        } else {
                            $(".modal.launchscan .message").html(
                                data.medications || data.patient ?
                                    errors.join("<br/>") :
                                    ""
                            );
                            App.utils.modal(".modal.launchscan");
                        }
                    } else {
                        $("body").removeClass("can-scan");
                        if (dataIsValid) {
                            initViews(cfg);
                            App.utils.modal(".modal.wellcome");
                        } else {
                            $(".modal.error pre").text(errors.join("\n"));
                            App.utils.modal(".modal.error");
                        }
                    }
                }, function() {
                    App.utils.modal(".modal.launchscan");
                });
            });
        });
    };

    require("./touch_dnd.js");
})();

},{"./commands/check.js":3,"./commands/clear.js":4,"./commands/help.js":5,"./commands/moveMedicine.js":6,"./commands/toggleCheck.js":7,"./commands/toggleHalfPill.js":8,"./commands/toggleHint.js":9,"./history.js":10,"./localizator.js":11,"./models/MedsCollection.js":14,"./models/PatientModel.js":15,"./models/UrlData":16,"./touch_dnd.js":18,"./utils.js":19,"./views/MainView.js":25,"./views/MedsList.js":27,"./views/PillboxView.js":33,"./views/ReportView.js":34,"./views/TrashView.js":35}],13:[function(require,module,exports){
/* global App, $, Backbone, jQuery */
var utils  = require("../utils.js");
var RXNORM = require("../../../rxnorm.js");
var rxnormImg = require("../rxnorm_images.js");

var imageCache = {};
var defaultSrc = $('<a href="./img/pill.svg"/>').prop("href");

function preload(src, model, id) {
    var img = new Image();
    img.onload = function() {
        imageCache[id] = this.src;
        model.set("image", this.src);
    };
    img.onerror = function() {
        if (src != defaultSrc) {
            preload(defaultSrc, model, id);
        }
    };
    img.src = src;
}

/**
 * This model represents medications. The medications in this app are NOT
 * 100% compatible with the SMART version. Here the dosage is expressed
 * using custom letter codes.
 */
var MedModel = Backbone.Model.extend({

    // Set "idAttribute" to something that does not exist! This will force
    // Backbone to identify models by "cid" (client ID) instead of id,
    // which is what we need in this case
    idAttribute : "%^&^%",

    defaults : {
        "name"   : "",
        "rxnorm" : "",
        "dosage" : "N",
        "qty"    : 1,
        "image"  : ""
    },

    initialize : function() {

        this.on("change:name", this._checkReady);
        this.on("change:image", this._checkReady);

        Backbone.Model.prototype.initialize.apply(this, arguments);

        this._checkReady();

        if (!this._isReady) {
            this.loadName();
            this.loadImage();
        }
    },

    _checkReady : function() {
        if (this._isReady) {
            return;
        }

        var name  = this.get("name"),
            image = this.get("image");

        if (name && image && image != "about:blank" && name != "Loading...") {
            this._isReady = true;
            this.trigger("ready");
        }
    },

    onReady : function(cb) {
        this._checkReady();
        if (this._isReady) {
            cb();
        } else {
            this.once("ready", cb);
        }
    },

    loadName : function() {
        var model   = this,
            rxnorm  = model.get("rxnorm"),
            current = model.get("name");

        if (current && current != "Loading...") {
            return this._checkReady();
        }

        $.ajax({
            dataType: "json",
            url     : App.config.nihNameServiceURL + "/REST/rxcui/" + rxnorm +
                      "/property.json?propName=RxNorm%20Name"
        }).then(function(data) {
            var name = "rxnorm: " + rxnorm + " (no name)";

            if (data.propConceptGroup &&
                data.propConceptGroup.propConcept &&
                data.propConceptGroup.propConcept.length)
            {
                name = data.propConceptGroup.propConcept[0].propValue;
            }

            if (App.config.autoCapitalizeMedNames) {
                name = utils.ucFirst(name);
            }

            model.set("name", name);
        });
    },

    loadImage : function() {

        if (this._isLoadingImage) {
            return;
        }

        this._isLoadingImage = true;

        var model = this,
            id    = model.get("rxnorm"),
            cur   = model.get("image");

        if (cur && cur != "about:blank") {
            return this._checkReady();
        }

        if (!imageCache[id]) {

            // First look for custom image
            if (rxnormImg[id]) {
                preload("./img/meds/" + rxnormImg[id], model, id);
            }

            // Then try to search in external API
            else if (App.config.showPillImages) {
                jQuery.getJSON(
                    App.config.nihImageServiceURL + "/api/rximage/1/rxnav" +
                    "?resolution=600&rxcui=" + id,
                    function(data) {
                        if (data.nlmRxImages.length && data.nlmRxImages[0].imageUrl) {
                            preload(data.nlmRxImages[0].imageUrl, model, id);
                        } else {
                            preload(defaultSrc, model, id);
                        }
                    }
                );
            }

            // Finally use the default pill.svg
            else {
                preload(defaultSrc, model, id);
            }
        } else {
            model.set("image", imageCache[id]);
        }
    },

    parse : function(response) {
        var data = {
            rxnorm : response.rxnorm,
            dosage : response.dosage,
            name   : String(RXNORM[response.rxnorm] || ""),
            qty    : utils.floatVal(response.qty),
            image  : ""
        };

        if (App.config.autoCapitalizeMedNames) {
            data.name = utils.ucFirst(data.name);
        }

        data.name = data.name || "Loading...";

        return data;
    },

    validate : function(attrs) {
        if (!attrs.rxnorm) {
            return new Error("rxnorm is missing");
        }
    }
});

module.exports = MedModel;

},{"../../../rxnorm.js":38,"../rxnorm_images.js":17,"../utils.js":19}],14:[function(require,module,exports){
var MedModel = require("./MedModel.js");

/**
 * Collection of medications
 */
var MedsCollection = Backbone.Collection.extend({
    model : MedModel,

    initialize : function(models, options) {
        if (!options || !options.id) {
            throw new Error("Collection id is required");
        }
        this.id = options.id;
        return Backbone.Collection.prototype.initialize.apply(this, arguments);
    }
});

module.exports = MedsCollection;

},{"./MedModel.js":13}],15:[function(require,module,exports){
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

},{}],16:[function(require,module,exports){
/* global _, Backbone, $ */
var codec = require("../../../pillbox_codec.js");
var utils = require("../utils.js");

var UrlData = Backbone.Model.extend({
    defaults : {
        medications : [],
        patient     : {},
        play        : false,
        scan        : false,
        print       : true
    },

    sync : function(method, model, options) {
        var dfd = new $.Deferred();

        function resolve() {
            if (_.isFunction(options.success)) {
                options.success.apply(options, arguments);
            }
            dfd.resolve.apply(dfd, arguments);
        }

        function reject() {
            if (_.isFunction(options.error)) {
                options.error.apply(options, arguments);
            }
            dfd.reject.apply(dfd, arguments);
        }

        options = options || {};
        model.trigger('request', model, dfd, options);

        if (method == "read") {
            var query  = utils.parseQueryString(location.search),
                params = query.q,
                data   = {},
                errors = [];

            data.print  = utils.bool(query.print);
            data.scan   = utils.bool(query.scan ) || utils.bool(query.ioswrap);
            data.report = utils.bool(query.report);
            data.exercise_id = utils.uInt(query.exercise_id);

            if (params) {
                try {
                    $.extend(data, codec.decode(params));
                } catch (ex) {
                    errors.push(new Error("Bad data passed to pillbox"));
                    console.error(ex);
                }
            }

            if (!data.play && !data.scan) {
                if (!$.isArray(data.medications) || !data.medications.length) {
                    errors.push(new Error("No medicaions data"));
                }
                if (!data.patient || $.isEmptyObject(data.patient)) {
                    errors.push(new Error("No patient data"));
                }
            }

            resolve(data, errors);
        }
        else {
            reject(dfd, "error", "Method Not Allowed");
        }

        return dfd;
    }
});

module.exports = UrlData;

},{"../../../pillbox_codec.js":37,"../utils.js":19}],17:[function(require,module,exports){
module.exports = {
    "314077" : "314077.png",
    "404673" : "404673.png",
    "153357" : "153357.png",


    "1189780" : "1189780.png",
    "1370507" : "1370507.png",
    "567575"  : "567575.png",
    "569998"  : "569998.png",
    "635969"  : "635969.png",
    "855635"  : "855635.png",
    "860976"  : "860976.png"
};

},{}],18:[function(require,module,exports){
/* global jQuery */
// DnD for touch devices
// =============================================================================
(function($) {
    var $doc = $(document), dragProxy, canDrop = null;

    function stopTouchDnD()
    {
        if (dragProxy) {
            dragProxy.remove();
            dragProxy = null;
        }

        canDrop = null;
        $doc.off(".dnd");
    }

    function startTouchDnD(e)
    {
        var orig = $(e.target).closest("[draggable]"),
            dropTarget,
            x = e.originalEvent.touches[0].pageX,
            y = e.originalEvent.touches[0].pageY;

        function createProxy()
        {
            var ofst = orig.offset(),
                w    = orig.outerWidth(),
                h    = orig.outerHeight();

            dragProxy = $('<div/>').css({
                position   : "fixed",
                top        : 0,
                left       : 0,
                zIndex     : 5000,
                marginLeft : ofst.left - x,
                marginTop  : ofst.top  - y,
                pointerEvents : "none",
                backfaceVizibility: "hidden",
                "transform" : "translate3d(" + x + "px, " + y + "px, 0)"
            })
            .append(orig.clone().css({
                pointerEvents : "none",
                margin        : 0,
                width         : w + 1,// Webkit rounding bug
                height        : h,
                borderRadius  : orig.css("borderRadius"),
                whiteSpace    : orig.css("whiteSpace"),
                boxSizing     : orig.css("boxSizing"),
                border        : orig.css("border"),
                display       : orig.css("display"),
                padding       : orig.css("padding"),
                boxShadow     : "0 0 0 5px rgba(100, 0, 0, 0.75)"
            }))
            .appendTo("body");
            orig.trigger("dragstart");
        }

        $doc.on("touchmove.dnd", function(event) {

            var touch = event.originalEvent.touches[0],
                _dropTarget,
                dragEnterEvent,
                dragOverEvent;

            event.preventDefault();
            event.stopPropagation();

            x = touch.pageX;
            y = touch.pageY;

            // Get the element below the proxy
            _dropTarget = $(document.elementFromPoint(x, y));

            // Move the proxy to the current touch position
            if (!dragProxy) {
                createProxy();
            } else {
                dragProxy[0].style.transform = "translate3d(" + x + "px, " + y + "px, 0)";
            }

            // Switch the drag-target and trigger dragenter and dragleave if needed
            if (dropTarget && dropTarget[0] != _dropTarget[0]) {
                dropTarget.trigger("dragleave");
                dragEnterEvent = new $.Event("dragenter");
                _dropTarget.trigger(dragEnterEvent);
            }

            dropTarget = _dropTarget;

            // Dispatch the dragover event
            dragOverEvent = new $.Event("dragover");
            dropTarget.trigger(dragOverEvent);

            // Detect if the author has decided to accept the dragged content
            canDrop = dragOverEvent.isDefaultPrevented() ||
                (dragEnterEvent && dragEnterEvent.isDefaultPrevented());
        });

        $doc.on("touchend.dnd", function() {

            if (dropTarget && dropTarget.length && canDrop === true) {
                dropTarget.trigger("drop");
            }

            stopTouchDnD();

            orig.trigger("dragend");
        });
    }


    function initTouchDnD()
    {
        if (!('ontouchend' in document)) {
            return;
        }

        $(document).on("touchstart.initdnd", "[draggable]", function(event) {
            stopTouchDnD();

            // Ignore multi-touch events
            if (event.originalEvent.touches.length > 1) {
                return;
            }

            function start() {
                $(event.target).off(".dnd");
                if (!event.isDefaultPrevented() && !event.isPropagationStopped()) {
                    event.preventDefault();
                    event.stopPropagation();
                    stopTouchDnD();
                    startTouchDnD(event);
                }
            }

            var timer = setTimeout(start, 100);

            $(event.target).on("touchmove.dnd touchend.dnd", function() {
                clearTimeout(timer);
                $(event.target).off(".dnd");
                stopTouchDnD();
            });
        });
    }

    initTouchDnD();
})(jQuery);

},{}],19:[function(require,module,exports){
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

},{}],20:[function(require,module,exports){
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

},{"./MedView.js":26}],21:[function(require,module,exports){
var PillBin         = require("./PillBin.js");
var AsNeededMedView = require("./AsNeededMedView.js");

var AsNeededPillBin = PillBin.extend({

    className : "pillbox-container as-needed-meds",

    collection: App.collections.AsNeededMeds,

    modelView : AsNeededMedView,

    render : function() {
        PillBin.prototype.render.call(this);
        this.$el.prepend(
            '<div class="pillbox-container-title" ' +
            'data-translatecontent="common.AsNeeded"/>'
        ).trigger("customcontent");
        return this;
    },

    initialize : function() {
        PillBin.prototype.initialize.apply(this, arguments);
        this.listenTo(this.collection, "add reset remove", this.equalize);
        this.$el.on("resize", _.bind(this.equalize, this));
    },

    /**
     * The "As Needed" is special because it shouldn't allow the user to drop
     * the same med twice.
     */
    onDragOver : function(e) {
        if (!App.DRAGGED_MODEL) {
            return true;
        }

        if (this.collection.findWhere({
            "rxnorm" : App.DRAGGED_MODEL.get("rxnorm")
        })) {
            return true; // reject drop
        }

        e.preventDefault(); // allow drop
        this.$el.addClass("drag-over");
    }
});

module.exports = AsNeededPillBin;

},{"./AsNeededMedView.js":20,"./PillBin.js":32}],22:[function(require,module,exports){
/* global Backbone, _, $ */
var ModelView = require("./ModelView.js");

/**
 * The base class for collection views. Provides a functionality that will
 * make the model views to remove themselves when their model is removed
 * from the collection.
 */
var CollectionView = Backbone.View.extend({

    /**
     * The constructor accepts an options hash but the only used option
     * for now is "modelView" which should be a reference to the child
     * view constructor.
     */
    initialize : function(options)
    {
        if (options && options.modelView) {
            this.modelView = options.modelView;
        }

        if (!this.modelView) {
            this.modelView = ModelView;
        }

        /**
         * Contains references to the views which render the collection
         * models, organised by "model.cid". Note that each model might
         * have multiple views so the values of this map are arrays.
         */
        this.modelViews = {};

        /**
         * Automatically update the view by adding or removing child
         * views when the collection changes it's state
         */
        this.listenTo(this.collection, "reset" , this.render   );
        this.listenTo(this.collection, "add"   , this.addOne   );
        this.listenTo(this.collection, "remove", this.removeOne);

        // Call the super constructor (just in case)
        Backbone.View.prototype.initialize.apply(this, arguments);
    },

    /**
     * Just empty and (re)render.
     * @return {CollectionView} view Returns this instance.
     */
    render : function()
    {
        this.empty();
        this.collection.each(this.addOne, this);
        return this;
    },

    /**
     * Creates new child view (instance of options.modelView), then
     * pushes it to this.modeViews[model.cid], then renders it and
     * appends it to the collection view element.
     * @param {Backbone.Model} model The model to add. Should be one
     *     that the child view knows how to render.
     * @return {Backbone.View} view The new view
     */
    addOne : function(model)
    {
        var view = new this.modelView({ model : model });
        if (!this.modelViews[model.cid]) {
            this.modelViews[model.cid] = [];
        }
        this.modelViews[model.cid].push(view);
        this.$el.append(view.render().$el);
        return view;
    },

    /**
     * When a model is removed from the collection, make sure to remove
     * all the nested views that are associated with it (if any).
     * @param {Backbone.Model} model The model that has been removed.
     * @return void
     */
    removeOne : function(model)
    {
        var views = this.modelViews[model.cid];
        if (views) {
            _.each(views, function(view) {
                view.remove();
            });
            this.modelViews[model.cid] = [];
        }
    },

    /**
     * Removes al the child views (if any). As a result the view element
     * should also be emptied, but we call this.$el.empty() just in case
     * it contains something else and because jQuery will also unbind
     * it's listeners before emptying.
     */
    empty : function()
    {
        _.each(this.modelViews, function(views) {
            _.each(views, function(view) {
                view.remove();
            });
        });
        this.modelViews = {};
        this.$el.empty();
    },

    equalize : function() {
        var maxWidth  = 0,
            maxHeight = 0;

        this.$el.find("div.med").css({
            width    : "auto",
            height   : "auto",
            minWidth : 0,
            maxWidth : "none",
            minHeight: 0,
            maxHeight: "none"
        }).each(function(i, div) {
            var $div   = $(div),
                width  = $div.outerWidth(),
                height = $div.outerHeight();

            if (maxWidth < width) {
                maxWidth = width;
            }

            if (maxHeight < height) {
                maxHeight = height;
            }

        }).css({
            minWidth  : maxWidth,
            minHeight : maxHeight
        });
    }
});

module.exports = CollectionView;

},{"./ModelView.js":28}],23:[function(require,module,exports){
var PillBin = require("./PillBin.js");

var EveningPillBin = PillBin.extend({

    className : "pillbox-container evening-meds",

    collection: App.collections.EveningMeds,

    render : function() {
        PillBin.prototype.render.call(this);
        this.$el.prepend(
            '<div class="pillbox-container-title" data-translatecontent="common.evening"/>'
        ).trigger("customcontent");
        return this;
    },

    initialize : function() {
        PillBin.prototype.initialize.apply(this, arguments);
        this.listenTo(this.collection, "add reset remove", this.equalize);
        this.$el.on("resize", _.bind(this.equalize, this));
    }
});

module.exports = EveningPillBin;

},{"./PillBin.js":32}],24:[function(require,module,exports){
var PillBin = require("./PillBin.js");

var FourXPillBin = PillBin.extend({

    className : "pillbox-container four-x-meds",

    collection: App.collections.BedtimeMeds,

    render : function() {
        PillBin.prototype.render.call(this);
        this.$el.prepend(
            '<div class="pillbox-container-title" data-translatecontent="common.bedtime"/>'
        ).trigger("customcontent");
        return this;
    },

    initialize : function() {
        PillBin.prototype.initialize.apply(this, arguments);
        this.listenTo(this.collection, "add reset remove", this.equalize);
        this.$el.on("resize", _.bind(this.equalize, this));
    }
});

module.exports = FourXPillBin;

},{"./PillBin.js":32}],25:[function(require,module,exports){
/* global App, Backbone */

var PatientView  = require("../views/PatientView.js");

var MainView = Backbone.View.extend({
    events : {
        "mousedown .btn-save"  : "record",
        "mousedown .btn-check" : "toggleCheck",
        "mousedown .btn-hint"  : "hint",
        "mousedown .btn-help"  : "help",
        "mousedown .btn-clear" : "clear",
        "mousedown .btn-exit"  : "exit"
    },

    initialize : function() {
        this.listenTo(
            App.collections.MorningMeds,
            "add remove reset sync change",
            this.updateUI
        );
        this.listenTo(
            App.collections.NoonMeds,
            "add remove reset sync change",
            this.updateUI
        );
        this.listenTo(
            App.collections.EveningMeds,
            "add remove reset sync change",
            this.updateUI
        );
        this.listenTo(
            App.collections.BedtimeMeds,
            "add remove reset sync change",
            this.updateUI
        );
        this.listenTo(
            App.collections.WeeklyMeds,
            "add remove reset sync change",
            this.updateUI
        );
        this.listenTo(
            App.collections.AsNeededMeds,
            "add remove reset sync change",
            this.updateUI
        );
    },

    render : function() {
        this.renderPatientInfo();
        this.updateUI();
        return this;
    },

    renderPatientInfo : function() {
        var patientView = new PatientView({
            model : App.models.Patient,
            el : this.$el.find(".patient-info")
        });
        patientView.render();
    },

    updateUI : function() {
        var view = this;
        if (view.updateUItimer) {
            clearTimeout(view.updateUItimer);
        }
        view.updateUItimer = setTimeout(function() {
            var hasAny = App.collections.MorningMeds.length ||
                App.collections.NoonMeds    .length ||
                App.collections.EveningMeds .length ||
                App.collections.WeeklyMeds  .length ||
                App.collections.BedtimeMeds .length ||
                App.collections.AsNeededMeds.length > 0;

            view.$el.find(".btn-clear, .btn-save")
                .prop("disabled", !!view.userState || !hasAny)
                .toggleClass("disabled", !!view.userState || !hasAny);

            if (App.autoCheck) {
                App.check();
            }
        }, 0);
    },

    // footer buttons ------------------------------------------------------
    toggleCheck : function(e) {
        if (e) {
            e.preventDefault();
        }
        App.runCommand("toggleCheck");
    },

    clear : function(e) {
        if (e) {
            e.preventDefault();
        }
        App.runCommand("clear");
    },

    record: function(e) {
        if (e) {
            e.preventDefault();
        }
        console.log(JSON.stringify(App.history.toJSON(), null, 4));
    },

    hint : function(e) {
        if (e) {
            e.preventDefault();
        }
        App.runCommand("toggleHint");
    },

    help : function(e) {
        if (e) {
            e.preventDefault();
        }
        App.runCommand("help");
    },

    exit : function(e) {
        if (e) {
            e.preventDefault();
        }
        App.exit();
    }
});

module.exports = MainView;

},{"../views/PatientView.js":31}],26:[function(require,module,exports){
/* global $, App */
var ModelView = require("./ModelView.js");
// var rxnormImg = require("../rxnorm_images.js");

//var imageCache = {};

/**
 * Opens the preview image popup
 * @param {String} url The image location
 * @param {String} name Optional. The medication name
 * @return void
 */
function previewImage(url, name) {
    var popup = $('<div class="image-preview"/>').appendTo("body");

    $('<div class="overlay"/>').appendTo("body")
    .on("mousedown.closeImagePreview", function() {
        popup.remove();
        $(this).off().remove();
    });

    popup.append(
        $('<img/>').attr("src", url)
    );

    if (name) {
        popup.append($('<big/>').text(name));
    }
}

/**
 * Renders single med (no matter if it's inside the meds list or the pillbox
 * or the trash)
 */
var MedView = ModelView.extend({

    className : "med",

    events : {
        "mousedown .btn-half" : "toggleHalf",
        "mousedown"           : "grab",
        "dragend"             : "onDragEnd",
        "mouseup"             : "onDragEnd",
        "mouseleave"          : "onDragEnd",
        "dragstart"           : "onDragStart",
        "click span"          : "toggleFullText",
        "click .drag-handle"  : "previewImage"
    },

    /**
     * Listen for changes on the properties that have visual representation
     */
    initialize : function() {
        this.listenTo(this.model, "change:qty"  , this.renderQty  );
        this.listenTo(this.model, "change:name" , this.renderName );
        this.listenTo(this.model, "change:image", this.renderImage);
        ModelView.prototype.render.apply(this, arguments);
    },

    /**
     * Opens the preview image popup when the image is clicked
     */
    previewImage : function(e) {
        e.stopPropagation();
        previewImage(
            this.model.get("image") || './img/pill.svg',
            this.model.get("name")
        );
    },

    /**
     * The pills can switch between whole and half pill when the user clicks on
     * the dedicated control
     */
    toggleHalf : function(e) {
        e.preventDefault();
        e.stopPropagation();
        App.runCommand(
            "toggleHalfPill",
            {
                collectionID : this.model.collection.id,
                modelIndex   : this.model.collection.models.indexOf(this.model)
            }
        );
    },

    /**
     * When he user clicks on the title span, it will togle between the full and
     * the short version
     */
    toggleFullText : function() {
        this.$el.find("span").toggleClass("full");
        this.$el.trigger("resize");
    },

    render : function() {
        var view  = this,
            model = this.model,
            qty   = model.get("qty") + "";

        this.$el.empty()
            .attr({
                "draggable"      : true,
                "data-model-cid" : this.model.cid,
                "data-rxnorm"    : this.model.get("rxnorm"),
                "title"          : this.model.get("name")
            })
            .toggleClass("half", qty == "0.5")
            .toggleClass("as-needed", qty == "0")
            .append('<span/>')
            .append('<div class="drag-handle"/>')
            .append(
                '<label class="btn-half' + (qty=="0.5" ? ' active' : '') + '"/>'
            );

        if (!this.model._isReady) {
            view.renderName();
        }

        model.onReady(function() {
            view.renderName();
            view.renderImage(model.image);
        });

        return this;
    },

    renderImage : function() {
        this.$el.find(".drag-handle").css({
            backgroundImage : "url('" + this.model.get("image") + "')"
        });
    },

    renderQty : function() {
        var qty = this.model.get("qty") + "",
            origin = location.origin,
            img;

        if (qty == "0") {
            this.$el.addClass("as-needed");
        } else {
            var lbl = this.$el.find(".btn-half")
                .addClass("attention")
                .toggleClass("active", qty == "0.5");
            this.$el.toggleClass("half", qty == "0.5");
            setTimeout(function() {
                lbl.removeClass("attention");
            }, 300);
        }

        if (!origin) {
            origin = location.protocol + "//" + location.host;
        }
        img = this.model.get("image").replace(origin, "");

        if (qty == "0.5" && (/\/img\/pill\.svg$/).test(img)) {
            this.model.set("image", img.replace(/pill\.svg$/, "half_pill.svg"));
        }
        else if (+qty > 0.5 && (/\/img\/half_pill\.svg$/).test(img)) {
            this.model.set("image", img.replace(/half_pill\.svg$/, "pill.svg"));
        }
    },

    /**
     * Renders the medication name. To increase readability, this method
     * attempts find the "main" name and render it in bold. The "main name" is
     * found by matching everything before the first numeric characte
     * (the dosage). In any case, the full name is also available in title
     * attribute.
     */
    renderName : function() {
        var name = this.model.get("name"),
            idx  = name.search(/\s\d/);

        this.$el.attr("title", this.model.get("name")).find("span").html(
            idx > -1 ?
                '<b>' + name.substr(0, idx) + '</b>' + name.substr(idx) :
                name
        );
    },

    // DnD Methods
    // -------------------------------------------------------------------------

    /**
     * This is called on mousedown to set the cursor to grab
     * @return void
     */
    grab : function() {
        this.$el.addClass("dragging");
    },

    /**
     * Make App.DRAGGED_MODEL point to this model
     */
    onDragStart : function(e) {
        App.DRAGGED_MODEL = this.model;

        // dataTransfer is not used but we need it because Firefox will ignore
        // the DnD otherwise
        if (e.originalEvent && e.originalEvent.dataTransfer) {
            e.originalEvent.dataTransfer.setData(
                "text",
                this.model.cid
            );
        }
    },

    /**
     * Clear the App.DRAGGED_MODEL reference and reset the view appearance
     */
    onDragEnd : function() {
        App.DRAGGED_MODEL = null;
        this.$el.removeClass("dragging");
    }
});

module.exports = MedView;

},{"./ModelView.js":28}],27:[function(require,module,exports){
var CollectionView = require("./CollectionView.js");
var MedView        = require("./MedView.js");

// Renders the meds list
var MedsList = CollectionView.extend({
    collection : App.collections.AllMeds,
    modelView  : MedView,
    className  : "pillbox-meds-list"
});

module.exports = MedsList;

},{"./CollectionView.js":22,"./MedView.js":26}],28:[function(require,module,exports){
/**
 * The base class for model views.
 */
module.exports = Backbone.View.extend();

},{}],29:[function(require,module,exports){
var PillBin = require("./PillBin.js");

var MorningPillBin = PillBin.extend({

    className : "pillbox-container morning-meds",

    collection: App.collections.MorningMeds,

    render : function() {
        PillBin.prototype.render.call(this);
        this.$el.prepend(
            '<div class="pillbox-container-title" data-translatecontent="common.morning"/>'
        ).trigger("customcontent");
        return this;
    },

    initialize : function() {
        PillBin.prototype.initialize.apply(this, arguments);
        this.listenTo(this.collection, "add reset remove", this.equalize);
        this.$el.on("resize", _.bind(this.equalize, this));
    }
});

module.exports = MorningPillBin;

},{"./PillBin.js":32}],30:[function(require,module,exports){
var PillBin = require("./PillBin.js");

var NoonPillBin = PillBin.extend({

    className : "pillbox-container noon-meds",

    collection: App.collections.NoonMeds,

    render : function() {
        PillBin.prototype.render.call(this);
        this.$el.prepend(
            '<div class="pillbox-container-title" data-translatecontent="common.noon"/>'
        ).trigger("customcontent");
        return this;
    },

    initialize : function() {
        PillBin.prototype.initialize.apply(this, arguments);
        this.listenTo(this.collection, "add reset remove", this.equalize);
        this.$el.on("resize", _.bind(this.equalize, this));
    }
});

module.exports = NoonPillBin;

},{"./PillBin.js":32}],31:[function(require,module,exports){
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

},{}],32:[function(require,module,exports){
/* global App */
var CollectionView = require("./CollectionView.js");
var MedView        = require("./MedView.js");

// A single bin inside the pillbox. This has DnD!
var PillBin = CollectionView.extend({
    className : "drop-target",
    modelView : MedView,
    events : {
        "dragover"  : "onDragOver",
        "dragenter" : "onDragEnter",
        "drop"      : "drop" ,
        "dragleave" : "onDragLeave",
        "dragend"   : "onDragEnd"
    },

    onDragEnter : function(e) {
        if (App.DRAGGED_MODEL && App.DRAGGED_MODEL.collection.id !== this.collection.id) {
            e.preventDefault(); // allow drop
        }
    },

    onDragOver : function(e) {
        if (App.DRAGGED_MODEL && App.DRAGGED_MODEL.collection.id !== this.collection.id) {
            e.preventDefault(); // allow drop
            this.$el.addClass("drag-over");
        }
    },

    onDragLeave : function() {
        this.$el.removeClass("drag-over");
    },

    onDragEnd : function() {
        this.$el.removeClass("drag-over");
    },

    drop : function(e) {
        e.preventDefault();
        if (App.DRAGGED_MODEL) {
            App.runCommand("moveMedicine", {
                //model  : App.DRAGGED_MODEL,
                //target : this.collection,

                sourceCollectionID : App.DRAGGED_MODEL.collection.id,
                targetCollectionID : this.collection.id,
                sourceModelIndex   : App.DRAGGED_MODEL.collection.models.indexOf(App.DRAGGED_MODEL)
            });
            App.DRAGGED_MODEL = null;
        }
        this.$el.removeClass("drag-over");//.scrollIntoView();
    }
});

module.exports = PillBin;

},{"./CollectionView.js":22,"./MedView.js":26}],33:[function(require,module,exports){
var viewClasses = {
    moorningView : require("./MorningPillBin.js"),
    noonView     : require("./NoonPillBin.js"),
    eveningView  : require("./EveningPillBin.js"),
    fourXView    : require("./FourXPillBin.js"),
    weeklyView   : require("./WeeklyPillBin.js"),
    AsNeededMeds : require("./AsNeededPillBin.js")
};

// PillboxView is just a layout that contains 5 PillBin child-views
var PillboxView = Backbone.View.extend({
    className : "pillbox",
    initialize : function() {
        _.each(viewClasses, function(fn, name) {
            var view = (new fn()).render();
            App.views[name] = view;
            this[name] = view;
            view.$el.appendTo(this.$el);
        }, this);
    }
});

module.exports = PillboxView;

},{"./AsNeededPillBin.js":21,"./EveningPillBin.js":23,"./FourXPillBin.js":24,"./MorningPillBin.js":29,"./NoonPillBin.js":30,"./WeeklyPillBin.js":36}],34:[function(require,module,exports){
/* global Backbone, $, _ */

var META = {
    MorningMeds  : { className: "morning-meds"  , label: "common.morning" },
    NoonMeds     : { className: "noon-meds"     , label: "common.noon"    },
    EveningMeds  : { className: "evening-meds"  , label: "common.evening" },
    BedtimeMeds  : { className: "bedtime-meds"  , label: "common.bedtime" },
    WeeklyMeds   : { className: "weekly-meds"   , label: "common.weekly"  },
    AsNeededMeds : { className: "as-needed-meds", label: "common.AsNeeded"}
};

var templates = {

    reportBox: _.template([
        '<h4>',
        '<label>Did you take it</label>',
        '<span data-translatecontent="<%-data.label%>"></span>',
        '</h4>',
        '<div class="report-box-meds"/>'
    ].join(""), { variable: "data" }),

    med: _.template([
        '<div class="med-image" style="background-image:url(\'<%-data.image%>\')"/>',
        '<div class="btn-group">',
        '  <button class="yes active">Yes</button>',
        '  <button class="no">No</button>',
        '</div>' +
        '<h5><%-data.name%></h5>',
        '<b class="btn-half<%=data.qty === 1 ? "" : " accent"%>">',
        '<%-data.qty === 0 ? "As Needed" : data.qty%>',
        '</b>',
        '<div style="clear:both"/>',
        '<textarea placeholder="Tell us why you didn\'t take it (optional)"/>'
    ].join(""), { variable: "data" })

};

var MedModel = require("../models/MedModel.js").extend({
    idAttribute: "rxnorm",
    defaults: {
        rxnorm : null,
        name   : "",
        qty    : 0,
        dosage : "",
        image  : "",
        answer : null,
        message: null
    }
});

var MedCollection = Backbone.Collection.extend({
    model: MedModel
});

var MedView = Backbone.View.extend({
    className: "report-med",

    events: function() {
        var out = {
                "input textarea": "comment"
            },
            mousedown = "ontouchstart" in document ? "touchstart" : "mousedown";

        out[mousedown + " .btn-group button"] = "answer";
        return out;
    },

    initialize: function() {
        this.listenTo(this.model, "change:answer" , this.onChangeAnswer);
        this.listenTo(this.model, "change:message", this.onChangeMessage);
    },

    render: function() {
        this.$el.html(templates.med(this.model.toJSON()));
        var view = this, model = this.model;
        this.model.onReady(function() {
            // console.log(arguments);
            view.renderImage(model.image);
        });
        return this;
    },

    renderImage : function() {
        this.$el.find(".med-image").css({
            backgroundImage : "url('" + this.model.get("image") + "')"
        });
    },

    onChangeAnswer: function(model, answer) {
        this.$el.toggleClass("yes", answer == "yes")
                .toggleClass("no", answer == "no");
        if (answer == "yes") {
            this.model.set("message", "");
        }
    },

    onChangeMessage: function(model, message) {
        this.$el.find("textarea").val(message);
    },

    answer: function(e) {
        e.preventDefault();
        var result = $(e.target).closest("button").is(".yes") ? "yes" : "no";
        this.model.set("answer", result);
    },

    comment: function(e) {
        this.model.set("message", $.trim($(e.target).val()), { silent: true });
    }
});

var MedGroupView = Backbone.View.extend({

    /**
     * Obtains the className of the box using the META data
     * @return {String} The calssName to set
     */
    className: function() {
        var className = "report-box";
        var meta = META[this.model.label];
        if (meta) {
            className += " " + meta.className;
        }
        return className;
    },

    /**
     * Renders the box and fills it with MedViews
     * @return {MedGroupView} Returns the instance
     */
    render: function() {
        this.$el.html(templates.reportBox({
            label: META[this.model.label].label
        }));
        this.medsContainer = this.$el.find(".report-box-meds");
        this.model.meds.each(this.addOne, this);
        return this;
    },

    /**
     * Appends one MedView to the box
     * @param  {MedModel} model
     * @return {MedView}  Returns the appended view
     */
    addOne: function(model) {
        var view = new MedView({ model: model });
        this.medsContainer.append(view.render().el);
        return view;
    }
});

var ReportView = Backbone.View.extend({

    /**
     * Uses only the non-empty parts of the model to create normalized
     * med collections.
     * @constructor
     */
    initialize: function() {
        // console.log(this.model);
        this.collections = {};
        _.each(this.model, function(group, label) {
            if (group.length) {
                var collection = this.normalizeMeds(group);
                this.collections[label] = collection;
                this.listenTo(collection, "change:answer", this.logAnswers);
            }
        }, this);
    },

    /**
     * Whenever an yes/no answer is given, check if all of the questions are
     * answered and enable the submit button if they are.
     * @return {void}
     */
    logAnswers: function() {
        var canSubmit = !_.some(this.collections, function(collection) {
            return collection.some(function(model) {
                return model.get("answer") === null;
            });
        }, this);
        this.$el.closest(".modal-body").find(".btn-primary").prop(
            "disabled",
            !canSubmit
        );
    },

    /**
     * Converts the array of objects to MedCollection.
     * Groups the meds by rxnorm and sums the qty.
     * @param  {Array} inputMeds
     * @return {MedCollection}
     */
    normalizeMeds: function(inputMeds) {
        var byId = _.groupBy(inputMeds, "rxnorm");
        _.each(byId, function(meds, id) {
            byId[id] = _.reduce(meds, function(memo, m) {
                memo.qty += m.qty;
                return memo;
            }, $.extend({}, meds[0], { qty: 0 }));
        });
        return new MedCollection(_.toArray(byId));
    },

    /**
     * Renders the entire report view
     * @return {ReportView} Returns the instance
     */
    render: function() {
        this.$el.empty();
        _.each(this.collections, this.renderGroup, this);
        return this;
    },

    renderGroup: function(data, label) {
        var model = {
            meds : data,
            label: label
        };

        this.$el.append(
            new MedGroupView({ model: model }).render().el
        );
    },

    export: function() {
        var json = [];

        _.each(this.collections, function(c, name) {
            json = json.concat(_.map(c.models, function(model) {
                var out = _.omit(model.toJSON(), "image");
                out.target = name;
                return out;
            }));
        });

        return json;
    }

});

module.exports = ReportView;

},{"../models/MedModel.js":13}],35:[function(require,module,exports){
var PillBin = require("./PillBin.js");
var MedView = require("./MedView.js");

var TrashView = PillBin.extend({
    collection : App.collections.DeletedMeds,
    modelView  : MedView,
    className  : "pillbox-trash",
    initialize : function() {
        PillBin.prototype.initialize.apply(this, arguments);
        this.listenTo(this.collection, "add", this.onDelete);
    },

    onDragOver : function(e) {
        if (!App.DRAGGED_MODEL ||
            App.DRAGGED_MODEL.collection === App.collections.AllMeds) {
            return true;
        }
        e.preventDefault(); // allow drop
        this.$el.addClass("drag-over");
    },
    onDelete : function() {
        var msg = this.$el.find(".deleted-msg").trigger("customcontent");
        msg.addClass("visible");
        setTimeout(function() {
            msg.removeClass("visible");
        }, 1000);
    },
    render : function() {
        PillBin.prototype.render.call(this);
        this.$el.append('<div class="deleted-msg" data-translatecontent="common.item_deleted"/>');
        return this;
    }
});

module.exports = TrashView;

},{"./MedView.js":26,"./PillBin.js":32}],36:[function(require,module,exports){
var PillBin = require("./PillBin.js");

var WeeklyPillBin = PillBin.extend({

    className : "pillbox-container weekly-meds",

    collection: App.collections.WeeklyMeds,

    render : function() {
        PillBin.prototype.render.call(this);
        this.$el.prepend(
            '<div class="pillbox-container-title" data-translatecontent="common.weekly"/>'
        ).trigger("customcontent");
        return this;
    },

    initialize : function() {
        PillBin.prototype.initialize.apply(this, arguments);
        this.listenTo(this.collection, "add reset remove", this.equalize);
        this.$el.on("resize", _.bind(this.equalize, this));
    }
});

module.exports = WeeklyPillBin;

},{"./PillBin.js":32}],37:[function(require,module,exports){
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

},{}],38:[function(require,module,exports){
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

},{}]},{},[12]);
