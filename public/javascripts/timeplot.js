var Timeplot = (function () {

    function Timeplot(svg, options) {

        this.svg = svg;
        this.options = options || {};
        // The dataset to be plotted
        this.dataset = [];

        this.total_width = this.options.width || 960;
        this.total_height = this.options.height || 500;
        this.margins = this.options.margins || {top: 10, right: 10, bottom: 100, left: 40};
        this.width = this.total_width - this.margins.left - this.margins.right;
        this.height = this.total_height - this.margins.top - this.margins.bottom;

        // Set the x and y scaling
        this.xScale = d3.time.scale()
            .range([0, this.width]);
        this.yScale = d3.scale.linear()
            .range([this.height, 0]);

        // Define the x & y axes
        this.xAxis = d3.svg.axis()
            .scale(this.xScale)
            .orient("bottom")
            .ticks(d3.time.minute, 5);

        this.yAxis = d3.svg.axis()
            .scale(this.yScale)
            .orient("left");

        // Include a brush in the bottom plot
        //var brush = d3.svg.brush()
        //    .x(xScale_2)
        //    .on("brush", brushed);

        // Define the plot line
        this.line = d3.svg.line()
            .x(function (d) {
                return this.xScale(d.dateTime);
            })
            .y(function (d) {
                return this.yScale(d.outTemp);
            });

        // Define a clipping rectangle for the plot
        this.svg.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", this.width)
            .attr("height", this.height);

        // Create a group which will hold the axes and plot. Include the clipping rectangle.
        this.svg.append("g")
            .attr("transform", "translate(" + this.margins.left + "," + this.margins.top + ")")
            .attr("clip-path", "url(#clip)");

        // Position the top x-axis
        this.svg.append("g")
            .attr("class", "axis")
            .attr("id", "x-axis-1")
            .attr("transform", "translate(0," + this.height + ")");

        // Position the bottom x-axis
        this.svg.append("g")
            .attr("class", "axis")
            .attr("id", "x-axis-2")
            .attr("transform", "translate(0," + (this.total_height - this.bottom) + ")");

        // Position the top y-axis
        this.svg.append("g")
            .attr("class", "axis")
            .attr("id", "y-axis")
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("Temperature");
    }

    Timeplot.prototype.data = function (data) {
        if (data) {
            this.dataset = data;
        }
        return this.dataset;
    };

    Timeplot.prototype.update_data = function (newdata) {
        if (newdata.constructor === Array) {
            this.dataset = this.dataset.concat(newdata);
        } else {
            this.dataset.push(newdata);
        }

        // Update the scales
        this.xScale.domain(d3.extent(this.dataset, function (d) {
            return d.dateTime;
        }));
        this.yScale.domain(d3.extent(this.dataset, function (d) {
            return d.outTemp;
        }));

        //Update axes
        this.svg.select("#x-axis")
            .transition()
            .duration(300)
            .call(this.xAxis);
        this.svg.select("#y-axis")
            .transition()
            .duration(300)
            .call(this.yAxis);

        // Find the path for the plot line
        this.paths = svg.selectAll("path#plotline")
            .data([this.dataset]);

        this.paths
            .enter()
            .append("path")
            .attr("class", "line")
            .attr("id", "plotline")
            .attr('d', this.line);

        this.paths
            .attr('d', this.line);

        this.paths
            .exit()
            .remove();
    };

    return Timeplot;

}());
