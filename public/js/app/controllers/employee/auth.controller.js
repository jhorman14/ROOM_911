(function() {
    'use strict'; // Buena práctica

    angular.module('miApp')
        .controller('EmployeeAuthController', EmployeeAuthController);

    // Inyectar $window para localStorage y $timeout para retrasos
    EmployeeAuthController.$inject = ['$scope', '$location', '$http', '$window', '$log', '$timeout'];

    function EmployeeAuthController($scope, $location, $http, $window, $log, $timeout) {
        var vm = this; // Usar 'controller as vm' es una práctica común y recomendada

        vm.credentials = {
            identification_id: ''
        };
        vm.isLoggingIn = false;
        vm.errorMessage = null;
        vm.successMessage = null;

        vm.login = login;

        function login() {
            vm.isLoggingIn = true;
            vm.errorMessage = null;
            vm.successMessage = null;

            $log.info('EmployeeAuthController: Intentando login con identificación:', vm.credentials.identification_id);

            // Usar $http directamente ya que EmployeeAuthService no está definido en el contexto actual
            $http({
                method: 'POST',
                url: '/api/employee/login', // Ruta definida en api.php
                data: vm.credentials
            })
                .then(function(response) {
                    vm.isLoggingIn = false;
                    var responseData = response.data;
                    $log.info('EmployeeAuthController: Login exitoso. Respuesta:', angular.copy(responseData));

                    if (responseData.token && responseData.employee_name) {
                        vm.successMessage = '¡Bienvenido, ' + responseData.employee_name + '! Puerta Abierta.';
                        $window.localStorage.setItem('employeeAuthToken', responseData.token);
                        $window.localStorage.setItem('employeeRole', responseData.role || 'employee');
                        $window.localStorage.setItem('loggedInEmployeeName', responseData.employee_name);

                        // Limpiar el campo de identificación después de un login exitoso
                        vm.credentials.identification_id = '';
                        // Opcional: resetear el formulario si estás usando uno con nombre
                        // if ($scope.employeeLoginForm) { $scope.employeeLoginForm.$setPristine(); $scope.employeeLoginForm.$setUntouched(); }

                    } else {
                        vm.errorMessage = "Respuesta inesperada del servidor.";
                        $log.error('EmployeeAuthController: Respuesta de login exitoso pero faltan datos (token o nombre).', responseData);
                    }
                })
                .catch(function(error) {
                    vm.isLoggingIn = false;
                    vm.errorMessage = error.data.message || 'Error al acceder. Verifique su identificación e inténtelo de nuevo.';
                    console.error('Error de acceso (trabajador):', error);
                });
        }
    }
})();