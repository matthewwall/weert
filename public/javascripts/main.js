/*
 *               CLIENT CODE
 */

// Initial request of data from MongoDB in seconds
var max_initial_age_secs = 300;
// Max retained age in seconds:
var max_age_secs = 3600;

var dataset = [];
var console_template;
var windcompass;
var charts;

var chartOptions = [
    {
        obstype: "windSpeed",
        element: "#windSpeed-chart",
        margins: {top: 10, right: 10, bottom: 20, left: 40},
        width  : 500,
        height : 300,
        y      : {ticks: 5, text: "Wind speed"}
    }, {
        obstype: "outTemp",
        element: "#outTemp-chart",
        margins: {top: 10, right: 10, bottom: 20, left: 40},
        width  : 500,
        height : 300,
        y      : {ticks: 5, text: "Temperature"}
    }
];


Handlebars.registerHelper('formatTimeStamp', function (ts) {
    return new Date(ts);
});

Handlebars.registerHelper("formatNumber", function (val, digits) {
    if (val == null) {
        return "N/A"
    } else {
        return val.toFixed(digits);
    }
});
// Construct and open up a websocket back to the original host
var ws_url = "ws://" + window.location.host;
var socket = io(ws_url);

socket.on('news', function (data) {
    console.log("News from the server:", data.hello);
});

var getInitialData = function (callback) {
    // Tell the server to send up to 60 minutes worth of data.
    var stop = Date.now();
    var start = stop - max_initial_age_secs * 1000;
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

        // Compile the console template
        var source = $("#wx-console-template").html();
        console_template = new Handlebars.compile(source);
        // Now render it as a place holder until the first update:
        var html = console_template({});
        $("#wx-console-area").html(html);

        // Include the initial wind compass
        windcompass = new WindCompass();

        // Instantiate the charts
        charts = new StackedPlots(chartOptions);
        charts.addMouseover();

        // Signal that we are ready
        callback(null);
    });
};

var updatePlot = function (err) {
    if (err) throw err;

    charts.data(dataset);
    charts.render();

    socket.on('packet', function (packet) {
        console.log("Client got packet", new Date(packet.dateTime));
        dataset.push(packet);
        // Trim any too-old packets
        var now = Date.now();
        while (dataset[0].dateTime < (now - max_age_secs * 1000)) {
            dataset.shift();
        }

        // Because Handlebars will overwrite the wind compass, we need to
        // first detach it, save it, then reattach later
        var hold = $("#windCompass").detach();
        // Render the Handlebars template showing the current conditions
        var html = console_template(packet);
        $("#wx-console-area").html(html);
        // Now reattach the wind compass
        $("#windCompass").html(hold);

        // Update the wind compass
        windcompass.updateWind([packet.dateTime, packet.windDir, packet.windSpeed]);

        // Update the line charts
        charts.render();
    });
};

// We can get the initial data while we get the plot ready, but both have to be done
// before we can actually update the plot:
async.parallel([getInitialData, readyPlot], updatePlot);
