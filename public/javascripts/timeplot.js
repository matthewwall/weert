var Timeplot = (function () {

    function Timeplot(svg, options) {

        self = this;

        self.options = options || {};
        // The dataset to be plotted
        self.dataset = [];

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
            .orient("bottom")
            .ticks(d3.time.minute, 5);

        self.yAxis = d3.svg.axis()
            .scale(self.yScale)
            .orient("left");

        // Include a brush in the bottom plot
        //var brush = d3.svg.brush()
        //    .x(xScale_2)
        //    .on("brush", brushed);

        // Define the plot line
        self.line = d3.svg.line()
            .x(function (d) {
                return self.xScale(d.dateTime);
            })
            .y(function (d) {
                return self.yScale(d.outTemp);
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
            .attr("class", "axis")
            .attr("id", "x-axis")
            .attr("transform", "translate(0," + self.height + ")");

        // Position the top y-axis
        self.plotarea.append("g")
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
            self.dataset = data;
        }
        return self.dataset;
    };

    Timeplot.prototype.update_data = function (newdata) {
        if (newdata.constructor === Array) {
            self.dataset = self.dataset.concat(newdata);
        } else {
            self.dataset.push(newdata);
        }

        // Update the scales. The x scale has to be at least 15 minutes long.
        var x_domain = d3.extent(self.dataset, function (d) {
            return d.dateTime;
        });
        x_domain[1] = Math.max(x_domain[1], x_domain[0]+15*60*1000);
        self.xScale.domain(x_domain);
        y_domain = d3.extent(self.dataset, function (d) {
            return d.outTemp;
        });
        if (y_domain[0] === y_domain[1]){
            y_domain[1] = y_domain[0] + 0.1;
        }
        self.yScale.domain(y_domain);

        //Update axes
        self.plotarea.select("#x-axis")
            .transition()
            .duration(300)
            .call(self.xAxis);
        self.plotarea.select("#y-axis")
            .transition()
            .duration(300)
            .call(self.yAxis);

        // Find the path for the plot line
        self.paths = self.plotarea.selectAll("path#plotline")
            .data([self.dataset]);

        self.paths
            .enter()
            .append("path")
            .attr("class", "line")
            .attr("id", "plotline")
            .attr('d', self.line);

        self.paths
            .attr('d', self.line);

        self.paths
            .exit()
            .remove();
    };

    return Timeplot;

}());
