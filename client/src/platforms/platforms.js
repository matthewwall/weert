"use strict";

angular

    .module('platforms', ['ngResource'])

    .controller('PlatformListCtrl', ['$scope', 'Platforms',
        function ($scope, Platforms) {

            Platforms.getAllByValue().$promise.then(function (results) {
                $scope.platforms = results;
                // For each property, add a property 'link' that points to the property detail
                $scope.platforms.forEach(function (platform) {
                    platform.link = 'api/v1/platforms/' + platform._id;
                });
            });
            $scope.orderProp = '_id';
        }])

    .controller('PlatformDetailCtrl', ['$scope', '$routeParams', 'Platform',
        function ($scope, $routeParams, Platform) {
            $scope.platform = Platform.query({platformId: $routeParams.platformId});
        }])

    .factory('Platforms', ['$resource',
        function ($resource) {
            var result = $resource('api/v1/platforms', {}, {
                getAllByValue: {method: 'GET', params: {as: 'values'}, isArray: true}
            });
            return result;
        }])

    .factory('Platform', ['$resource',
        function ($resource) {
            var result = $resource('api/v1/platforms/:platformId', {}, {
                query: {method: 'GET', isArray: false}
            });
            return result;
        }]);
