"use strict";

// TODO: The controller PlatformListCtrl should be thinner. Perhaps move things to the PlatformsFactory?

angular

    .module('platforms', ['ngResource'])

    .controller('PlatformListCtrl', ['$scope', 'PlatformsFactory',
        function ($scope, PlatformsFactory) {

            PlatformsFactory.getAllByValue().$promise.then(function (results) {
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

    .factory('PlatformsFactory', ['$resource',
        function ($resource) {
            // Create the factory. It will have a method "getAllByValue" that returns
            // the contents of all platforms.
            var factory = $resource('api/v1/platforms', {}, {
                getAllByValue: {method: 'GET', params: {as: 'values'}, isArray: true}
            });
            return factory;
        }])

    .controller('PlatformDetailCtrl', ['$scope', '$routeParams', 'PlatformFactory', 'LocationsFactory',
        function ($scope, $routeParams, PlatformFactory, LocationsFactory) {
            $scope.platform  = PlatformFactory.query({platformId: $routeParams.platformId});
            $scope.locations = LocationsFactory.query({platformId: $routeParams.platformId})
        }])

    .factory('PlatformFactory', ['$resource',
        function ($resource) {
            // Create the factory. It will have a method "query" that returns
            // the contents of a specific platform with ID 'platformId'.
            var factory = $resource('api/v1/platforms/:platformId', {}, {
                query: {method: 'GET', isArray: false}
            });
            return factory;
        }])

    .factory('LocationsFactory', ['$resource',
        function ($resource) {

            var factory = $resource('api/v1/platforms/:platformId/locations', {}, {
                query: {method: 'GET', isArray: true}
            });
            return factory;
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