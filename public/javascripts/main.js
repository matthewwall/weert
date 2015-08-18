/*
 *               CLIENT CODE
 */

// Construct and open up a websocket back to the original host
var ws_url = "ws://" + window.location.host;
var socket = io(ws_url);

socket.on('news', function (data) {
    console.log(data);
});

var initialData = [];

var getInitialData = function (callback) {
    // Tell the server to send 10 minutes worth of data.
    var stop = +new Date();
    var start = stop - 10 * 60 * 1000;
    // Use a simple GET request
    var url = "http://" + window.location.host + "/api/loop?start=" + start + "&stop=" + stop;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState === 4) {
            if (xmlhttp.status === 200) {
                initialData = JSON.parse(xmlhttp.responseText);
                console.log(initialData.length, "packets retrieved.");
                return callback(null);
            } else {
                console.log("Unable to retrieve initial dataset. Status=", xmlhttp.status);
                // For whatever reason, the server is unable to satisfy the request. That's OK, we don't
                // absolutely need the initial dataset, so just return.
                return callback(null);
            }
        }
    };
    xmlhttp.open("GET", url, true);
    xmlhttp.send();
};

var svg;
var linechart;

var readyPlot = function (callback) {
    document.addEventListener("DOMContentLoaded", function (event) {

        var total_width = 1000,
            total_height = 600;

        svg = d3.select("#lineChart")
            .attr("width", total_width)
            .attr("height", total_height);

        linechart = new Timeplot(svg);
        callback(null);

    });
};

var updatePlot = function (err) {
    linechart.update_data(initialData);

    socket.on('packet', function (packet) {
        console.log("Got packet", packet);
        linechart.update_data(packet);
    });

};

async.parallel([
    getInitialData,
    readyPlot
    ],
    updatePlot);
