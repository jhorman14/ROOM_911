(function () {
    angular.module('miApp')
        .factory('AdminAdminsService', AdminAdminsService);

    AdminAdminsService.$inject = ['$http', 'AdminAuthService'];

    function AdminAdminsService($http, AdminAuthService) {
        var service = {};

        function getAuthHeaders() {
            var token = AdminAuthService.getToken();
            return {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            };
        }

        service.getAdmins = function () {
            // Asegúrate de que la ruta '/api/admins' sea la correcta en tu backend
            console.log('AdminAdminsService - llamando a getAdmins API: /api/admins');
            return $http.get('/api/admins', getAuthHeaders());
        };

        service.getAdmin = function (adminId) {
            console.log('AdminAdminsService - llamando a getAdmin API: /api/admins/' + adminId);
            return $http.get('/api/admins/' + adminId, getAuthHeaders());
        };

        service.createAdmin = function (adminData) {
            // Asegúrate de que la ruta '/api/admins' sea la correcta en tu backend
            console.log('AdminAdminsService - llamando a createAdmin API: /api/admins');
            return $http.post('/api/admins', adminData, getAuthHeaders());
        };

        service.updateAdmin = function (adminId, adminData) {
            // Filtrar adminData para no enviar password_confirmation si no se cambió la contraseña
            var dataToUpdate = angular.copy(adminData);
            if (dataToUpdate.password === '' || dataToUpdate.password === null) {
                delete dataToUpdate.password;
                delete dataToUpdate.password_confirmation;
            }
            console.log('AdminAdminsService - llamando a updateAdmin API: /api/admins/' + adminId);
            return $http.put('/api/admins/' + adminId, dataToUpdate, getAuthHeaders()); // Usar dataToUpdate
        };

        service.deleteAdmin = function (adminId) {
            console.log('AdminAdminsService - llamando a deleteAdmin API: /api/admins/' + adminId);
            return $http.delete('/api/admins/' + adminId, getAuthHeaders());
        };

        return service;
    }
})();