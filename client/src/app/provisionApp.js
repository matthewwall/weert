'use strict';

/* App Module */

angular
    .module('provisionApp', [
        'ngRoute',
        'ui.bootstrap',
        'platforms'
    ])
    .config(['$routeProvider',
        function ($routeProvider) {
            $routeProvider
                .when('/platforms', {
                    templateUrl: 'src/platforms/platforms-list.html',
                    controller : 'PlatformListCtrl'
                })

                .when('/platforms/:platformId', {
                    templateUrl: 'src/platforms/platform-detail.html',
                    controller : 'PlatformDetailCtrl'
                })
                .otherwise({
                    redirectTo: '/platforms'
                })
            ;
        }]);
