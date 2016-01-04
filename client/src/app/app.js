'use strict';

/* App Module */

angular
    .module('provisionApp',
        [
            'ngRoute',          // For angular-route
            'xeditable',        // For angular-xeditable
            'ui.bootstrap',     // For angular-ui/bootstrap.
            'platform',
            'stream'
        ])

    .run(function (editableOptions) {
        editableOptions.theme = 'bs3'; // bootstrap3 theme. Can be also 'bs2', 'default'
    })

    .config(['$routeProvider',
        function ($routeProvider) {

            $routeProvider
                .when('/platforms', {
                    templateUrl: 'src/platform/platform-list.html',
                    controller : 'PlatformListCtrl'
                })
                .when('/platforms/:platformID', {
                    templateUrl: 'src/platform/platform-tab.html',
                    controller : 'PlatformDetailCtrl'
                })
                .when('/streams', {
                    templateUrl: 'src/stream/stream-list.html',
                    controller : 'StreamListCtrl'
                })
                .otherwise({
                    redirectTo: '/platforms'
                })
            ;
        }])

    .controller('MainCtrl', ['$scope', '$location', function ($scope, $location) {
        $scope.goTo = function (hash) {
            $location.path(hash);
        };
    }]);
