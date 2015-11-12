var url=require('url');
var normalizeUrl = require('normalize-url');

var resourcePath = function (req, name){
    var base_pathname = url.parse(req.originalUrl).pathname;
    var fullpath = url.format({
        protocol: req.protocol,
        host    : req.get('host'),
        pathname: base_pathname + '/' + name
    });
    return normalizeUrl(fullpath);
};

module.exports = {
    resourcePath : resourcePath
};
