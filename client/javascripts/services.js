'use strict';

/* Services */

var ProvisionServices = angular.module('provisionServices', ['ngResource']);

ProvisionServices.factory('Platforms', ['$resource',
    function ($resource) {
        var result = $resource('/api/v1/platforms', {}, {});
        return result;
    }]);

//ProvisionServices.factory('Platforms', ['$resource',
//  function($resource){
//    return $resource('platforms/:platformId', {}, {
//      query: {method:'GET', params:{platformId:'phones'}, isArray:true}
//
//    });
//  }]);
