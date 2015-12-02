"use strict";

angular

    .module('platforms', ['ngResource'])

    .controller('PlatformListCtrl', ['$scope', 'Platforms',
        function ($scope, Platforms) {

            Platforms.getAllByValue().$promise.then(function (results) {
                $scope.platforms = results;
                // For each property, add a property 'link' that points to the property detail
                $scope.platforms.forEach(function (platform) {
                    platform.link = 'api/v1/platforms/' + platform._id;
                });
            });
            $scope.orderProp   = '_id';
            $scope.showModal = false;
            $scope.toggleModal = function () {
                $scope.showModal = !$scope.showModal;
            };
        }])

    .controller('PlatformDetailCtrl', ['$scope', '$routeParams', 'Platform',
        function ($scope, $routeParams, Platform) {
            $scope.platform = Platform.query({platformId: $routeParams.platformId});
        }])

    .factory('Platforms', ['$resource',
        function ($resource) {
            var result = $resource('api/v1/platforms', {}, {
                getAllByValue: {method: 'GET', params: {as: 'values'}, isArray: true}
            });
            return result;
        }])

    .factory('Platform', ['$resource',
        function ($resource) {
            var result = $resource('api/v1/platforms/:platformId', {}, {
                query: {method: 'GET', isArray: false}
            });
            return result;
        }])

    .controller('ModalDemoCtrl', ['$scope', '$uibModal', '$log', function ($scope, $uibModal, $log) {

        $scope.items = ['item1', 'item2', 'item3'];

        $scope.animationsEnabled = true;

        $scope.open = function (size) {

            var modalInstance = $uibModal.open({
                animation  : $scope.animationsEnabled,
                templateUrl: 'myModalContent.html',
                controller : 'ModalInstanceCtrl',
                size       : size,
                resolve    : {
                    items: function () {
                        return $scope.items;
                    }
                }
            });

            modalInstance.result.then(function (selectedItem) {
                $scope.selected = selectedItem;
            }, function () {
                $log.info('Modal dismissed at: ' + new Date());
            });
        };

        $scope.toggleAnimation = function () {
            $scope.animationsEnabled = !$scope.animationsEnabled;
        };

    }])

    // Please note that $modalInstance represents a modal window (instance) dependency.
    // It is not the same as the $uibModal service used above.

    .controller('ModalInstanceCtrl', function ($scope, $uibModalInstance, items) {

        $scope.items    = items;
        $scope.selected = {
            item: $scope.items[0]
        };

        $scope.ok = function () {
            $uibModalInstance.close($scope.selected.item);
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };
    });