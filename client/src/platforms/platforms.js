angular
    .module('platforms', ['ngResource'])

    .controller('PlatformListCtrl', ['$scope', 'Platform',
        function ($scope, Platform) {
            $scope.platforms = Platform.getall();
            //$scope.orderProp = 'age';
        }])

    .factory('Platform', ['$resource',
        function ($resource) {
            var result = $resource('api/v1/platforms', {}, {
                getall: {method: 'GET', isArray: true},
                query : {method: 'GET', params: {phoneId: 'phones', foo: 'bar'}, isArray: true}
            });
            return result;
        }]);
