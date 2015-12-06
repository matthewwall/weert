'use strict';

/* App Module */

angular
    .module('provisionApp',
        [
            'ngRoute',
            'xeditable',
            'ngAnimate',
            'ui.bootstrap',
            'platform'
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
                .otherwise({
                    redirectTo: '/platforms'
                })
            ;
        }])

    .controller('TabsCtrl', ['$scope', function ($scope) {
        $scope.tabs = [
            {
                label: 'Details',
                url  : "src/platform/platform-detail.tpl.html"
            }, {
                label: 'Location',
                url  : "src/location/location.tpl.html"
            }, {
                label: 'Streams',
                url  : "src/stream/stream.tpl.html"
            }];

        $scope.setActiveTab = function (tab) {
            $scope.activeTab = tab.url;
        };
        $scope.setActiveTab($scope.tabs[0]);
    }]);
