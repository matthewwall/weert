"use strict";

var emptyPlatform = {name: "", description: "", _id: undefined, streams: []};

angular

    .module('platform', ['ngResource', 'location', 'stream'])

    .controller('PlatformListCtrl', ['$scope', '$location', 'Platform', 'Location', 'Stream',
        function ($scope, $location, Platform, Location, Stream) {

            var getLocations = function (platform) {
                var locations = [];
                // If the platform ID is available, go fetch the locations
                // TODO: Should only get the last 5 locations or so.
                if (platform && platform._id) {
                    locations = Location.query({platformID: platform._id});
                }
                return locations;
            };

            // Function to get the stream details for a specific platform
            var getStreamDetails = function (platform) {
                var streams_details = [];
                if (platform && platform.streams) {
                    for (var i = 0; i < platform.streams.length; i++) {
                        streams_details[i] = Stream.query({streamID: platform.streams[i]});
                    }
                }
                return streams_details;
            };

            // Function to set the platform whose details we are looking at
            $scope.setDetail = function (platform) {
                $scope.selected_platform = platform;
                $scope.locations         = getLocations(platform);
                $scope.streams           = getStreamDetails(platform);
            };

            // Get an array holding all the platforms
            $scope.platforms = Platform.query({as: 'values'}, function () {
                // Set the detail to the first platform
                $scope.setDetail($scope.platforms[0]);
            });

            // Default ordering is by id
            $scope.orderProp = '_id';

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

            $scope.notImplemented = function(msg){
                alert("Not implemented yet: " + msg);
            }

        }])

    .controller('PlatformTabsCtrl', ['$scope', function ($scope) {
        $scope.tabs = [
            {
                label: 'Details',
                url  : "src/platform/platform-detail.tpl.html"
            }, {
                label: 'Streams',
                url  : "src/platform/stream.tpl.html"
            }, {
                label: 'Location',
                url  : "src/platform/location.tpl.html"
            }, {
                label: 'Map',
                url  : "src/platform/map.tpl.html"
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

