'use strict';
var util = require('util');
var coln = require('./dbtools');

var default_options = {interval:300000};

function Archive(options){
    var self=this;
    self.options = options || default_options;

}

util.inherits(Archive, coln.StatelessCollectionManager);

Archive.prototype.update = function(start, stop) {
    var self=this;

    var start_stamp = Math.floor(start / self.options.interval) * self.options.interval;
    var stop_stamp  = Math.ceil(stop / self.options.interval) * self.options.interval;
};

