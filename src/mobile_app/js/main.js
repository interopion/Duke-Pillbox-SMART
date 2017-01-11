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
