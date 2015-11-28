'use strict';

/* App Module */

var provisionApp = angular.module('provisionApp', [
    'ngRoute',
    'provisionControllers',
    //'provisionFilters',
    'provisionServices'
]);

provisionApp.config(['$routeProvider',
    function ($routeProvider) {
        $routeProvider.
        when('/platforms', {
            templateUrl: 'partials/platform-list.html',
            controller : 'PlatformListCtrl'
        }).
        when('/platforms/:platformId', {
            templateUrl: 'partials/platform-detail.html',
            controller : 'PlatformDetailCtrl'
        }).
        otherwise({
            redirectTo: '/platforms'
        });
    }]);
