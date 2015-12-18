var container = require('./containerConfig');

container.startModule('server', { async: true })
    .then(function(server){
        console.log('Express listening!');
    })
    .catch(function(err){
        console.error('Express start failed', err);
    });
