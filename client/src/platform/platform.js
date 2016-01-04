"use strict";

var emptyPlatform = {name: "", description: "", _id: undefined, streams: []};

angular

    .module('platform', ['ngResource', 'location', 'stream'])

    .controller('PlatformListCtrl', ['$scope', '$location', 'Platform',
        function ($scope, $location, Platform) {

            // Get an array holding all the platforms
            $scope.platforms = Platform.query({as: 'values'});

            // Default ordering is by id
            $scope.orderProp = '_id';

            $scope.gotoDetail = function (platformID) {
                var path = $location.path();
                var url  = path + '/' + platformID;
                $location.path(url);
            }
        }
    ])

    .controller('PlatformDetailCtrl', ['$scope', '$routeParams', 'Platform', 'Location', 'Stream',
        function ($scope, $routeParams, Platform, Location, Stream) {

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

            $scope.createMode = function () {
                // If we are creating a new platform, set the fields to null strings
                $scope.setDetail(angular.copy(emptyPlatform));
            };

            // Function to call to save the selected platform to the server
            $scope.saveSelectedPlatform = function () {
                if ($scope.selected_platform._id) {
                    // Editing existing platform (not implemented yet).
                } else {
                    // Creating a new platform.

                    // This call will create a Resource object, which has a '$save()' method.
                    // See https://docs.angularjs.org/api/ngResource/service/$resource
                    var newPlatform = new Platform($scope.selected_platform);
                    // Call the $save() method to save to server
                    newPlatform.$save(
                        function (newPlatform) {
                            // Successful save. Push the new platform on to the list we wave
                            $scope.platforms.push(newPlatform);
                            // Set the detail to the new platform
                            $scope.setDetail(newPlatform);
                        }, function (err) {
                            alert("Unable to create platform. Error code: " + err.status);
                        });
                }
            };

            $scope.notImplemented = function (msg) {
                alert("Not implemented yet: " + msg);
            };

            var platformID   = $routeParams.platformID;
            $scope.metadata  = Platform.get({platformID: platformID});
            $scope.locations = getLocationDetails(platformID);
            $scope.streams   = getStreamDetails($scope.metadata.streams);

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

