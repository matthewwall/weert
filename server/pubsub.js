/*
 * Uber-simple pub-sub for sending messages between Node modules.
 */
var pubsub = (function () {

    var channels = {};

    var subscribe = function (channel, callback) {
        if (!channels[channel]) {
            channels[channel] = [];
        }
        channels[channel].push(callback);
        unsubscribe_handle = [channel, callback];
        return unsubscribe_handle;
    };

    var unsubscribe = function (unsubscribe_handle) {
        channel = unsubscribe_handle[0];
        callback = unsubscribe_handle[1];

        if (channels[channel]) {
            for (i = 0; i < channels[channel].length; i++) {
                if (channels[channel][i] === callback) {
                    channels[channel].splice(channels[channel][i], 1);
                    N = channels[channel].length;
                    if (!N) {
                        delete channels[channel]
                    }
                    return N
                }
            }
        }
    };

    var publish = function (channel, msg, self) {
        if (channels[channel]) {
            for (i = 0; i < channels[channel].length; i++) {
                channels[channel][i].apply(self, [msg]);
            }
        }
    };

    return {
        subscribe  : subscribe,
        unsubscribe: unsubscribe,
        publish    : publish
    };
}());

module.exports = pubsub;
