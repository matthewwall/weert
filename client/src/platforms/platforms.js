"use strict";

// TODO: The controller PlatformListCtrl should be thinner. Perhaps move things to the PlatformsFactory?

angular

    .module('platforms', ['ngResource', 'locations'])

    .controller('PlatformListCtrl', ['$scope', 'PlatformsFactory',
        function ($scope, PlatformsFactory) {

            PlatformsFactory.getAllByValue().$promise.then(function (results) {
                $scope.platforms = results;
                // For each property, add a property 'link' that points to the property detail
                $scope.platforms.forEach(function (platform) {
                    platform.link = 'api/v1/platforms/' + platform._id;
                });
                $scope.selected_platform = $scope.platforms[0]
            });
            $scope.orderProp   = '_id';
            $scope.showModal = false;
            $scope.toggleModal = function () {
                $scope.showModal = !$scope.showModal;
            };
            $scope.setDetail = function(platform){
                $scope.selected_platform = platform;
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

    .controller('PlatformCreateCtrl', ['$scope', '$uibModal', '$log', function ($scope, $uibModal, $log) {

        $scope.name;
        $scope.description;

        $scope.open = function (size) {

            var modalInstance = $uibModal.open({
                animation  : true,
                templateUrl: 'src/platforms/platform-create.html',
                controller : 'ModalInstanceCtrl',
                size       : size
            });

            modalInstance.result.then(
                function (platform_data) {
                    $scope.name = platform_data.name;
                    $scope.description = platform_data.description;
                },
                function () {
                    $log.info('Modal dismissed at: ' + new Date());
                }
            );
        };
    }])

    // Please note that $modalInstance represents a modal window (instance) dependency.
    // It is not the same as the $uibModal service used above.

    .controller('ModalInstanceCtrl', function ($scope, $uibModalInstance) {

        $scope.name;
        $scope.description;
        $scope.name_placeholder = "Platform name";
        $scope.description_placeholder = "A description";

        $scope.ok = function () {
            $uibModalInstance.close({name: $scope.name, description: $scope.description});
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };
    });