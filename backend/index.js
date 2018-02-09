var fs   = require("fs");
var http = require("http");
var url  = require('url');
var cfg  = require("./config.json");
var routes;

function sendError(response, code, msg) {
    response.writeHead(code || 500);
    response.end(JSON.stringify({ code : code, message : msg }));
}

function enableCORS(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
}

function prependZero(n) {
    return n < 10 ? "0" + n : n;
}

function backup(path, cb) {
    var name = path.substr(path.lastIndexOf("/") + 1),
        now  = new Date();

    name = name.replace(".", "." + [
        now.getFullYear(),
        prependZero(now.getMonth() + 1),
        prependZero(now.getDate()) + "_" +
        prependZero(now.getHours()),
        prependZero(now.getMinutes()),
        prependZero(now.getSeconds())
    ].join("-") + "." );

    fs.readFile(path, function(err, data) {
        if (err) {
            return cb(err);
        }
        fs.writeFile(cfg.backupsDir + "/" + name, data, cb);
    });
}

function writeJSON(path, json, cb) {
    if (path == cfg.languagesPath || path == cfg.translationsPath) {
        backup(path, function(err) {
            if (err) {
                return cb(err);
            }
            try {
                json = JSON.stringify(json, null, 4);
            } catch (ex) {
                return cb(ex);
            }
            fs.writeFile(path, json, function(error) {
                cb(error, json);
            });
        });
    } else {
        try {
            json = JSON.stringify(json, null, 4);
        } catch (ex) {
            return cb(ex);
        }
        fs.writeFile(path, json, function(err) {
            cb(err, json);
        });
    }
}

function readJSON(path, cb) {
    fs.readFile(path, function(err, data) {
        if (err) {
            return cb(err);
        }
        try {
            data = JSON.parse(data);
        } catch (ex) {
            return cb(ex);
        }
        cb(null, data);
    });
}

function readPOST(req, cb) {
    var body = '';

    req.on('data', function (data) {
        body += data;
        if (body.length > 1e6) {// Too much POST data, kill the connection!
            req.connection.destroy();
        }
    });

    req.on('end', function() {
        cb(null, body);
    });
}

function readPostJson(req, cb) {
    readPOST(req, function(err, json) {
        if (err) {
            return cb(err);
        }
        try {
            json = JSON.parse(json);
        } catch(ex) {
            return cb(err);
        }
        cb(null, json);
    });
}

function writeLanguages(json, cb) {
    writeJSON(cfg.languagesPath, json, cb);
}

function writeTranslations(json, cb) {
    writeJSON(cfg.translationsPath, json, cb);
}

function readLanguages(cb) {
    readJSON(cfg.languagesPath, cb);
}

function readTranslations(cb) {
    readJSON(cfg.translationsPath, cb);
}

function readJS(cb) {
    readLanguages(function(err, langs) {
        if (err) {
            return cb(err);
        }
        readTranslations(function(error, translations) {
            if (error) {
                return cb(error);
            }
            var js = [
                'App.localize(',
                JSON.stringify(langs),
                ",",
                JSON.stringify(translations),
                ");"
            ].join("");
            cb(null, js);
        });
    });
}

function requireAuth(req, res, cb) {
    var creadentials = String(req.headers.authorization || "").replace(/^basic\s+/i, "");
    if (creadentials) {
        creadentials = new Buffer(creadentials, 'base64').toString().split(":");
        if (creadentials[0] == cfg.username && creadentials[1] == cfg.password) {
            return cb();
        }
    }

    res.writeHead(401, "Not Authorized", { "WWW-Authenticate": 'Basic' });
    res.end("Please login...");
}

function sanitizeMrnAsFileName(mrn) {
    mrn = String(mrn || "").trim();
    if (!mrn) {
        throw new Error("Missing MRN");
    }
    if (mrn.length > 255) {
        throw new Error("Invalid MRN (too long)");
    }
    if ((/[^0-9A-Za-z\.\-_ ]/).test(mrn)) {
        throw new Error(
            'Invalid MRN. Only numbers, letters, spaces and the characters ' +
            '"-", "_" and "." are allowed.'
        );
    }
    return mrn;
}

