(function () {
    angular.module('miApp')
        .factory('AdminDepartmentService', AdminDepartmentService);

    AdminDepartmentService.$inject = ['$http', 'AdminAuthService'];

    function AdminDepartmentService($http, AdminAuthService) {
        var service = {};

        function getAuthHeaders() {
            var token = AdminAuthService.getToken();
            // console.log('AdminDepartmentService - Token obtenido para headers:', token); // DEBUG
            return {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            };
        }

        service.getDepartments = function () {
            console.log('AdminDepartmentService - llamando a getDepartments API: /api/departments');
            return $http.get('/api/departments', getAuthHeaders());
        };

        service.createDepartment = function (departmentData) {
            console.log('AdminDepartmentService - llamando a createDepartment API: /api/departments');
            return $http.post('/api/departments', departmentData, getAuthHeaders());
        };

        service.updateDepartment = function (departmentId, departmentData) {
            console.log('AdminDepartmentService - llamando a updateDepartment API: /api/departments/' + departmentId);
            return $http.put('/api/departments/' + departmentId, departmentData, getAuthHeaders());
        };

        service.deleteDepartment = function (departmentId) {
            console.log('AdminDepartmentService - llamando a deleteDepartment API: /api/departments/' + departmentId);
            return $http.delete('/api/departments/' + departmentId, getAuthHeaders());
        };

        return service;
    }
})();