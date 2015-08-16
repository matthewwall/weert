d3 = require('d3');

var timeplot = (function (svg, options) {

    // the dataset to be plotted
    var dataset = [];

    var total_width = options.width || 960,
        total_height = options.height || 500,
        margin = options.margin || {top: 10, right: 10, bottom: 100, left: 40},
        width = total_width - margin.left - margin.right,
        height = total_height - margin.top - margin.bottom;

    // Set the x and y scaling
    var xScale = d3.time.scale()
        .range([0, width]);
    var yScale = d3.scale.linear()
        .range([height, 0]);

    // Define the x & y axes
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient("bottom")
        .ticks(d3.time.minute, 5);

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left");

    // Include a brush in the bottom plot
    //var brush = d3.svg.brush()
    //    .x(xScale_2)
    //    .on("brush", brushed);

    // Define the plot line
    var line = d3.svg.line()
        .x(function (d) {
            return xScale(d.dateTime);
        })
        .y(function (d) {
            return yScale(d.outTemp);
        });

    // Define a clipping rectangle for the plot
    svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

    // Create a group which will hold the axes and plot. Include the clipping rectangle.
    svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .attr("clip-path", "url(#clip)");

    // Position the top x-axis
    svg.append("g")
        .attr("class", "axis")
        .attr("id", "x-axis-1")
        .attr("transform", "translate(0," + height + ")");

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

    var data = function (data) {
        dataset = data;
    };

    var update_data = function (newdata) {
        if (newdata.constructor === Array) {
            dataset.concat(newdata);
        } else {
            dataset.push(newdata);
        }

        // Update the scales
        xScale.domain(d3.extent(dataset, function (d) {
            return d.dateTime;
        }));
        yScale.domain(d3.extent(dataset, function (d) {
            return d.outTemp;
        }));

        //Update axes
        svg.select("#x-axis")
            .transition()
            .duration(300)
            .call(xAxis);
        svg.select("#y-axis")
            .transition()
            .duration(300)
            .call(yAxis);

        // Find the path for the plot line
        var paths = svg.selectAll("path#plotline")
            .data([dataset]);

        paths
            .enter()
            .append("path")
            .attr("class", "line")
            .attr("id", "plotline")
            .attr('d', line);

        paths
            .attr('d', line);

        paths
            .exit()
            .remove();
    };

    return {
        data : data,
        update_data : update_data
    }


}());

module.exports = timeplot;
