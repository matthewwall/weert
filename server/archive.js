'use strict';
var util = require('util');
var dbtools = require('./dbtools');

var default_options = {interval:300000};

function Archive(options, db){
    var self=this;
    self.options = options || default_options;
    self.db = db;
}

Archive.prototype.getRecord = function(start, stop) {
    var self=this;

    var start_stamp = Math.floor(start / self.options.interval) * self.options.interval;
    var stop_stamp  = Math.ceil(stop / self.options.interval) * self.options.interval;



};

