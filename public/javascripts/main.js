var double_plot = (function () {

    dataset = [];

    var total_width = 960,
        total_height = 500,
        margin_1 = {top: 10, right: 10, bottom: 100, left: 40},
        margin_2 = {top: 430, right: 10, bottom: 30, left: 40},
        width_1 = total_width - margin_1.left - margin_1.right,
        width_2 = total_width - margin_2.left - margin_2.right,
        height_1 = total_height - margin_1.top - margin_1.bottom,
        height_2 = total_height - margin_2.top - margin_2.bottom;

    // Suffixes with _1 are the top plot; _2 are the bottom plot

    // Set the x and y scaling
    var xScale_1 = d3.time.scale()
        .range([0, width_1]);
    var xScale_2 = d3.time.scale()
        .range([0, width_2]);
    var yScale_1 = d3.scale.linear()
        .range([height_1, 0]);
    var yScale_2 = d3.scale.linear()
        .range([height_2, 0]);

    // Define the x axes
    var xAxis_1 = d3.svg.axis()
        .scale(xScale_1)
        .orient("bottom")
        .ticks(d3.time.minute, 5);
    var xAxis_2 = d3.svg.axis()
        .scale(xScale_2)
        .orient("bottom")
        .ticks(d3.time.minute, 5);

    // Only the top plot has a Y axis
    var yAxis_1 = d3.svg.axis()
        .scale(yScale_1)
        .orient("left");

    // Include a brush in the bottom plot
    //var brush = d3.svg.brush()
    //    .x(xScale_2)
    //    .on("brush", brushed);

    // Define the plot line for top and bottom plots
    var line_1 = d3.svg.line()
        .x(function (d) {
            return xScale_1(d.dateTime);
        })
        .y(function (d) {
            return yScale_1(d.outTemp);
        });
    var line_2 = d3.svg.line()
        .x(function (d) {
            return xScale_2(d.dateTime);
        })
        .y(function (d) {
            return yScale_2(d.outTemp);
        });

    // Now select the area where the charts will go in.
    var svg = d3.select("#lineChart")
        .attr("width", total_width)
        .attr("height", total_height)
        .append("g")
        .attr("transform", "translate(" + margin_1.left + "," + margin_1.top + ")");

    // Define a clipping rectangle for the upper plot
    svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width_1)
        .attr("height", height_1);

    // This group will hold the top ("focus") plot. Make sure it honors the clipping rectangle
    var focus = svg.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin_1.left + "," + margin_1.top + ")")
        .attr("clip-path", "url(#clip)");

    // This group will hold the bottom ("context") plot.
    var context = svg.append("g")
        .attr("class", "context")
        .attr("transform", "translate(" + margin_2.left + "," + margin_2.top + ")");

    // Position the top x-axis
    svg.append("g")
        .attr("class", "axis")
        .attr("id", "x-axis-1")
        .attr("transform", "translate(0," + height_1 + ")");

    // Position the bottom x-axis
    svg.append("g")
        .attr("class", "axis")
        .attr("id", "x-axis-2")
        .attr("transform", "translate(0," + (total_height - margin_2.bottom) + ")");

    // Position the top y-axis
    svg.append("g")
        .attr("class", "axis")
        .attr("id", "y-axis")
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Temperature");

    var data = function(data){
        dataset = data;
    };

    var update_data = function (newdata) {
        if (newdata.constructor === Array) {
            dataset.concat(newdata);
        } else {
            dataset.push(newdata);
        }

        // Update the scales
        xScale_1.domain(d3.extent(dataset, function (d) {
            return d.dateTime;
        }));
        xScale_2.domain(d3.extent(dataset, function (d) {
            return d.dateTime;
        }));
        yScale_1.domain(d3.extent(dataset, function (d) {
            return d.outTemp;
        }));

        //Update X axes
        svg.select("#x-axis-1")
            .transition()
            .duration(300)
            .call(xAxis_1);

        svg.select("#x-axis-2")
            .transition()
            .duration(300)
            .call(xAxis_2);

        //Update Y axis
        svg.select("#y-axis")
            .transition()
            .duration(300)
            .call(yAxis_1);

        // Find the path for the top line
        var paths = svg.selectAll("path#line_1")
            .data([dataset]);

        paths
            .enter()
            .append("path")
            .attr("class", "line")
            .attr("id", "line_1")
            .attr('d', line_1);

        paths
            .attr('d', line_1);

        paths
            .exit()
            .remove();
    };

    return {
        svg : svg,
        data : data,
        update_data : update_data
    }
}());


// Construct the websocket url back to the original host
var ws_url = "ws://" + window.location.host;

// Open up a websocket:
var socket = io(ws_url);

socket.on('news', function (data) {
    console.log(data);
    socket.emit('my other event', {my: 'data'});
});

socket.on('packet', function (packet) {
    console.log("Got packet", packet);
    dataset.push(packet);
    plot(dataset);
});

