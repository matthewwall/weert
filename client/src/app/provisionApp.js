'use strict';

/* App Module */

angular
    .module('provisionApp', [
        'ngRoute',
        'ui.bootstrap',
        'xeditable',
        'platform'
    ])

    .run(function (editableOptions) {
        editableOptions.theme = 'bs3'; // bootstrap3 theme. Can be also 'bs2', 'default'
    })

    .config(['$routeProvider',
        function ($routeProvider) {
            $routeProvider
                .when('/platforms', {
                    templateUrl: 'src/platform/platforms-list.html',
                    controller : 'PlatformListCtrl'
                })

                .otherwise({
                    redirectTo: '/platforms'
                })
            ;
        }]);
