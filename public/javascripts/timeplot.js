var Timeplot = (function () {

    function Timeplot(svg, options) {

        var self = this;

        self.options = options || {};
        if (self.options.obstype === undefined) {
            self.options.obstype = 'outTemp'
        }

        // Margins is the distance to the ends of the axes
        self.margins = self.options.margins || {top: 10, right: 10, bottom: 100, left: 40};
        // Width and height are the length of the x- and y-axes, respectively
        self.width = parseInt(svg.style("width")) - self.margins.left - self.margins.right;
        self.height = parseInt(svg.style("height")) - self.margins.top - self.margins.bottom;

        // Set the x and y scaling
        self.xScale = d3.time.scale()
            .range([0, self.width]);
        self.yScale = d3.scale.linear()
            .range([self.height, 0]);

        // Define the x & y axes
        self.xAxis = d3.svg.axis()
            .scale(self.xScale)
            .orient("bottom");

        self.yAxis = d3.svg.axis()
            .scale(self.yScale)
            .orient("left");

        // Include a brush in the bottom plot
        //var brush = d3.svg.brush()
        //    .x(xScale_2)
        //    .on("brush", brushed);

        // Define the plot line
        self.line = d3.svg.line()
            .defined(function (d) {
                return d[self.options.obstype] != null;
            })
            .x(function (d) {
                return self.xScale(d.dateTime);
            })
            .y(function (d) {
                return self.yScale(d[self.options.obstype]);
            });

        self.plotarea = svg.append("g")
            .attr("class", "plotarea")
            .attr("transform", "translate(" + self.margins.left + "," + self.margins.top + ")");

        //// Define a clipping rectangle for the plot
        //self.svg.append("defs").append("clipPath")
        //    .attr("id", "clip")
        //    .append("rect")
        //    .attr("width", self.width)
        //    .attr("height", self.height);

        // Position the top x-axis
        self.plotarea.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + self.height + ")");

        // Position the top y-axis
        self.plotarea.append("g")
            .attr("class", "y axis")
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("Temperature");
    }

    Timeplot.prototype.render = function (dataset) {

        var self = this;

        // Update the scales. The x scale has to be at least 1 minute long.
        var x_domain = d3.extent(dataset, function (d) {
            return d.dateTime;
        });
        x_domain[1] = Math.max(x_domain[1], x_domain[0] + 60 * 1000);
        self.xScale.domain(x_domain);
        y_domain = d3.extent(dataset, function (d) {
            return d[self.options.obstype];
        });
        if (y_domain[0] === y_domain[1]) {
            y_domain[1] = y_domain[0] + 0.1;
        }
        self.yScale.domain(y_domain);

        //Update axes
        self.plotarea.select(".x")
            .transition()
            .duration(300)
            .call(self.xAxis);
        self.plotarea.select(".y")
            .transition()
            .duration(300)
            .call(self.yAxis);

        // Select the plot line by using its class, "plotline."
        // Associate it with an array with a single path, the dataset. Because
        // the data has only a single element, the plot line should also be a
        // single element (a path).
        self.paths = self.plotarea.selectAll(".plotline")
            .data([dataset]);

        // If no such path exists, this will add one and link it to the line.
        // There should only be one path around at a time.
        self.paths
            .enter()
            .append("path")
            .attr("class", "plotline")
            .attr('d', self.line);

        // Not sure how this would get invoked, but it's here for completeness.
        self.paths
            .exit()
            .remove();
    };

    return Timeplot;

})();
