"use strict";

angular
    .module('platforms', ['ngResource'])

    .controller('PlatformListCtrl', ['$scope', 'Platform',
        function ($scope, Platform) {

            Platform.getAllByValue().$promise.then(function (results) {
                $scope.platforms = results;
                // For each property, add a property 'link' that points to the property detail
                $scope.platforms.forEach(function (platform) {
                    platform.link = 'api/v1/platforms/' + platform._id;
                });
            });
            $scope.orderProp = '_id';
        }])

    .factory('Platform', ['$resource',
        function ($resource) {
            var result = $resource('api/v1/platforms', {}, {
                getAllByValue: {method: 'GET', params: {as: 'values'}, isArray: true},
                query        : {method: 'GET', params: {phoneId: 'phones', foo: 'bar'}, isArray: true}
            });
            return result;
        }]);
