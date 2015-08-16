var total_width = 1000,
    total_height = 600;

var svg = d3.select("#lineChart")
    .attr("width", total_width)
    .attr("height", total_height);

var linechart = new Timeplot(svg);


var plotdata = [
{"barometer" : 30.024, "outHumidity" : 59, "dateTime" : 1439594160, "outTemp" : 71.4, "inTemp" : 76.5, "usUnits" : 1 },
{"barometer" : 30.024, "outHumidity" : 59, "dateTime" : 1439594162, "outTemp" : 71.4, "inTemp" : 76.5, "usUnits" : 1 },
{"barometer" : 30.024, "outHumidity" : 59, "dateTime" : 1439594164, "outTemp" : 71.4, "inTemp" : 76.5, "usUnits" : 1 },
{"barometer" : 30.024, "outHumidity" : 59, "dateTime" : 1439594166, "outTemp" : 71.4, "inTemp" : 76.5, "usUnits" : 1 },
{"barometer" : 30.024, "outHumidity" : 59, "dateTime" : 1439594168, "outTemp" : 71.4, "inTemp" : 76.5, "usUnits" : 1 },
{"barometer" : 30.024, "outHumidity" : 60, "dateTime" : 1439594170, "outTemp" : 71.4, "inTemp" : 76.5, "usUnits" : 1 },
{"barometer" : 30.024, "outHumidity" : 60, "dateTime" : 1439594172, "outTemp" : 71.3, "inTemp" : 76.5, "usUnits" : 1 },
{"barometer" : 30.024, "outHumidity" : 60, "dateTime" : 1439594174, "outTemp" : 71.3, "inTemp" : 76.5, "usUnits" : 1 },
{"barometer" : 30.024, "outHumidity" : 60, "dateTime" : 1439594176, "outTemp" : 71.3, "inTemp" : 76.5, "usUnits" : 1 },
{"barometer" : 30.024, "outHumidity" : 60, "dateTime" : 1439594178, "outTemp" : 71.3, "inTemp" : 76.5, "usUnits" : 1 },
{"barometer" : 30.024, "outHumidity" : 60, "dateTime" : 1439594180, "outTemp" : 71.3, "inTemp" : 76.5, "usUnits" : 1 }
];

linechart.update_data(plotdata);

// Construct the websocket url back to the original host
var ws_url = "ws://" + window.location.host;

// Open up a websocket:
var socket = io(ws_url);

socket.on('news', function (data) {
    console.log(data);
});

socket.on('packet', function (packet) {
    console.log("Got packet", packet);
    dataset.push(packet);
    plot(dataset);
});

