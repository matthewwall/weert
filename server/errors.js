// Set of exception classes

function NoSuchIDError(msg) {
    self.message = msg;
}
NoSuchIDError.prototype = Object.create(Error.prototype);

function DuplicateNameError(msg) {
    self.message = msg;
}
DuplicateNameError.prototype = Object.create(Error.prototype);

module.exports = {
    NoSuchIDError     : NoSuchIDError,
    DuplicateNameError: DuplicateNameError
};