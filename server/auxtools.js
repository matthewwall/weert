/*
 * Copyright (c) 2015 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

var url          = require('url');
var normalizeUrl = require('normalize-url');

var resourcePath = function (req, name) {
    "use strict";
    var base_pathname = url.parse(req.originalUrl).pathname;
    var fullpath      = url.format({
        protocol: req.protocol,
        host    : req.get('host'),
        pathname: base_pathname + '/' + name
    });
    return normalizeUrl(fullpath);
};

var fromError = function (code, err) {
    "use strict";
    var e     = {};
    e.message = err.message;
    e.code    = code;
    if (err.description) {
        e.description = err.description;
    }
    return e;
};

module.exports = {
    resourcePath: resourcePath,
    fromError   : fromError
};
