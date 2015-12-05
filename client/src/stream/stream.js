"use strict";

angular

    .module('stream', ['ngResource'])


    .factory('PlatformStream', ['$resource',
        function ($resource) {
            return $resource('/api/v1/platforms/:platformID/streams', {platformId: '@_id'});
        }])

    .factory('Stream', ['$resource',
        function ($resource) {
            return $resource('/api/v1/streams/:streamID/', {streamId: '@_id'});
        }]);
