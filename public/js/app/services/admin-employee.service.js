(function () {
    angular.module('miApp')
        .factory('AdminEmployeeService', AdminEmployeeService);

    AdminEmployeeService.$inject = ['$http', 'AdminAuthService'];

    function AdminEmployeeService($http, AdminAuthService) {
        var service = {};

        service.getEmployees = function () {
            var token = AdminAuthService.getToken();
            return $http.get('/api/employees', {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });
        };

        service.toggleAccess = function (employeeId) {
            var token = AdminAuthService.getToken();
            return $http.put('/api/employees/' + employeeId, { access_enabled: null }, { // Envía un objeto con el campo a actualizar
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });
        };

        // Aquí podrías agregar otros métodos para crear, editar, importar empleados

        return service;
    }
})();