"use strict";

angular

    .module('location', ['ngResource'])


    .factory('Location', ['$resource',
        function ($resource) {
            return $resource('api/v1/platforms/:platformID/locations', {platformID: '@_id'});
        }]);
