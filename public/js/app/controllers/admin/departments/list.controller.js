(function () {
    angular.module('miApp')
        .controller('AdminDepartmentListController', AdminDepartmentListController);

    // Inyectar $scope para usar $on('$destroy') y $timeout para asegurar la ejecución post-digest si es necesario
    AdminDepartmentListController.$inject = [
        '$scope',
        '$location',
        'AdminDepartmentService',
        '$timeout',
        'AdminAuthService', // <--- Añadido para la función de logout
        '$log'              // <--- Añadido para la función de logout
    ];

    function AdminDepartmentListController($scope, $location, AdminDepartmentService, $timeout, AdminAuthService, $log) {
        var vm = this;
        vm.departments = [];
        vm.isLoading = false;
        vm.errorMessage = null;
        vm.searchTerm = ''; // Para el filtro de búsqueda
        // vm.pagination = { current_page: 1, per_page: 10, total: 0, last_page: 1, from: 0, to: 0 }; // Si usas paginación
        
        let createDepartmentModalTriggerButton = null;
        let editDepartmentModalTriggerButton = null;

        // Obtener elementos del DOM una vez, fuera de las funciones de handler si es posible,
        // o dentro de la función de inicialización.
        const createModalEl = document.getElementById('createDepartmentModal');
        const editModalEl = document.getElementById('editDepartmentModal');

         function forceModalCleanup() {
            // Usamos $timeout para asegurar que esto se ejecute después del ciclo de digest actual
            // y después de que Bootstrap haya intentado hacer su limpieza.
            $timeout(function() {
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) {
                    backdrop.remove();
                }
                document.body.classList.remove('modal-open');
                document.body.style.overflow = ''; // Restaurar scroll si fue modificado
                document.body.style.paddingRight = ''; // Restaurar padding si fue modificado
                $log.debug('Forced modal cleanup executed.'); // Para depuración
            }, 0, false); // El 'false' evita un nuevo ciclo de digest si no es necesario
        }

        // --- Funciones Handler para Eventos de Modales ---
        // Modal de Creación
        const showCreateModalHandler = function (event) {
            if (event.relatedTarget) {
                createDepartmentModalTriggerButton = event.relatedTarget;
                $log.info('Modal de creación de departamento (#createDepartmentModal) a punto de mostrarse, disparado por:', createDepartmentModalTriggerButton);
            }
        };
        const hideCreateModalHandler = function () {
            $log.info('Modal de creación de departamento (#createDepartmentModal) comenzando a ocultarse (hide.bs.modal).');
            if (document.activeElement && createModalEl && createModalEl.contains(document.activeElement)) {
                const activeElementInsideModal = document.activeElement;
                activeElementInsideModal.blur(); // Quitar foco del elemento dentro del modal
                document.body.focus(); // Mover el foco al body como medida segura
                $log.info('Foco quitado del elemento activo y movido temporalmente al body desde el modal de creación de departamento.');
            }
        };
        const hiddenCreateModalHandler = function () {
            $log.info('Modal de creación de departamento (#createDepartmentModal) completamente oculto (hidden.bs.modal).');
            forceModalCleanup(); // Ejecutar la limpieza del backdrop
            if (createDepartmentModalTriggerButton) {
                $log.info('Devolviendo foco a (createDepartmentModal):', createDepartmentModalTriggerButton);
                $timeout(function() {
                    createDepartmentModalTriggerButton.focus();
                    createDepartmentModalTriggerButton = null; 
                }, 0);
            } else {
                $log.warn('No se encontró el botón disparador (createDepartmentModalTriggerButton) para devolver el foco.');
            }
        };

        // Modal de Edición
        const showEditModalHandler = function (event) {
            if (event.relatedTarget) {
                editDepartmentModalTriggerButton = event.relatedTarget;
                $log.info('Modal de edición de departamento (#editDepartmentModal) a punto de mostrarse, disparado por:', editDepartmentModalTriggerButton);
            }
        };
        const hideEditModalHandler = function () {
            $log.info('Modal de edición de departamento (#editDepartmentModal) comenzando a ocultarse (hide.bs.modal).');
            if (document.activeElement && editModalEl && editModalEl.contains(document.activeElement)) {
                const activeElementInsideModal = document.activeElement;
                activeElementInsideModal.blur(); // Quitar foco del elemento dentro del modal
                document.body.focus(); // Mover el foco al body como medida segura
                $log.info('Foco movido temporalmente al body desde el modal de edición de departamento.');
            }
        };
        const hiddenEditModalHandler = function () {
            $log.info('Modal de edición de departamento (#editDepartmentModal) completamente oculto (hidden.bs.modal).');
            forceModalCleanup(); // Ejecutar la limpieza del backdrop
            if (editDepartmentModalTriggerButton) {
                $log.info('Devolviendo foco a (editDepartmentModal):', editDepartmentModalTriggerButton);
                $timeout(function() {
                    editDepartmentModalTriggerButton.focus();
                    editDepartmentModalTriggerButton = null;
                }, 0);
            } else {
                $log.warn('No se encontró el botón disparador (editDepartmentModalTriggerButton) para devolver el foco.');
            }
        };

        function initializeDepartmentModalLogic() {
            if (createModalEl) {
                createModalEl.addEventListener('show.bs.modal', showCreateModalHandler);
                createModalEl.addEventListener('hide.bs.modal', hideCreateModalHandler);
                createModalEl.addEventListener('hidden.bs.modal', hiddenCreateModalHandler);
            } else {
                $log.warn("Elemento del modal #createDepartmentModal no encontrado para la gestión de foco y limpieza.");
            }

            if (editModalEl) {
                editModalEl.addEventListener('show.bs.modal', showEditModalHandler);
                editModalEl.addEventListener('hide.bs.modal', hideEditModalHandler);
                editModalEl.addEventListener('hidden.bs.modal', hiddenEditModalHandler);
            } else {
                $log.warn("Elemento del modal #editDepartmentModal no encontrado para la gestión de foco y limpieza.");
            }
        }

        // --- Inicialización del controlador ---
        getDepartments();
        $timeout(initializeDepartmentModalLogic, 0); // Inicializar lógica de modales después de que el DOM esté listo

        // Los antiguos listeners directos para forceModalCleanup deben ser eliminados
        // if (createModalEl) createModalEl.removeEventListener('hidden.bs.modal', forceModalCleanup);
        // if (editModalEl) editModalEl.removeEventListener('hidden.bs.modal', forceModalCleanup);

        vm.createDepartment = function () {
            // Esta función ya no se usa si la creación es por modal,
            // pero la dejamos por si tienes otro flujo.
            $location.path('/admin/departments/create');
        };

        vm.goBackToEmployees = function () {
            $location.path('/admin/employees');
        };

        vm.isActive = function (viewLocation) {
            // $location.path() devuelve la ruta actual sin el #!
            return viewLocation === $location.path();
        };

        vm.openCreateDepartmentModal = function () {
            vm.newDepartment = {}; // Resetea el objeto para un nuevo departamento
            vm.createSuccessMessage = null;
            vm.createErrorMessage = null;
            vm.createValidationErrors = null;

            if (vm.createDepartmentForm) {
                vm.createDepartmentForm.$setPristine();
                vm.createDepartmentForm.$setUntouched();
            }
            var createModal = new bootstrap.Modal(document.getElementById('createDepartmentModal'));
            createModal.show();
        };

        vm.newDepartment = {}; // Objeto para el nuevo departamento
        vm.isSavingNewDepartment = false;

        vm.saveNewDepartment = function () {
            if (vm.createDepartmentForm.$invalid) {
                // Marcar campos como tocados para mostrar errores si es necesario
                angular.forEach(vm.createDepartmentForm.$error, function (field) {
                    angular.forEach(field, function (errorField) {
                        errorField.$setTouched();
                    });
                });
                vm.createErrorMessage = "Por favor, corrige los errores en el formulario.";
                return;
            }

            vm.isSavingNewDepartment = true;
            vm.createSuccessMessage = null;
            vm.createErrorMessage = null;
            vm.createValidationErrors = null;

            AdminDepartmentService.createDepartment(vm.newDepartment)
                .then(function (response) {
                    vm.createSuccessMessage = 'Departamento creado exitosamente.';
                    // vm.departments.push(response.data); // Opcional si recargas toda la lista
                    getDepartments(); // Recarga la lista

                    // Cerrar el modal
                    var createModalElement = document.getElementById('createDepartmentModal');
                    if (createModalElement) {
                        var modalInstance = bootstrap.Modal.getInstance(createModalElement);
                        if (modalInstance) {
                            modalInstance.hide();
                            // La limpieza manual ya no es necesaria aquí directamente, se hará en el listener
                        } else {
                            console.warn('No se pudo obtener la instancia del modal de creación para cerrar.');
                        }
                    } else { // Este else corresponde al if (createModalElement)
                        console.error('Elemento del modal de creación de departamento no encontrado.');
                    }
                    vm.newDepartment = {}; // Limpia el formulario
                })
                .catch(function (error) {
                    vm.createErrorMessage = 'Error al crear el departamento.';
                    if (error.data && error.data.errors) {
                        vm.createValidationErrors = error.data.errors;
                        // Podrías formatear vm.createErrorMessage más detalladamente aquí
                    } else if (error.data && error.data.message) {
                        vm.createErrorMessage = error.data.message;
                    }
                    console.error("Error creando departamento:", error);
                })
                .finally(function () {
                    vm.isSavingNewDepartment = false;
                });
        };

        vm.departmentToEdit = null; // Objeto para el departamento que se está editando

        vm.openEditDepartmentModal = function (department) {
            // Es importante usar angular.copy para no modificar directamente el objeto en la lista
            // hasta que se guarden los cambios.
            vm.departmentToEdit = angular.copy(department);
            vm.editSuccessMessage = null;
            vm.editErrorMessage = null;
            vm.editValidationErrors = null;

            if (vm.editDepartmentForm) {
                vm.editDepartmentForm.$setPristine();
                vm.editDepartmentForm.$setUntouched();
            }
            var editModal = new bootstrap.Modal(document.getElementById('editDepartmentModal'));
            editModal.show();
        };

        vm.isSavingEditedDepartment = false;

        vm.updateExistingDepartment = function () {
            if (!vm.departmentToEdit || vm.editDepartmentForm.$invalid) {
                angular.forEach(vm.editDepartmentForm.$error, function (field) {
                    angular.forEach(field, function (errorField) {
                        errorField.$setTouched();
                    });
                });
                vm.editErrorMessage = "Por favor, corrige los errores en el formulario.";
                return;
            }

            vm.isSavingEditedDepartment = true;
            vm.editSuccessMessage = null;
            vm.editErrorMessage = null;
            vm.editValidationErrors = null;

            // Lógica para llamar al servicio/API que actualiza el departamento
            AdminDepartmentService.updateDepartment(vm.departmentToEdit.id, vm.departmentToEdit)
                .then(function (response) {
                    vm.editSuccessMessage = 'Departamento actualizado exitosamente.';
                    // Actualizar la lista de departamentos o recargarla
                    getDepartments(); // Recarga la lista
                    // Cerrar el modal
                    var editModalElement = document.getElementById('editDepartmentModal');
                    if (editModalElement) {
                        var modalInstance = bootstrap.Modal.getInstance(editModalElement);
                        if (modalInstance) {
                            modalInstance.hide();
                            // La limpieza manual ya no es necesaria aquí directamente, se hará en el listener
                        } else {
                             console.warn('No se pudo obtener la instancia del modal de edición para cerrar.');
                        }
                    } else {
                        console.error('Elemento del modal de edición de departamento no encontrado para cerrar.');
                    }
                })
                .catch(function (error) {
                    vm.editErrorMessage = 'Error al actualizar el departamento.';
                    if (error.data && error.data.errors) {
                        vm.editValidationErrors = error.data.errors;
                    } else if (error.data && error.data.message) {
                        vm.editErrorMessage = error.data.message;
                    }
                    console.error("Error actualizando departamento:", error);
                })
                .finally(function () {
                    vm.isSavingEditedDepartment = false;
                });
        };

        vm.confirmDeleteDepartment = function(department) {
            // Aquí podrías usar un modal de confirmación más elegante o window.confirm
            if (window.confirm('¿Estás seguro de que deseas eliminar el departamento "' + department.name + '"? Esta acción no se puede deshacer.')) {
                vm.deleteDepartment(department.id);
            }
        };

        vm.deleteDepartment = function(departmentId) {
            vm.isLoading = true;
            vm.errorMessage = null;
            AdminDepartmentService.deleteDepartment(departmentId)
                .then(function(response) {
                    // Podrías mostrar un mensaje de éxito temporal si lo deseas
                    // vm.successMessage = 'Departamento eliminado exitosamente.';
                    getDepartments(); // Recarga la lista
                })
                .catch(function(error) {
                    vm.errorMessage = 'Error al eliminar el departamento.';
                    if (error.data && error.data.message) {
                        vm.errorMessage = error.data.message;
                    }
                    console.error('Error eliminando departamento:', error);
                })
                .finally(function() {
                    vm.isLoading = false;
                });
        };

        // Funciones para filtros (si las necesitas según tu HTML)
        vm.applyFilters = function() {
            // Lógica para aplicar filtros, probablemente llamar a getDepartments con parámetros
            getDepartments(); // O una versión de getDepartments que acepte filtros
        };

        vm.clearFilters = function() {
            vm.searchTerm = '';
            // Limpiar otros filtros si los tienes
            getDepartments();
        };

        function getDepartments() {
            vm.isLoading = true;
            vm.errorMessage = null;
            // Aquí podrías pasar vm.searchTerm y parámetros de paginación si tu API los soporta
            AdminDepartmentService.getDepartments(/* { search: vm.searchTerm, page: vm.pagination.current_page } */)
                .then(function (response) {
                    console.log('AdminDepartmentListController - Respuesta de getDepartments:', response);
                    vm.departments = response.data.data || response.data; // Ajusta según la estructura de tu API (si usa paginación Laravel, será response.data.data)
                    // Si tu API devuelve datos de paginación:
                    // vm.pagination.total = response.data.total;
                    // vm.pagination.per_page = response.data.per_page;
                    // vm.pagination.current_page = response.data.current_page;
                    // vm.pagination.last_page = response.data.last_page;
                    // vm.pagination.from = response.data.from;
                    // vm.pagination.to = response.data.to;
                    console.log('AdminDepartmentListController - vm.departments asignados:', vm.departments);
                })
                .catch(function (error) {
                    console.error('AdminDepartmentListController - Error al cargar departamentos:', error); // DEBUG
                    vm.errorMessage = 'Error al cargar los departamentos. Por favor, inténtelo de nuevo más tarde.';
                })
                .finally(function() {
                    vm.isLoading = false;
                });
        }
         // Limpiar event listeners cuando el controlador se destruye
        $scope.$on('$destroy', function() {
            if (createModalEl) {
                createModalEl.removeEventListener('show.bs.modal', showCreateModalHandler);
                createModalEl.removeEventListener('hide.bs.modal', hideCreateModalHandler);
                createModalEl.removeEventListener('hidden.bs.modal', hiddenCreateModalHandler);
            }
            if (editModalEl) {
                editModalEl.removeEventListener('show.bs.modal', showEditModalHandler);
                editModalEl.removeEventListener('hide.bs.modal', hideEditModalHandler);
                editModalEl.removeEventListener('hidden.bs.modal', hiddenEditModalHandler);
            }
            // Los antiguos listeners para forceModalCleanup ya no deberían estar si se eliminaron las líneas que los añadían.
            // Si aún existen, también deberían removerse aquí.
        });

        vm.logout = function() {
            var logoutPromise;
            $log.info("Iniciando proceso de logout desde AdminDepartmentsListController...");

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
                    .then(function(response) {
                        $log.info('Promesa de AdminAuthService.logout() resuelta exitosamente:', response);
                        performLocalLogoutAndRedirect();
                    })
                    .catch(function(error) {
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