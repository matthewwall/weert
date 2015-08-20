var Timeplot = (function () {

    function Timeplot(svg, options) {

        var self = this;

        var defaults = {
            obstype : 'outTemp',
            margins : {top: 10, right: 10, bottom: 100, left: 40},
            y : {ticks : 5,
            text : undefined}
        };
        self.options= _.extend({}, defaults, options || {});
        console.log("options will be ", self.options);

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
            .orient("left")
            .ticks(self.options.y.ticks);

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

        var y_text = self.options.y.text === undefined ? self.options.obstype : self.options.y.text;
        // Position the top y-axis
        self.plotarea.append("g")
            .attr("class", "y axis")
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text(y_text);
    }

    Timeplot.prototype.add_brush = function(callback) {
        var self = this;
        self.brush = d3.svg.brush();
        self.brush.x(self.xScale)
            .on("brush", callback);
        self.plotarea.append("g")
            .attr("class", "x brush")
            .call(self.brush)
            .selectAll("rect")
            .attr("y", -6)
            .attr("height", self.height + 7);
        return self.brush;
    };

    Timeplot.prototype.domain = function(new_domain){
        var self = this;
        if (new_domain === undefined){
            console.log("returning scale", self.xScale.domain());
            return self.xScale.domain();
        } else {
            self.xScale.domain(new_domain);
            self.plotarea.select(".plotline").attr("d", self.line);
            self.plotarea.select(".x.axis").call(self.xAxis);
        }
    };

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
