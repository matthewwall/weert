var Timeplot = (function () {

    function Timeplot(svg, options) {

        var self = this;

        var defaults = {
            obstype: 'outTemp',
            margins: {top: 10, right: 10, bottom: 100, left: 40},
            y      : {
                ticks: 5,
                text : undefined
            }
        };
        self.options = _.extend({}, defaults, options || {});
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

        // The plot area will have class "plotarea." Honor the margins.
        self.plotarea = svg.append("g")
            .attr("class", "plotarea")
            .attr("transform", "translate(" + self.margins.left + "," + self.margins.top + ")");

        //// Define a clipping rectangle for the plot
        //self.svg.append("defs").append("clipPath")
        //    .attr("id", "clip")
        //    .append("rect")
        //    .attr("width", self.width)
        //    .attr("height", self.height);

        // Position the top x-axis within plotarea
        self.plotarea.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + self.height + ")");

        var y_text = self.options.y.text === undefined ? self.options.obstype : self.options.y.text;
        // Position the top y-axis within plotarea
        self.plotarea.append("g")
            .attr("class", "y axis")
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text(y_text);

        // To start, we have no brush
        self.brush = undefined;
    }

    Timeplot.prototype.addBrush = function (callback) {
        // Add a brush to the plot. See
        // http://stackoverflow.com/questions/22873551/d3-js-brush-controls-getting-extent-width-coordinates
        // for a pretty good explanation of how this works.
        var self = this;

        // Create a brush
        self.brush = d3.svg.brush();

        // Attach it to the x-scale. Arrange to have it call the function "_brushed" when brushing
        self.brush.x(self.xScale)
            .on("brush", _brushed);

        // Create an (invisible) rectangle by calling the brush function. It will have classes "x" and "brush"
        self.plotarea.append("g")
            .attr("class", "x brush")
            .call(self.brush)
            // Select the just created rectangle. It will have no width initially.
            // It will also have no height (because it has no y scale), so hardwire something in.
            .selectAll("rect")
            .attr("y", -6)
            .attr("height", self.height + 7);

        function _brushed() {
            // This is the callback function for when the brush is moved.
            // Stash the brush extent, then call the user's callback
            self.brush_extent = self.brush.extent();
            console.log("locking brush extent to ", self.brush_extent);
            callback(self.brush);
        }

    };

    Timeplot.prototype.data = function (dataset) {
        // Set the data to be used.
        this.dataset = dataset;
    };

    Timeplot.prototype.set_x_domain = function (domain) {
        // Set the x domain of the plot. If the new domain is undefined, then it will
        // be calculated from the extent of the dataset. Otherwise, it will be set to the given value.
        // NB: the domain will be locked to this value, even if the dataset changes.

        var self = this;
        var new_domain = self.x_domain = domain;

        // If the new domain is undefined, calculate it from the data
        if (new_domain === undefined) {
            new_domain = _calc_x_domain();
        }

        self.xScale.domain(new_domain);
        self.plotarea.select(".plotline").attr("d", self.line);
        self.plotarea.select(".x.axis").call(self.xAxis);
    };

    function _calc_x_domain() {
        var domain = d3.extent(self.dataset, function (d) {
            return d.dateTime;
        });
        // It should be at least 1 minute big
        if (domain[0] === undefined) {
            domain[0] = (new Date).getTime() - 60 * 1000;
        }
        if (domain[1] === undefined || domain[1] < (domain[0] + 60 * 1000)) {
            domain[1] = domain[0] + 60 * 1000
        }
        return domain;
    }

    Timeplot.prototype.render = function () {

        var self = this;
        var domain = self.x_domain;

        // If the domain has not been locked by the brush,
        // calculate it from the dataset
        if (domain === undefined) {
            domain = _calc_x_domain();
        }
        // Now use the resultant domain to set the x-scale:
        self.xScale.domain(domain);

        // Update the y-scale.
        y_domain = d3.extent(self.dataset, function (d) {
            return d[self.options.obstype];
        });
        // Make sure there's something to the y-scale:
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
            .data([self.dataset]);

        // For transitions, just update the data
        self.paths.transition()
            .duration(200)
            .attr("d", self.line);

        // When first starting up, there will be no data, so ".enter()" will
        // be invoked. Add the path.
        self.paths.enter()
            .append("path")
            .attr("class", "plotline")
            .attr('d', self.line);

        self.paths.exit()
            .remove();

        if (self.brush !== undefined && !self.brush.empty()) {
            // If we have an active brush, lock its extent to the initially brushed area
            self.brush.extent(self.brush_extent);
            // Because the x-scale may have changed, the brush may have to be moved to
            // hold its position in the domain constant.
            self.brush(d3.select(".brush").transition().duration(200));
        }
    };

    return Timeplot;

})();
