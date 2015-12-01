'use strict';

/* App Module */

angular
    .module('provisionApp', [
        'ngRoute',
        'platforms'
    ])
    .config(['$routeProvider',
        function ($routeProvider) {
            $routeProvider
                .when('/platforms', {
                    templateUrl: 'src/platforms/platforms-list.html',
                    controller : 'PlatformListCtrl'
                })

                //.when('/phones/:phoneId', {
                //    templateUrl: 'partials/phone-detail.html',
                //    controller : 'PhoneDetailCtrl'
                //})
                .otherwise({
                    redirectTo: '/platforms'
                })
            ;
        }]);
