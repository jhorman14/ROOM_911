(function () {
    angular.module('miApp')
        .controller('AdminAdminsListController', AdminAdminsListController);

    AdminAdminsListController.$inject = [
        '$scope',
        '$location',
        '$timeout',
        'AdminAdminsService',
        'AdminAuthService', // <--- Añadido para la función de logout
        '$log'              // <--- Añadido para la función de logout
    ];
    function AdminAdminsListController($scope, $location, $timeout, AdminAdminsService, AdminAuthService, $log) {
        var vm = this;
        vm.admins = []; // Aquí se cargarán los administradores
        vm.isLoading = false;
        vm.errorMessage = null;
        vm.newAdmin = { username: '', password: '', password_confirmation: '' };
        vm.isSavingNewAdmin = false;

        let createAdminModalTriggerButton = null;
        const createAdminModalEl = document.getElementById('createAdminModal'); // Obtener el elemento del modal

        // --- Funciones de Navegación y Estado (similares a otros controladores) ---
        vm.isActive = function (viewLocation) {
            return viewLocation === $location.path();
        };

        // --- Lógica de CRUD (esqueleto) ---

        function getAdmins() {
            vm.isLoading = true;
            vm.errorMessage = null;

            AdminAdminsService.getAdmins()
                .then(function (response) {
                    // Ajusta 'response.data.data' o 'response.data' según cómo tu API devuelva la lista
                    vm.admins = response.data.data || [];
                    console.log('AdminAdminsListController - Administradores cargados:', vm.admins);
                })
                .catch(function (error) {
                    vm.errorMessage = 'Error al cargar los administradores.';
                    console.error('Error cargando administradores:', error);
                })
                .finally(function () {
                    vm.isLoading = false;
                });

        }

        vm.openCreateAdminModal = function () {
            vm.newAdmin = {};
            vm.createSuccessMessage = null;
            vm.createErrorMessage = null;
            vm.createValidationErrors = null;
            if (vm.createAdminForm) {
                vm.createAdminForm.$setPristine();
                vm.createAdminForm.$setUntouched();
            }
            var createModal = new bootstrap.Modal(document.getElementById('createAdminModal'));
            createModal.show();
        };

        vm.saveNewAdmin = function () {
            if (vm.createAdminForm.$invalid) {
                angular.forEach(vm.createAdminForm.$error, function (field) {
                    angular.forEach(field, function (errorField) { errorField.$setTouched(); });
                });
                vm.createErrorMessage = "Por favor, corrige los errores en el formulario.";
                return;
            }
            vm.isSavingNewAdmin = true;
            vm.createSuccessMessage = null;
            vm.createErrorMessage = null;
            vm.createValidationErrors = null;

            AdminAdminsService.createAdmin(vm.newAdmin)
                .then(function (response) {
                    vm.createSuccessMessage = 'Administrador creado exitosamente.';
                    getAdmins();
                    var modalInstance = bootstrap.Modal.getInstance(document.getElementById('createAdminModal'));
                    if (modalInstance) {
                        modalInstance.hide(); // Esto disparará 'hidden.bs.modal' y forceModalCleanup
                    }
                    vm.newAdmin = {};
                })
                .catch(function (error) {
                    vm.createErrorMessage = 'Error al crear el administrador.';
                    if (error.data && error.data.errors) {
                        vm.createValidationErrors = error.data.errors;
                    }
                    else if (error.data && error.data.message) vm.createErrorMessage = error.data.message;
                })
                .finally(function () {
                    vm.isSavingNewAdmin = false;
                });

        };

        vm.confirmDeleteAdmin = function (admin) {
            if (window.confirm('¿Estás seguro de que deseas eliminar al administrador "' + admin.name + '"?')) {
                vm.deleteAdmin(admin.id);
            }
        };

        vm.deleteAdmin = function (adminId) {
            //vm.isLoading = true; // Podrías tener un vm.isDeletingAdmin
            AdminAdminsService.deleteAdmin(adminId)
                .then(function (response) {
                    // vm.deleteSuccessMessage = 'Administrador eliminado exitosamente.';
                    getAdmins(); // Recargar la lista
                })
                .catch(function (error) {
                    vm.errorMessage = 'Error al eliminar el administrador.';
                    if (error.data && error.data.message) {
                        vm.errorMessage = error.data.message;
                    }
                    console.error('Error eliminando administrador:', error);
                })
            //.finally(function() {
            //    vm.isLoading = false;
            //});
        };

        function forceModalCleanup() {
            $timeout(function () {
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) backdrop.remove();
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
                $log.debug('AdminAdminsListController - Forced modal cleanup executed.');
            }, 0, false);
        }

        // --- Funciones Handler para Eventos del Modal de Creación de Admin ---
        const showCreateAdminModalHandler = function (event) {
            if (event.relatedTarget) {
                createAdminModalTriggerButton = event.relatedTarget;
                $log.info('Modal de creación de admin (#createAdminModal) a punto de mostrarse, disparado por:', createAdminModalTriggerButton);
            }
        };

        const hideCreateAdminModalHandler = function () {
            $log.info('Modal de creación de admin (#createAdminModal) comenzando a ocultarse (hide.bs.modal).');
            if (document.activeElement && createAdminModalEl && createAdminModalEl.contains(document.activeElement)) {
                const activeElementInsideModal = document.activeElement;
                activeElementInsideModal.blur(); // Quitar foco del elemento dentro del modal
                document.body.focus(); // Mover el foco al body como medida segura
                $log.info('Foco quitado del elemento activo y movido temporalmente al body desde el modal de creación de admin.');
            }
        };

        const hiddenCreateAdminModalHandler = function () {
            $log.info('Modal de creación de admin (#createAdminModal) completamente oculto (hidden.bs.modal).');
            forceModalCleanup(); // Ejecutar la limpieza del backdrop que ya tenías
            if (createAdminModalTriggerButton) {
                $log.info('Devolviendo foco a (createAdminModal):', createAdminModalTriggerButton);
                $timeout(function() {
                    createAdminModalTriggerButton.focus();
                    createAdminModalTriggerButton = null; 
                }, 0);
            } else {
                $log.warn('No se encontró el botón disparador (createAdminModalTriggerButton) para devolver el foco.');
            }
        };

        function initializeAdminModalLogic() {
            if (createAdminModalEl) {
                createAdminModalEl.addEventListener('show.bs.modal', showCreateAdminModalHandler);
                createAdminModalEl.addEventListener('hide.bs.modal', hideCreateAdminModalHandler);
                createAdminModalEl.addEventListener('hidden.bs.modal', hiddenCreateAdminModalHandler);
            } else {
                $log.warn("Elemento del modal #createAdminModal no encontrado para la gestión de foco y limpieza.");
            }
            // Si tuvieras un modal de edición de admin, añadirías su lógica aquí también.
        }

        // --- Inicialización ---
        getAdmins();
        $timeout(initializeAdminModalLogic, 0); // Inicializar lógica de modales después de que el DOM esté listo

        vm.goBackToEmployees = function () {
            $location.path('/admin/employees'); // O la ruta a la que quieras volver
        };

        $scope.$on('$destroy', function () {
            if (createAdminModalEl) {
                createAdminModalEl.removeEventListener('show.bs.modal', showCreateAdminModalHandler);
                createAdminModalEl.removeEventListener('hide.bs.modal', hideCreateAdminModalHandler);
                createAdminModalEl.removeEventListener('hidden.bs.modal', hiddenCreateAdminModalHandler);
            }
        });

        vm.logout = function () {
            var logoutPromise;
            $log.info("Iniciando proceso de logout...");

            // Intenta llamar al servicio de logout del backend si está disponible
            if (AdminAuthService && typeof AdminAuthService.logout === 'function') {
                try {
                    $log.info("Llamando a AdminAuthService.logout()...");
                    logoutPromise = AdminAuthService.logout(); // Asume que esto devuelve una promesa
                } catch (e) {
                    $log.error("Error síncrono al llamar a AdminAuthService.logout():", e);
                    // logoutPromise seguirá siendo undefined o no será una promesa.
                }
            } else {
                $log.warn("AdminAuthService.logout no es una función o AdminAuthService no está disponible. Procediendo con logout local.");
            }

            function performLocalLogoutAndRedirect() {
                $log.info("Ejecutando performLocalLogoutAndRedirect...");
                localStorage.removeItem('adminAuthToken');
                $log.info('Token de autenticación "adminAuthToken" removido de localStorage.');

                var targetLoginPath = '/login/admin'; // Asegúrate que esta es tu ruta de login de admin
                $log.info('Redirigiendo a: ' + targetLoginPath);
                $location.path(targetLoginPath);

                // Opcional: Forzar un ciclo de digest si la redirección no ocurre inmediatamente
                // if (!$scope.$$phase) { $scope.$apply(); }
            }

            if (logoutPromise && typeof logoutPromise.then === 'function') {
                // Si el servicio devolvió una promesa, esperar a que se complete
                logoutPromise
                    .then(function (response) {
                        $log.info('Promesa de AdminAuthService.logout() resuelta exitosamente:', response);
                        performLocalLogoutAndRedirect();
                    })
                    .catch(function (error) {
                        $log.error('Promesa de AdminAuthService.logout() rechazada con error:', error);
                        $log.info('Procediendo con logout local y redirección de todas formas debido al error en la promesa del servicio.');
                        performLocalLogoutAndRedirect();
                    });
            } else {
                // Si no hubo promesa del servicio (no existe, no es función, falló síncronamente, o no devolvió promesa)
                $log.info("No hubo promesa de AdminAuthService.logout() o falló. Ejecutando logout local y redirección directamente.");
                performLocalLogoutAndRedirect();
            }
        };
    }
})();