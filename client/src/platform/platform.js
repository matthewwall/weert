"use strict";

angular

    .module('platform', ['ngResource', 'location', 'stream'])

    .controller('PlatformListCtrl', ['$scope', '$location', 'Platform',
        function ($scope, $location, Platform) {

            // Get an array holding all the platforms
            $scope.platforms = Platform.query({as: 'values'});

            // Default ordering is by id
            $scope.orderProp = '_id';

            // Default query filter is no filter
            $scope.query_filter = undefined;

            $scope.goToDetail = function (platformID) {
                var path = $location.path();
                var url  = path + '/' + platformID;
                $location.path(url);
            }
        }
    ])

    .controller('PlatformDetailCtrl', ['$scope', '$routeParams', '$location', 'Platform', 'Location', 'Stream',
        function ($scope, $routeParams, $location, Platform, Location, Stream) {

            // Function to get the location records for a platform
            var getLocationDetails = function (platformID) {
                var locations = [];
                // If the platform ID is available, go fetch the locations
                // TODO: Should only get the last 5 locations or so.
                if (platformID) {
                    locations = Location.query({platformID: platformID});
                }
                return locations;
            };

            // Function to get the stream details for a platform
            var getStreamDetails = function (streamIDs) {
                var streams_details = [];
                if (streamIDs) {
                    for (var i = 0; i < streamIDs.length; i++) {
                        streams_details[i] = Stream.query({streamID: streamIDs[i]});
                    }
                }
                return streams_details;
            };

            var platformID   = $routeParams.platformID;
            $scope.metadata  = Platform.get({platformID: platformID});
            $scope.locations = getLocationDetails(platformID);
            $scope.streams   = getStreamDetails($scope.metadata.streams);

            $scope.deletePlatform = function () {
                console.log("Requestion to delete platform");
                Platform.delete({platformID: $scope.metadata._id});
                $location.path('platforms/')
            };

        }])

    .controller('PlatformCreateCtrl', ['$scope', '$location', 'Platform',
        function ($scope, $location, Platform) {

            $scope.metadata             = {};
            $scope.metadata.name        = undefined;
            $scope.metadata.description = undefined;
            $scope.metadata.streams     = [];
            $scope.locations            = [];

            $scope.save   = function () {

                // Make sure a name has been provided. If not, alert the user and return.
                if (!$scope.metadata.name)
                    return alert("Please supply a name for the platform");

                // This call will create a Resource object, which has a '$save()' method.
                // See https://docs.angularjs.org/api/ngResource/service/$resource
                var newPlatform = new Platform($scope.metadata);
                // Call the $save() method to save to server
                newPlatform
                    .$save()
                    .then(function (response) {
                        // Go to the detail page for this platform
                        $location.path('platforms/' + response._id);
                    })
                    .catch(function (err) {
                        alert(err.data.message);
                    });
            };
            $scope.cancel = function () {
                $location.path('platforms/');
            };
        }])

    .controller('PlatformTabsCtrl', ['$scope', function ($scope) {
        $scope.tabs = [
            {
                label: 'Metadata',
                url  : "src/platform/platform-detail.html"
            }, {
                label: 'Streams',
                url  : "src/platform/stream.html"
            }, {
                label: 'Location',
                url  : "src/platform/location.html"
            }, {
                label: 'Map',
                url  : "src/platform/map.html"
            }];

        $scope.setActiveTab = function (tab) {
            $scope.activeTab = tab;
        };
        $scope.setActiveTab($scope.tabs[0]);
    }])

    .factory('Platform', ['$resource',
        function ($resource) {
            return $resource('api/v1/platforms/:platformID', {platformID: '@_id'});
        }]);

