(function () {
    angular.module('miApp')
        .factory('AdminAuthService', AdminAuthService);
    
    AdminAuthService.$inject = ['$http', '$q', '$window', '$location', '$log']; // Inyectar $window, $location y $log

    function AdminAuthService($http, $q, $window, $location, $log) { // Añadir $window, $location y $log
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

        service.getCurrentAdmin = function () {
            var adminData = $window.localStorage.getItem('currentAdmin');
            return adminData ? JSON.parse(adminData) : null;
        };

        

        service.logout = function () {
             $log.debug('AdminAuthService: logout() function has been called.');
            var token = service.getToken();
    
            if (!token) {
                $log.info('AdminAuthService: No token found, already logged out or session expired.');
                clearAdminSessionData();
                $location.path('/login/admin'); // Asegurar redirección incluso si no había token
                return $q.resolve(); // Devolver una promesa resuelta
            }
    
            // Aquí podrías enviar una petición al backend para invalidar el token (opcional)
            return $http.post('/api/admin/logout', {}, {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            })
                .then(function (response) {
                    $log.info('AdminAuthService: Logout API call successful.');
                    return response;
                })
                .catch(function (error) {
                    $log.error('AdminAuthService: Logout API call failed. Still proceeding with client-side logout.', error);
                    // Aunque la API falle, procedemos a desloguear del cliente
                    return $q.reject(error); // O $q.resolve() si quieres que el .finally se ejecute igual
                })
                .finally(function () {
                    $log.info('AdminAuthService: Clearing local session data and redirecting.');
                    clearAdminSessionData();
                    $location.path('/login/admin'); // Redirigir a la página de login de admin
                });
    
        };

        function clearAdminSessionData() {
            $window.localStorage.removeItem('adminAuthToken');
            $window.localStorage.removeItem('currentAdmin');
        }
    
        return service;
    }
})();