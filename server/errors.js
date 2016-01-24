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