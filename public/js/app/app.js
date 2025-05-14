angular.module('miApp', ['ngRoute'])
    .config(function ($routeProvider) {
        $routeProvider
            .when('/login', {
                templateUrl: 'js/app/views/login.html',
                controller: 'LoginSelectorController'
            })
            .when('/login/employee', {
                templateUrl: 'js/app/views/employee/login.html',
                controller: 'EmployeeAuthController',
                controllerAs: 'vm'
            })
            .when('/login/admin', {
                templateUrl: 'js/app/views/admin/login.html',
                controller: 'AdminAuthController',
                controllerAs: 'vm'
            })
            .when('/admin/employees', { // Cambiamos la ruta a /admin/employees
                templateUrl: 'js/app/views/admin/employees/list.html', // Ruta a la lista de empleados
                controller: 'AdminEmployeeListController', // Controlador para la lista de empleados
                resolve: { authenticated: checkAdminAuth },
                controllerAs: 'vm' // <--- AÑADIR ESTO
            })
            .when('/admin/employees/:employeeId/access-history', { // Nueva ruta para el historial
                templateUrl: 'js/app/views/admin/employees/access-history.html',
                controller: 'EmployeeAccessHistoryController',
                controllerAs: 'vm',
                resolve: { authenticated: checkAdminAuth }
            })
            .when('/admin/departments', {
                templateUrl: 'js/app/views/admin/departments/list.html',
                controller: 'AdminDepartmentListController',
                controllerAs: 'vm',
                resolve: { authenticated: checkAdminAuth }
            })
            .when('/admin/departments/create', {
                templateUrl: 'js/app/views/admin/departments/create.html',
                controller: 'AdminDepartmentCreateController',
                controllerAs: 'vm',
                resolve: { authenticated: checkAdminAuth }
            })
            .when('/admin/admins', {
                templateUrl: 'js/app/views/admin/admins/list.html',
                controller: 'AdminAdminsListController',
                controllerAs: 'vm',
                resolve: { authenticated: checkAdminAuth }
            })
            .when('/admin/security/failed-identifier-attempts', {
                templateUrl: 'js/app/views/admin/security/failed-identifier-attempts.html', // CORREGIR ESTA RUTA
                controller: 'FailedIdentifierAttemptsController',
                controllerAs: 'vm',
                resolve: { authenticated: checkAdminAuth }
            })


            .otherwise({
                    redirectTo: '/login'
                });
            });

        function checkAdminAuth($q, $location, AdminAuthService) {
            var deferred = $q.defer();
            if (AdminAuthService.isAdminLoggedIn()) { // <--- Asegúrate que usa este método
                deferred.resolve();
            } else {
                deferred.reject();
                $location.path('/login/admin'); // O a donde deba ir si no está autenticado
            }
            return deferred.promise;
        }