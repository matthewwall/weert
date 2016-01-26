/*
 * Copyright (c) 2016 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

// Set of exception classes

// Ridiculously complicated inheritance, I know.
// See http://goo.gl/Egw9qR for why this is necessary and how it works.

var NoSuchIDError = function(msg) {
    var err = Error.call(this, msg);
    err.name = "NoSuchIDError";
    return err;
};

NoSuchIDError.prototype = Object.create(Error.prototype, {
    constructor: { value: NoSuchIDError }
});

var DuplicateNameError = function(msg) {
    var err = Error.call(this, msg);
    err.name = "DuplicateNameError";
    return err;
};

DuplicateNameError.prototype = Object.create(Error.prototype, {
    constructor: { value: DuplicateNameError }
});

module.exports = {
    NoSuchIDError     : NoSuchIDError,
    DuplicateNameError: DuplicateNameError
};