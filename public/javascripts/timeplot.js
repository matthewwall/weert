var bisectDate = d3.bisector(function(d) { return d.dateTime; }).left;

var Timeplot = (function () {

    function Timeplot(options) {
        // Constructor for Timeplot object

        var self = this;

        var defaults = {
            obstype: 'outTemp',
            element: "#chart",
            width  : 800,   // This will be the width & height of the SVG box.
            height : 500,
            // Margins is the distance from SVG box to the axes ends.
            margins: {top: 10, right: 10, bottom: 100, left: 40},
            x      : {
                ticks: 5
            },
            y      : {
                ticks: 5,
                text : undefined
            },
            duration : 500
        };
        self.options = $.extend({}, defaults, options || {});
        self.margins = self.options.margins || {top: 10, right: 10, bottom: 100, left: 40};
        // Width and height are the length of the x- and y-axes, respectively
        self.width  = options.width  - self.margins.left - self.margins.right;
        self.height = options.height - self.margins.top - self.margins.bottom;

        svg = d3.select(options.element).append("svg")
            .attr('width', options.width)
            .attr('height', options.height);

        // Set the x and y scaling
        self.xScale = d3.time.scale()
            .range([0, self.width]);
        self.yScale = d3.scale.linear()
            .range([self.height, 0]);

        // Define the x & y axes
        self.xAxis = d3.svg.axis()
            .scale(self.xScale)
            .orient("bottom")
            .ticks(self.options.x.ticks);
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

        // Position the x-axis within plotarea
        self.plotarea.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + self.height + ")");

        var y_text = self.options.y.text === undefined ? self.options.obstype : self.options.y.text;
        // Position the y-axis within plotarea
        self.plotarea.append("g")
            .attr("class", "y axis")
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text(y_text);

        // This will be the plot line
        self.plotarea.append("path")
            .attr("class", "plotline");

        // To start, we have no brush
        self.brush = undefined;
    }

    Timeplot.prototype.addMouseover = function() {

        // Add the ability to display the y-value on mouseover
        // Inspiration from http://bl.ocks.org/mbostock/3902569

        var self = this;

        var highlight = self.plotarea.append("g")
            .attr("class", "highlight")
            .style("display", "none");

        highlight.append("circle")
            .attr("r", 4.5);

        highlight.append("text")
            .attr("x", 9)
            .attr("dy", "1em");

        self.plotarea.append("rect")
            .attr("class", "overlay")
            .attr("width", self.width)
            .attr("height", self.height)
            .on("mouseover", function() { highlight.style("display", null); })
            .on("mouseout", function() { highlight.style("display", "none"); })
            .on("mousemove", mousemove);

        function mousemove() {
            var x0 = self.xScale.invert(d3.mouse(this)[0]),
                i = bisectDate(self.dataset, x0, 1),
                d0 = self.dataset[i - 1],
                d1 = self.dataset[i],
                d = x0 - d0.dateTime > d1.dateTime - x0 ? d1 : d0;
            highlight.attr("transform", "translate(" + self.xScale(d.dateTime) + "," + self.yScale(d[self.options.obstype]) + ")");
            highlight.select("text").text(d[self.options.obstype]);
        }
    };

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
            domain[0] = Date.now() - 60 * 1000;
        }
        if (domain[1] === undefined || domain[1] < (domain[0] + 60 * 1000)) {
            domain[1] = domain[0] + 60 * 1000;
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
        self.plotarea.select(".x.axis")
            .call(self.xAxis)
            .transition()
            .duration(self.options.duration);
        self.plotarea.select(".y.axis")
            .call(self.yAxis)
            .transition()
            .duration(self.options.duration);

        // Update the plot line
        self.plotarea.select(".plotline")
            .datum(self.dataset)
            .attr("d", self.line);

        if (self.brush !== undefined && !self.brush.empty()) {
            // If we have an active brush, lock its extent to the initially brushed area
            self.brush.extent(self.brush_extent);
            // Because the x-scale may have changed, the brush may have to be moved to
            // hold its position in the domain constant.
            self.brush(d3.select(".brush").transition().duration(self.options.duration));
        }

    };

    return Timeplot;

})();

var StackedPlots = (function () {

    function StackedPlots(plotlist) {

        var self=this;
        self.plots = [];

        for (var i=0; i<plotlist.length; i++){
            t = new Timeplot(plotlist[i]);
            self.plots.push(t);
        }
    }

    StackedPlots.prototype.data = function (dataset) {
        var self=this;
        // Set the data to be used.
        for (var i=0; i<self.plots.length; i++){
            self.plots[i].data(dataset);
        }
    };

    StackedPlots.prototype.render = function () {
        var self=this;
        for (var i=0; i<self.plots.length; i++){
            self.plots[i].render();
        }
    };

    StackedPlots.prototype.addMouseover = function () {
        var self=this;
        for (var i=0; i<self.plots.length; i++){
            self.plots[i].addMouseover();
        }

    };

    return StackedPlots;

})();

