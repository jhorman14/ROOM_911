(function() {
    angular.module('miApp')
        .factory('EmployeeAuthService', EmployeeAuthService);

    EmployeeAuthService.$inject = ['$http'];

    function EmployeeAuthService($http) {
        var service = {};

        service.login = function(credentials) {
            return $http.post('/api/employee/login', credentials);
        };

        return service;
    }
})();