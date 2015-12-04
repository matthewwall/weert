"use strict";

var emptyPlatform = {name: "", description: "", _id: undefined, streams: []};

angular

    .module('platforms', ['ngResource', 'locations'])

    .controller('PlatformListCtrl', ['$scope', 'PlatformsFactory', 'LocationsFactory',
        function ($scope, PlatformsFactory, LocationsFactory) {

            // Fetch the list of platforms from the server
            PlatformsFactory.getAllByValue().$promise.then(function (results) {
                $scope.platforms = results;
                //// For each property, add a property 'link' that points to the property detail
                //$scope.platforms.forEach(function (platform) {
                //    platform.link = 'api/v1/platforms/' + platform._id;
                //});

                // Set the detail to the first platform, if it exists
                $scope.setDetail($scope.platforms[0])
            });

            // Default ordering is by id
            $scope.orderProp = '_id';

            // Function to set the platform whose details we are looking at
            $scope.setDetail = function (platform) {
                $scope.selected_platform = platform;
                if (platform && platform._id) {
                    $scope.locations = LocationsFactory.query({platformId: $scope.selected_platform._id});
                } else {
                    $scope.locations = [];
                }
            };

            $scope.createMode = function () {
                $scope.setDetail(angular.copy(emptyPlatform));
            };

            $scope.saveSelectedPlatform = function () {
                var promise;
                if ($scope.selected_platform._id){
                    // Do an update
                } else {
                    // Do a create
                    promise = PlatformsFactory.createNew({}, $scope.selected_platform).$promise;
                }
                promise.then(function(result){
                    if (result) {
                        $scope.platforms.push(result);
                        $scope.setDetail(result);
                    }
                })
            }
        }])

    .factory('PlatformsFactory', ['$resource',
        function ($resource) {
            // Create the factory. It will have a method "getAllByValue" that returns
            // the contents of all platforms.
            var factory = $resource('api/v1/platforms', {}, {
                getAllByValue: {method: 'GET', params: {as: 'values'}, isArray: true},
                createNew : {method: 'POST'}
            });
            return factory;
        }]);


//.controller('PlatformDetailCtrl', ['$scope', '$routeParams', 'PlatformFactory', 'LocationsFactory',
//    function ($scope, $routeParams, PlatformFactory, LocationsFactory) {
//        $scope.platform  = PlatformFactory.query({platformId: $routeParams.platformId});
//        $scope.locations = LocationsFactory.query({platformId: $routeParams.platformId})
//    }]);
//
//.factory('PlatformFactory', ['$resource',
//    function ($resource) {
//        // Create the factory. It will have a method "query" that returns
//        // the contents of a specific platform with ID 'platformId'.
//        var factory = $resource('api/v1/platforms/:platformId', {}, {
//            query: {method: 'GET', isArray: false}
//        });
//        return factory;
//    }]);
//
