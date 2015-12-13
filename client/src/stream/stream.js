"use strict";

angular

    .module('stream', ['ngResource'])

    .controller('StreamListCtrl', ['$scope', 'Stream',
        function ($scope, Stream) {

        }])

    .controller('StreamTabsCtrl', ['$scope', function ($scope) {
        $scope.tabs = [
            {
                label: 'Details',
                url  : "src/stream/stream-detail.tpl.html"
            }, {
                label: 'Live',
                url  : "src/stream/rt.tpl.html"
            }];

        $scope.setActiveTab = function (tab) {
            $scope.activeTab = tab.url;
        };
        $scope.setActiveTab($scope.tabs[0]);
    }])

    .factory('Stream', ['$resource',
        function ($resource) {
            return $resource('/api/v1/streams/:streamID/', {streamID: '@_id'});
        }]);
