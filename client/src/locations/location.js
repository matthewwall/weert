"use strict";

angular

    .module('locations', ['ngResource'])

    .controller('LocationsCtrl', ['$scope', '$routeParams', 'Locations',
        function ($scope, $routeParams, Locations) {
            $scope.platform = Locations.query({platformId: $routeParams.platformId});
        }])

    .factory('LocationsFactory', ['$resource',
        function ($resource) {

            var factory = $resource('api/v1/platforms/:platformId/locations', {}, {
                query: {method: 'GET', isArray: true}
            });
            return factory;
        }]);
