(function () {
    angular.module('miApp')
        .factory('AdminAuthService', AdminAuthService);
    
    AdminAuthService.$inject = ['$http', '$q', '$window']; // Inyectar $window
    
    function AdminAuthService($http, $q, $window) { // Añadir $window
        var service = {};
    
        service.login = function (credentials) {
            return $http.post('/api/admin/login', credentials);
        };
    
        // Esta función será la principal para verificar si está logueado
        service.isAdminLoggedIn = function () {
            var token = $window.localStorage.getItem('adminAuthToken');
            return !!token; // Devuelve true si el token existe, false si no
            // Podrías añadir una verificación de expiración del token aquí si tu token es un JWT
        };
    
        service.getToken = function () {
            return $window.localStorage.getItem('adminAuthToken');
        };

        

        service.logout = function () {
            var deferred = $q.defer();
            var token = service.getToken();
    
            if (!token) {
                deferred.resolve(); // No hay token, ya está deslogueado
                return deferred.promise;
            }
    
            // Aquí podrías enviar una petición al backend para invalidar el token (opcional)
            $http.post('/api/admin/logout', {}, {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            })
                .then(function (response) {
                    deferred.resolve(response);
                })
                .catch(function (error) {
                    deferred.reject(error);
                })
                .finally(function () {
                    $window.localStorage.removeItem('adminAuthToken'); // Usar adminAuthToken y $window
                });
    
            return deferred.promise;
        };
    
        return service;
    }
})();