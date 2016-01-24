/*
 * Copyright (c) 2016 Tom Keffer <tkeffer@gmail.com>
 *
 *  See the file LICENSE for your full rights.
 */

"use strict";

// Set of exception classes

function NoSuchIDError(msg) {
    this.message = msg;
}
NoSuchIDError.prototype = Object.create(Error.prototype);

function DuplicateNameError(msg) {
    this.message = msg;
}
DuplicateNameError.prototype = Object.create(Error.prototype);

module.exports = {
    NoSuchIDError     : NoSuchIDError,
    DuplicateNameError: DuplicateNameError
};