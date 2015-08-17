
document.addEventListener("DOMContentLoaded", function (event) {

    var total_width = 1000,
        total_height = 600;

    var svg = d3.select("#lineChart")
        .attr("width", total_width)
        .attr("height", total_height);

    var linechart = new Timeplot(svg);

// Construct the websocket url back to the original host
    var ws_url = "ws://" + window.location.host;

// Open up a websocket:
    var socket = io(ws_url);

    socket.on('news', function (data) {
        console.log(data);
    });

    socket.on('packet', function (packet) {
        packet.dateTime *= 1000;
        console.log("Got packet", packet);
        linechart.update_data(packet);
    });

});
