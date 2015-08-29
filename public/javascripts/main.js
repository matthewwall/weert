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
var svg;
var linechart;
var overview;

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

var readyPlot = function (callback) {

    // The DOM has to be ready before we can select the SVG area.
    document.addEventListener("DOMContentLoaded", function (event) {

        svg = d3.select("#chartarea")
            .attr("width", 960)
            .attr("height", 500);

        linechart = new Timeplot(svg, {
            margins: {top: 10, right: 10, bottom: 100, left: 40},
            y      : {ticks: 5, text: "Temperature"}
        });
        overview = new Timeplot(svg, {
            margins: {top: 430, right: 10, bottom: 20, left: 40},
            y      : {ticks: 1, text: ""}
        });

        // Add a brush to the overview:
        overview.addBrush(function (brush) {
            linechart.set_x_domain(brush.empty() ? undefined : brush.extent());
        });

        // Show the y-value on mouseover in the big chart:
        linechart.addMouseover();

        // Signal that we are ready
        callback(null);
    });
};

var updatePlot = function (err) {
    if (err) throw err;
    linechart.data(dataset);
    overview.data(dataset);
    linechart.render();
    overview.render();

    socket.on('packet', function (packet) {
        console.log("Client got packet", new Date(packet.dateTime));
        dataset.push(packet);
        linechart.render();
        overview.render();
    });
};

// We can get the initial data while we get the plot ready, but both have to be done
// before we can actually update the plot:
async.parallel([getInitialData, readyPlot], updatePlot);
