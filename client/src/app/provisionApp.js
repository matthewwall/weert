'use strict';

/* App Module */

angular
    .module('provisionApp', [
        'ngRoute',
        'ui.bootstrap',
        'xeditable',
        'platforms'
    ])

    .run(function (editableOptions) {
        editableOptions.theme = 'bs3'; // bootstrap3 theme. Can be also 'bs2', 'default'
    })

    .config(['$routeProvider',
        function ($routeProvider) {
            $routeProvider
                .when('/platforms', {
                    templateUrl: 'src/platforms/platforms-list.html',
                    controller : 'PlatformListCtrl'
                })

                .otherwise({
                    redirectTo: '/platforms'
                })
            ;
        }]);
