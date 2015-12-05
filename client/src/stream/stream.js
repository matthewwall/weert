"use strict";

angular

    .module('stream', ['ngResource'])


    .factory('Stream', ['$resource',
        function ($resource) {
            return $resource('/api/v1/streams/:streamID/', {streamId: '@_id'});
        }]);