routes = {
    GET : {
        "/" : function(req, res) {
            var reqUrl = url.parse(req.url, true),
                query  = reqUrl.query,
                mrn    = query.mrn,
                path   = cfg.dataDir + "/" + mrn + ".json";

            try {
                mrn = sanitizeMrnAsFileName(mrn);
            }
            catch(ex) {
                console.log(ex);
                return sendError(res, 400, ex.toString());
            }

            return readJSON(path, function(err, data) {
                if (err) {
                    console.error(err);
                    return sendError(res, 404, 'Error loading ' + mrn + '.json');
                }
                res.writeHead(200);
                res.end(JSON.stringify(data));
            });
        },
        "/languages" : function(req, res) {
            readLanguages(function(err, langs) {
                if (err) {
                    return sendError(res, 500, String(err));
                }
                res.end(JSON.stringify(langs, null, 4));
            });
        },
        "/translations" : function(req, res) {
            readTranslations(function(err, translations) {
                if (err) {
                    return sendError(res, 500, String(err));
                }
                res.end(JSON.stringify(translations, null, 4));
            });
        },
        "/translations.js" : function(req, res) {
            readJS(function(err, js) {
                if (err) {
                    return sendError(res, 500, String(err));
                }
                res.setHeader('Content-Type', "text/javascript; charset=UTF-8");
                res.end(js);
            });
        },
        "/translate.html" : function(req, res) {
            requireAuth(req, res, function() {
                fs.readFile("./translate.html", function(err, data) {
                    if (err) {
                        return sendError(res, 500, String(err));
                    }
                    res.setHeader('Content-Type', "text/html; charset=UTF-8");
                    res.end(data);
                });
                return;
            });
        },
        "/libs.js" : function(req, res) {
            fs.readFile("./libs.js", function(err, data) {
                if (err) {
                    return sendError(res, 500, String(err));
                }
                res.setHeader('Content-Type', "text/javascript; charset=UTF-8");
                res.end(data);
            });
        },
        "/config.xml" : function(req, res) {
            requireAuth(req, res, function() {
                fs.readFile("../desktop_app/config.xml", function(err, data) {
                    if (err) {
                        return sendError(res, 500, String(err));
                    }
                    res.setHeader('Content-Type', "text/xml; charset=UTF-8");
                    res.end(data);
                });
            });
        }
    },
    POST : {
        "/" : function(req, res) {
            var reqUrl = url.parse(req.url, true),
                query  = reqUrl.query,
                mrn    = query.mrn,
                path   = cfg.dataDir + "/" + mrn + ".json";

            try {
                mrn = sanitizeMrnAsFileName(mrn);
            }
            catch(ex) {
                return sendError(res, 400, ex.toString());
            }

            readPostJson(req, function(_, post) {
                readJSON(path, function(error, current) {
                    if (error) {
                        console.error(error);
                        current = { time : 0, requestNumber : 0 };
                    }

                    do {
                        // ignore the write if the client does not send "time"
                        if (!post.time) {
                            break;
                        }

                        // ignore the write if the client time is before the last saved time
                        if (current.time && current.time > post.time) {
                            break;
                        }

                        // if the times are equal (very fast double click), the
                        // look for a "requestNumber" properties and compare them
                        if (current.time == post.time) {
                            if (!post.requestNumber || !current.requestNumber) {
                                break;
                            }
                            if(current.requestNumber >= post.requestNumber) {
                                break;
                            }
                        }

                        // if every check above is false write the json to the file
                        // and respond when done
                        writeJSON(path, post, function(err) {
                            if (err) {
                                console.error(err);
                                return sendError(res, 400, 'Error writing ' + mrn + '.json');
                            }
                            res.end(JSON.stringify(post, null, 4));
                        });
                        return;
                    } while(1);

                    // Something went wrong - don't write to file but still return
                    // the received json
                    res.end(JSON.stringify(post, null, 4));
                });
            });
        },
        "/languages" : function(req, res) {
            readPostJson(req, function(err, json) {
                if (err) {
                    return sendError(res, 500, String(err));
                }
                writeLanguages(json, function(error) {
                    if (error) {
                        return sendError(res, 500, String(error));
                    }
                    routes.GET["/languages"](req, res);
                });
            });
        },
        "/translations" : function(req, res) {
            readPostJson(req, function(err, json) {
                if (err) {
                    return sendError(res, 500, String(err));
                }
                writeTranslations(json, function(error) {
                    if (error) {
                        return sendError(res, 500, String(error));
                    }
                    routes.GET["/translations"](req, res);
                });
            });
        },
        "/translations.js" : function(req, res) {
            readPostJson(req, function(err, json) {
                if (err) {
                    return sendError(res, 500, String(err));
                }
                writeTranslations(json.translations, function(writeTranslationsError) {
                    if (writeTranslationsError) {
                        return sendError(res, 500, String(writeTranslationsError));
                    }
                    writeLanguages(json.locales, function(writeLanguagesError) {
                        if (writeLanguagesError) {
                            return sendError(res, 500, String(writeLanguagesError));
                        }
                        res.end(JSON.stringify(json, null, 4));
                        //routes.GET["/translations.js"](req, res);
                    });
                });
            });
        },
        "/feedback": function(req, res) {
            readPostJson(req, function(err, json) {
                if (err) {
                    return sendError(res, 500, String(err));
                }
                setTimeout(function() {
                    res.end(JSON.stringify(json, null, 4));
                }, 1000);
            });
        },
        "/report": function(req, res) {
            readPostJson(req, function(err, json) {
                if (err) {
                    return sendError(res, 500, String(err));
                }
                setTimeout(function() {
                    res.end(JSON.stringify(json, null, 4));
                }, 1000);
            });
        }
    }
};

http.createServer(function(req, res) {
    enableCORS(req, res);

    res.setHeader('Content-Type', "application/json; charset=UTF-8");

    if (req.method == "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
    }

    var reqUrl = url.parse(req.url);

    if (!routes[req.method] || !routes[req.method][reqUrl.pathname]) {
        return sendError(res, 404, "Not Found");
    }

    routes[req.method][reqUrl.pathname](req, res);
}).listen(cfg.port, cfg.host, function() {
    console.log("Server listening at %s:%s", cfg.host, cfg.port);
});
