'use strict';

/* Controllers */

var provisionControllers = angular.module('provisionControllers', []);

provisionControllers.controller('PlatformListCtrl', ['$scope', 'Platforms',
    function ($scope, Platforms) {
        $scope.platforms = Platforms.query();
        //$scope.orderProp = 'age';
    }]);

provisionControllers.controller('PlatformDetailCtrl', ['$scope', '$routeParams', 'Platforms',
    function ($scope, $routeParams, Platforms) {
        $scope.platform = Platforms.get({platformId: $routeParams.platformId}, function (platform) {
            // No-op for now
        });
    }]);
