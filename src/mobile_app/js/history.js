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
