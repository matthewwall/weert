"use strict";

angular

    .module('locations', ['ngResource'])


    .factory('Location', ['$resource',
        function ($resource) {
            return $resource('api/v1/platforms/:platformId/locations', {platformId: '@_id'});
        }]);
