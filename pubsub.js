/*
 * Uber-simple pub-sub for sending messages between Node modules.
 */
var pubsub = (function () {

    var channels = {};

    var subscribe = function (channel, callback) {
        console.log("new client subscribed to channel ", channel, "with callback ", callback);
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
            for (i = 0; i < callback_list[channel].length; i++) {
                if (channels[channel][i] === callback) {
                    channels[channel].splice(channels[channel][i], 1);
                    if (!channels[channel].length) {
                        delete channels[channel]
                    }
                    return
                }
            }
        }
    };

    var publish = function (channel, msg) {
        if (channels[channel]) {
            var callback_list = channels[channel];
            for (i = 0; i < callback_list.length; i++) {
                console.log("i=", i, "msg=", msg);
                callback_list[i].apply(this, [msg]);
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
