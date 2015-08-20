/*
 *               CLIENT CODE
 */

// Construct and open up a websocket back to the original host
var ws_url = "ws://" + window.location.host;
var socket = io(ws_url);

socket.on('news', function (data) {
    console.log("News from the server:", data.hello);
});

var dataset = [];

var getInitialData = function (callback) {
    // Tell the server to send up to 60 minutes worth of data.
    var stop = +new Date();
    var start = stop - 60 * 60 * 1000;
    // Use a simple GET request
    var url = "http://" + window.location.host + "/api/loop?start=" + start + "&stop=" + stop;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState === 4) {
            if (xmlhttp.status === 200) {
                dataset = JSON.parse(xmlhttp.responseText);
                console.log(dataset.length, "packets retrieved from the MongoDB database.");
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
var overview;
var brush;

var readyPlot = function (callback) {

    // The DOM has to be ready before we can select the SVG area.
    document.addEventListener("DOMContentLoaded", function (event) {

        svg = d3.select("#linechart")
            .attr("width", 960)
            .attr("height", 500);

        linechart = new Timeplot(svg, {
            margins: {top: 10, right: 10, bottom: 100, left: 40}
        });
        overview = new Timeplot(svg, {
            margins: {top: 430, right: 10, bottom: 20, left: 40},
            y      : {ticks: 1, text : ""}
        });

        // Add a brush to the overview:
        brush = overview.add_brush(function () {
            var new_domain = brush.empty() ? overview.domain() : brush.extent();
            linechart.domain(new_domain);
        });
        // Signal that we are ready
        callback(null);
    });
};

var updatePlot = function (err) {
    linechart.render(dataset);
    overview.render(dataset);

    socket.on('packet', function (packet) {
        //console.log("Got packet", packet);
        dataset.push(packet);
        linechart.render(dataset);
        overview.render(dataset);
    });
};

// We can get the initial data while we get the plot ready, but both have to be done
// before we can actually update the plot:
async.parallel([getInitialData, readyPlot], updatePlot);
