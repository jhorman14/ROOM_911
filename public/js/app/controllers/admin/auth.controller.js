(function () {
    angular.module('miApp')
        .controller('AdminAuthController', AdminAuthController);
    
    AdminAuthController.$inject = ['$scope', '$location', 'AdminAuthService', '$window']; // Inyectar $window
    
    function AdminAuthController($scope, $location, AdminAuthService, $window) {
        var vm = this; // Definir vm

        vm.credentials = { // Usar vm.
            username: '',
            password: ''
        };
        vm.error = ''; // Usar vm.
        vm.isLoggingIn = false; // Añadir para el estado del botón

        vm.login = function () { // Asignar a vm.
            vm.isLoggingIn = true; // Actualizar estado
            vm.error = ''; // Limpiar error previo
            AdminAuthService.login(vm.credentials) // Usar vm.credentials
                .then(function (response) {
                    vm.isLoggingIn = false; // Actualizar estado
                    if (response.data.token) {
                        $window.localStorage.setItem('adminAuthToken', response.data.token); // Usar adminAuthToken y $window
                        $location.path('/admin/employees'); // Redirige a la lista de empleados (o dashboard)
                    } else {
                        vm.error = "No se recibió token del servidor."; // Usar vm.error
                    }
                })
                .catch(function (error) {
                    vm.isLoggingIn = false; // Actualizar estado
                    vm.error = error.data.message || 'Error al iniciar sesión.'; // Usar vm.error
                    console.error('Error de inicio de sesión (admin):', error);
                });
        };
     }
 })();