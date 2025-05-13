(function() {
    angular.module('miApp')
        .controller('AdminEmployeeListController', AdminEmployeeListController);

        AdminEmployeeListController.$inject = [
            '$scope',
            '$location',
            'AdminEmployeeService',
            'AdminAuthService',
            '$q',      // <--- Añadido
            '$http',   // <--- Añadido
            '$timeout',
            '$log' 
        ];

        function AdminEmployeeListController($scope, $location, AdminEmployeeService, AdminAuthService, $q, $http, $timeout, $log) {

        var vm = this;
        console.log("Contexto 'this':", this);
        let createModalTriggerButton = null; // Para guardar el botón que abrió el modal de creación
        let editModalTriggerButton = null; // Para guardar el botón que abrió el modal de edición
        console.log("Tipo de 'vm' después de asignación:", typeof vm, vm); // Debería ser 'object' y mostrar la instancia
        vm.employees = [];
        vm.pagination = {}; // Para guardar datos de paginación
        vm.departmentMap = {}; // Para mapear department_id a department.name
        vm.departments = [];   // Para poblar el <select> de departamentos

        vm.isLoading = true; // Para mostrar un indicador de carga
        vm.errorMessage = null; // Para mostrar mensajes de error

        // Variables para los filtros
        vm.searchTerm = ''; // Para la barra de búsqueda de texto
        vm.selectedDepartmentId = ''; // Para el ID del departamento seleccionado en el <select>
        vm.filterStartDate = null; // Para la fecha de inicio del filtro
        vm.filterEndDate = null;   // Para la fecha de fin del filtro

        // Variables para la carga de CSV
        vm.selectedCsvFile = null;
        vm.isUploadingCsv = false;
        vm.csvUploadMessage = null;
        vm.csvUploadSuccess = false;

        // Variables para el modal de creación de empleado
        vm.newEmployee = {}; // Objeto para el nuevo empleado
        vm.isSavingNewEmployee = false;
        vm.createErrorMessage = null;
        vm.createValidationErrors = null;
        vm.createSuccessMessage = null;

        // Variables para el modal de edición de empleado
        vm.employeeToEdit = null; // Objeto para el empleado que se está editando
        vm.isSavingEditedEmployee = false;
        vm.editErrorMessage = null;
        vm.editValidationErrors = null;
        vm.editSuccessMessage = null;

         // Se cargan los departamentos una vez y luego los empleados con los filtros iniciales (ninguno)
        loadInitialData();

        vm.openCreateEmployeeModal = function() {
            // Resetear el formulario y mensajes del modal de creación
            vm.newEmployee = {};
            vm.isSavingNewEmployee = false;
            vm.createErrorMessage = null;
            vm.createValidationErrors = null;
            vm.createSuccessMessage = null;
            if (vm.createEmployeeForm) { // vm.createEmployeeForm es el nombre del formulario en el HTML del modal
                vm.createEmployeeForm.$setPristine();
                vm.createEmployeeForm.$setUntouched();
            }
            // Los departamentos (vm.departments) ya deberían estar cargados por loadInitialData
            // y disponibles para el select en el modal.
            $log.info("Abriendo modal para crear empleado.");
        };

        vm.openEditEmployeeModal = function(employee) {
            // Hacemos una copia para no modificar el objeto original en la lista directamente
            // hasta que se guarde.
            vm.employeeToEdit = angular.copy(employee);
            // Asegurarse de que department_id sea un número si viene como string o si el objeto department está presente
            if (vm.employeeToEdit.department && vm.employeeToEdit.department.id) {
                vm.employeeToEdit.department_id = vm.employeeToEdit.department.id;
            } else if (typeof vm.employeeToEdit.department_id === 'string') {
                vm.employeeToEdit.department_id = parseInt(vm.employeeToEdit.department_id, 10);
            }

            vm.isSavingEditedEmployee = false;
            vm.editErrorMessage = null;
            vm.editValidationErrors = null;
            vm.editSuccessMessage = null;
            if (vm.editEmployeeForm) { // vm.editEmployeeForm es el nombre del formulario en el HTML del modal
                vm.editEmployeeForm.$setPristine();
                vm.editEmployeeForm.$setUntouched();
            }
            $log.info("Abriendo modal para editar empleado:", angular.copy(vm.employeeToEdit));
        };

        // La función vm.editEmployee() original que redirigía ya no es necesaria
        // si el botón ahora solo abre el modal. Se reemplaza por openEditEmployeeModal.
        // vm.editEmployee = function(employeeId) { ... } // Esta se elimina o comenta

        vm.reloadEmployees = function() {
            $log.info("Recargando datos de empleados y departamentos...");
            // Recargar empleados con los filtros actuales y en la página actual
            loadEmployees(vm.pagination.current_page);
        };

        // Funciones para la carga de CSV
        vm.handleFileSelect = function(files) {
            if (files && files.length > 0) {
                vm.selectedCsvFile = files[0];
                vm.csvUploadMessage = null; // Limpiar mensajes previos
                $log.info("Archivo CSV seleccionado:", vm.selectedCsvFile.name);
                if (!$scope.$$phase) { // Necesitas $scope aquí o inyectarlo si no está
                    $scope.$apply();
                }
            }
        };

        vm.submitCsvFile = function() {
            if (!vm.selectedCsvFile) {
                vm.csvUploadMessage = "Por favor, seleccione un archivo CSV.";
                vm.csvUploadSuccess = false;
                return;
            }

            vm.isUploadingCsv = true;
            vm.csvUploadMessage = "Subiendo y procesando archivo...";
            vm.csvUploadSuccess = false;

            var token = localStorage.getItem('adminAuthToken');
            if (!token) {
                vm.csvUploadMessage = "Error: No autenticado. Por favor, inicie sesión de nuevo.";
                vm.csvUploadSuccess = false;
                vm.isUploadingCsv = false;
                // Opcional: redirigir al login
                // $location.path('/login/admin');
                return;
            }

            var formData = new FormData();
            formData.append('csv_file', vm.selectedCsvFile); // 'csv_file' debe coincidir con el nombre esperado en el backend

            $log.info("Enviando archivo CSV:", vm.selectedCsvFile.name);

            $http.post('/api/employees/upload-csv', formData, {
                transformRequest: angular.identity, // Deja que el navegador maneje la serialización de FormData
                headers: {
                    'Content-Type': undefined, // Deja que el navegador establezca el Content-Type con el boundary correcto
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json' // Esperamos una respuesta JSON del servidor
                }
            }).then(function(response) {
                vm.csvUploadSuccess = true;
                vm.csvUploadMessage = response.data.message || "Archivo CSV procesado exitosamente.";
                $log.info("Respuesta del servidor (CSV upload):", response.data);
                loadEmployees(1); // Recargar la lista de empleados para ver los cambios
                // Limpiar el input de archivo y el archivo seleccionado
                vm.selectedCsvFile = null;
                var csvFileInput = document.getElementById('csvFile'); // Asegúrate de que tu input file tenga id="csvFile"
                if (csvFileInput) {
                    csvFileInput.value = null;
                }
            }).catch(function(errorResponse) {
                vm.csvUploadSuccess = false;
                vm.csvUploadMessage = "Error al subir el archivo CSV: " + (errorResponse.data ? (errorResponse.data.message || (errorResponse.data.error ? errorResponse.data.error : "Error desconocido del servidor")) : (errorResponse.statusText || "Error de red"));
                if (errorResponse.data && errorResponse.data.errors) {
                    // Si tu backend devuelve errores de validación específicos para el CSV
                    $log.error("Errores de validación del CSV:", errorResponse.data.errors);
                }
                $log.error("Error en la subida del CSV:", errorResponse);
            }).finally(function() {
                vm.isUploadingCsv = false;
            });
        };

        vm.toggleAccess = function(employee) {
            var token = localStorage.getItem('adminAuthToken');
            if (!token) {
                vm.errorMessage = "No autenticado. Redirigiendo al login...";
                $location.path('/login/admin');
                return;
            }

            // var originalAccessState = employee.access_enabled; // Podríamos usarlo si actualizamos UI antes

            $http({
                method: 'PATCH',
                url: '/api/employees/' + employee.id + '/toggle-access',
                headers: { 'Authorization': 'Bearer ' + token }
            }).then(function(response) {
                // El backend devuelve el empleado actualizado, así que usamos ese estado
                employee.access_enabled = response.data.employee.access_enabled;
                $log.info('Acceso cambiado para empleado ID:', employee.id, 'Nuevo estado:', employee.access_enabled);
            }).catch(function(errorResponse) {
                vm.errorMessage = "Error al cambiar el acceso: " + (errorResponse.data ? errorResponse.data.message : errorResponse.statusText);
                $log.error('Error al cambiar el acceso:', errorResponse);
            });
        };

        vm.logout = function() {
            var logoutPromise;

            if (AdminAuthService && typeof AdminAuthService.logout === 'function') {
                try {
                    // Llamar al servicio de logout y capturar la promesa si la devuelve
                    logoutPromise = AdminAuthService.logout();
                    $log.info("AdminAuthService.logout() llamado.");
                } catch (e) {
                    $log.error("Error síncrono al llamar a AdminAuthService.logout():", e);
                    // logoutPromise seguirá siendo undefined o no será una promesa.
                }
            } else {
                $log.warn("AdminAuthService.logout no es una función o AdminAuthService no está disponible.");
            }

            function performLocalLogoutAndRedirect() {
                $log.info("Ejecutando performLocalLogoutAndRedirect...");
                localStorage.removeItem('adminAuthToken'); // <--- CAMBIO AQUÍ
                $log.info('Token de autenticación removido.');

                // ----- ¡ACCIÓN IMPORTANTE PARA TI! -----
                // Verifica que '/login/admin' sea la ruta correcta para tu "loginselector".
                // Si tu "loginselector" está en una ruta diferente, por ejemplo '/selector-de-login' o '/auth/login',
                // debes cambiar la siguiente línea:
                var targetLoginPath = '/login/admin'; 
                // Por ejemplo, si tu loginselector está en '/auth/selector', cambia a:
                // var targetLoginPath = '/mi-login';
                // -----------------------------------------

                $log.info('Intentando redirigir a: ' + targetLoginPath);
                $location.path(targetLoginPath);
                
                // Opcional: Si $location.path no actualiza la vista inmediatamente (raro pero posible)
                // if (!$scope.$$phase) { $scope.$apply(); }
            }

            if (logoutPromise && typeof logoutPromise.then === 'function') {
                // Si el servicio devolvió una promesa, esperar a que se complete
                logoutPromise
                    .then(function() {
                        $log.info('Promesa de AdminAuthService.logout() resuelta exitosamente.');
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

        vm.goToDepartments = function() {
            $location.path('/admin/departments');
        };
        // Funciones para manejar los filtros desde el HTML

        vm.viewAccessHistory = function(employeeId, employeeFullName) {
            $log.info("Navegando al historial de acceso para el empleado ID:", employeeId);
            // Pasamos el nombre como parámetro de ruta opcional para mostrarlo en la página de historial
            $location.path('/admin/employees/' + employeeId + '/access-history').search({ employeeName: employeeFullName });
        };
        vm.applyFilters = function() {
            $log.info("Aplicando filtros. Término:", vm.searchTerm, "Departamento ID:", vm.selectedDepartmentId);
            loadEmployees(1); // Al aplicar filtros, siempre ir a la página 1
        };

        vm.clearFilters = function() {
            $log.info("Limpiando filtros.");
            vm.searchTerm = '';
            vm.selectedDepartmentId = '';
            vm.filterStartDate = null;
            vm.filterEndDate = null;
            vm.csvUploadMessage = null; // Limpiar mensaje de carga CSV también
            vm.selectedCsvFile = null;
            var csvFileInput = document.getElementById('csvFile');
            if (csvFileInput) { csvFileInput.value = null; }
            loadEmployees(1); // Cargar todos los empleados desde la página 1
        };

        vm.saveNewEmployee = function() {
            vm.isSavingNewEmployee = true;
            vm.createErrorMessage = null;
            vm.createValidationErrors = null;
            vm.createSuccessMessage = null;
            var token = localStorage.getItem('adminAuthToken'); // Asumiendo que usas este token

            if (!token) {
                vm.createErrorMessage = "No autenticado.";
                // Podrías redirigir o simplemente mostrar el error en el modal
                vm.isSavingNewEmployee = false;
                return;
            }

            $log.info("Intentando guardar nuevo empleado:", angular.copy(vm.newEmployee));

            $http({
                method: 'POST',
                url: '/api/employees', // Endpoint para crear empleados
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                },
                data: vm.newEmployee
            }).then(function(response) {
                vm.createSuccessMessage = "Empleado creado exitosamente!";
                vm.newEmployee = {}; // Limpiar el formulario del modal
                if (vm.createEmployeeForm) {
                    vm.createEmployeeForm.$setPristine();
                    vm.createEmployeeForm.$setUntouched();
                }
                loadEmployees(1); // Recargar la lista de empleados para ver el nuevo
                // Opcional: cerrar el modal después de un breve retraso
                $timeout(function() {
                    var createModal = bootstrap.Modal.getInstance(document.getElementById('createEmployeeModal'));
                    if (createModal) { createModal.hide(); }
                    vm.createSuccessMessage = null; // Limpiar mensaje para la próxima vez que se abra el modal
                }, 1500);
            }).catch(function(errorResponse) {
                vm.createErrorMessage = "Error al crear el empleado: " + (errorResponse.data ? (errorResponse.data.message || "Error del servidor.") : "Error del servidor.");
                if (errorResponse.data && errorResponse.data.errors) {
                    vm.createValidationErrors = errorResponse.data.errors;
                }
                $log.error("Error al guardar nuevo empleado:", errorResponse);
            }).finally(function() {
                vm.isSavingNewEmployee = false;
            });
        };

        vm.updateExistingEmployee = function() {
            if (!vm.employeeToEdit || !vm.employeeToEdit.id) {
                vm.editErrorMessage = "No hay empleado seleccionado para editar.";
                return;
            }
            vm.isSavingEditedEmployee = true;
            vm.editErrorMessage = null;
            vm.editValidationErrors = null;
            vm.editSuccessMessage = null;
            var token = localStorage.getItem('adminAuthToken');

            $log.info("Intentando actualizar empleado:", angular.copy(vm.employeeToEdit));

            $http({
                method: 'PUT', // O PATCH, según tu API
                url: '/api/employees/' + vm.employeeToEdit.id,
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                },
                data: vm.employeeToEdit
            }).then(function(response) {
                vm.editSuccessMessage = "Empleado actualizado exitosamente!";
                // No limpiamos vm.employeeToEdit aquí, por si el usuario quiere hacer más cambios
                // o para que el modal siga mostrando los datos actualizados.
                loadEmployees(vm.pagination.current_page || 1); // Recargar la lista
                $timeout(function() {
                    var editModal = bootstrap.Modal.getInstance(document.getElementById('editEmployeeModal'));
                    if (editModal) { editModal.hide(); }
                    vm.editSuccessMessage = null; // Limpiar mensaje para la próxima vez
                }, 1500);
            }).catch(function(errorResponse) {
                vm.editErrorMessage = "Error al actualizar el empleado: " + (errorResponse.data ? (errorResponse.data.message || "Error del servidor.") : "Error del servidor.");
                if (errorResponse.data && errorResponse.data.errors) {
                    vm.editValidationErrors = errorResponse.data.errors;
                }
                $log.error("Error al actualizar empleado:", errorResponse);
            }).finally(function() {
                vm.isSavingEditedEmployee = false;
            });
        };






        vm.isActive = function (viewLocation) {
            // $location.path() devuelve la ruta actual sin el #!
            return viewLocation === $location.path();
        };


        function loadInitialData() {
            vm.isLoading = true;
            vm.errorMessage = null;

            // --- BLOQUE DE AUTENTICACIÓN ---
            var token = localStorage.getItem('adminAuthToken'); // <--- CAMBIO AQUÍ
            if (!token) { // Si no hay token, redirigir al login
                vm.errorMessage = "No autenticado. Redirigiendo al login...";
                $log.warn("No se encontró 'adminAuthToken' en localStorage. Redirigiendo a /login/admin.");
                $location.path('/login/admin'); // Asegúrate que esta es tu ruta de login
                vm.isLoading = false; // Detener la carga ya que vamos a redirigir
                return; // Salir de loadData para evitar más ejecuciones
            }
            // Si llegamos aquí, hay un token. Continuamos con la carga de datos.
            $log.info("Token 'adminAuthToken' encontrado en localStorage. Procediendo a cargar datos.");
            var headers = {};
            if (token) {
                headers['Authorization'] = 'Bearer ' + token;
            }
            // Cargar la lista de departamentos para el <select>
            var departmentsPromise = $http({
                method: 'GET',
                url: '/api/departments', 
                headers: headers // Usar el token si la API de departamentos lo requiere
            });

            departmentsPromise.then(function(departmentResponse) {
                if (departmentResponse.data && angular.isArray(departmentResponse.data)) {
                    vm.departments = departmentResponse.data; // Para el <select> ng-options
                    // También actualizamos el departmentMap por si acaso
                    vm.departmentMap = {};
                    departmentResponse.data.forEach(function(dept) {
                        vm.departmentMap[dept.id] = dept.name;
                    });
                    $log.info("Lista de departamentos cargada para el select.");
                } else {
                    $log.warn("Respuesta de departamentos no es un array o no tiene datos:", departmentResponse);
                    vm.departments = []; // Asegurar que sea un array vacío si falla
                }
                // Una vez cargados los departamentos, cargar los empleados (sin filtros inicialmente)
                loadEmployees(1);
            }).catch(function(errorResponse) {
                vm.errorMessage = "Error al cargar la lista de departamentos: " + (errorResponse.data ? errorResponse.data.message : (errorResponse.statusText || "Error desconocido"));
                $log.error('Error al cargar la lista de departamentos:', errorResponse);
                vm.departments = [];
                // Aunque fallen los departamentos, intentamos cargar empleados
                loadEmployees(1); 
            }).finally(function() {
                // isLoading se manejará dentro de loadEmployees
            });
        }

        function loadEmployees(pageNumber) {
            vm.isLoading = true; // Mostrar indicador de carga para empleados
            // vm.errorMessage = null; // No resetear aquí para no perder errores de carga de departamentos

            var token = localStorage.getItem('adminAuthToken');
            if (!token) {
                vm.errorMessage = "No autenticado. Redirigiendo al login...";
                $log.warn("loadEmployees - No se encontró 'adminAuthToken'. Redirigiendo.");
                $location.path('/login/admin');
                vm.isLoading = false;
                return;
            }

            var filterParams = {
                page: pageNumber || vm.pagination.current_page || 1,
                with: 'department' // Para obtener el objeto department en la respuesta
            };

            if (vm.searchTerm && vm.searchTerm.trim() !== '') {
                filterParams.search = vm.searchTerm.trim();
            }
            
            if (vm.selectedDepartmentId && vm.selectedDepartmentId !== '') {
                filterParams.department_id = vm.selectedDepartmentId;
            }
            if (vm.filterStartDate) {
                // Asegurarse de enviar en formato YYYY-MM-DD si el input date lo da así
                // o convertirlo si es un objeto Date de JS
                filterParams.start_date = formatDate(vm.filterStartDate);
            }
            if (vm.filterEndDate) {
                filterParams.end_date = formatDate(vm.filterEndDate);
            }

            var headers = {};
            if (token) {
                headers['Authorization'] = 'Bearer ' + token;
            }

            $log.debug("loadEmployees - Llamando a /api/employees con params:", angular.copy(filterParams), "y headers:", angular.copy(headers));

            // Asumimos que AdminEmployeeService.getEmployees puede tomar un objeto de parámetros
            // Cambiamos a $http.get directamente para asegurar el envío de parámetros.
            var employeesPromise = $http.get('/api/employees', { params: filterParams, headers: headers });
            // Si ya tienes el departmentMap de loadInitialData, no necesitas volver a cargar departamentos aquí
            // a menos que quieras refrescarlos con cada carga de empleados.
            // Por ahora, asumimos que el departmentMap y vm.departments ya están poblados.

            employeesPromise.then(function(employeeResponse) {
                    $log.debug("loadEmployees - Respuesta de API:", angular.copy(employeeResponse));
                    var rawEmployeeData = []; // Contendrá los datos crudos de los empleados

                    if (employeeResponse && employeeResponse.data && angular.isArray(employeeResponse.data.data)) {
                        // Caso ideal: la respuesta tiene la estructura de paginación esperada y .data.data es un array
                        rawEmployeeData = employeeResponse.data.data;
                        vm.pagination = angular.copy(employeeResponse.data); // Copiar para paginación
                        delete vm.pagination.data; // Eliminar el array de datos para no duplicar
                    } else {
                        // Si la respuesta no tiene la estructura esperada (ej. no hay .data o .data.data no es un array)
                        // o si la API devuelve un error con una estructura diferente.
                        $log.warn("loadEmployees - Respuesta de empleados no tiene la estructura esperada o .data.data no es un array. Respuesta:", angular.copy(employeeResponse));
                        // rawEmployeeData permanece como []
                        // Reseteamos la paginación a un estado vacío/por defecto
                        vm.pagination = { total: 0, current_page: 1, last_page: 1, per_page: 15, from: null, to: null, data: [] };
                    }

                    // Mapear department_id a department_name para cada empleado
                    vm.employees = rawEmployeeData.map(function(emp) {
                        // Asumir que el empleado tiene una propiedad 'department_id'
                        emp.department_name = vm.departmentMap[emp.department_id] || 'N/A'; // Usar el mapa para obtener el nombre
                        return emp;
                    });

                    $log.debug("loadEmployees - rawEmployeeData procesado:", angular.copy(rawEmployeeData));
                    $log.debug("loadEmployees - vm.employees después del map:", angular.copy(vm.employees));
                    $log.info("loadEmployees - Empleados cargados. Filtros:", filterParams, "Total encontrados:", vm.employees.length);
                }).catch(function(errorResponse) {
                    vm.errorMessage = "Error al cargar empleados: " + (errorResponse.data ? errorResponse.data.message : (errorResponse.statusText || "Error desconocido"));
                    $log.error('Error al cargar empleados:', errorResponse);
                    vm.employees = []; // Asegurarse de limpiar la lista de empleados en caso de error
                }).finally(function() {
                    vm.isLoading = false; // Asegurarse de que isLoading se ponga en false
                });
        }
        // Función helper para formatear la fecha a YYYY-MM-DD
        // El input type="date" de HTML5 usualmente devuelve la fecha en este formato como string
        // pero si ng-model lo convierte a objeto Date, esta función ayuda.
        function formatDate(date) {
            if (date instanceof Date) {
                return date.toISOString().split('T')[0];
            }
            return date; // Asumir que ya es un string YYYY-MM-DD
        }

        // --- Gestión del foco para el modal de edición ---
        function initializeModalFocusLogic() {
            const editEmployeeModalEl = document.getElementById('editEmployeeModal');

            if (editEmployeeModalEl) {
                // Evento que se dispara cuando el modal está a punto de mostrarse
                editEmployeeModalEl.addEventListener('show.bs.modal', function (event) {
                    // event.relatedTarget es el elemento que disparó el modal
                    if (event.relatedTarget) {
                        editModalTriggerButton = event.relatedTarget;
                        $log.info('Modal de edición (#editEmployeeModal) a punto de mostrarse, disparado por:', editModalTriggerButton);
                    } else {
                        $log.warn('Modal de edición (#editEmployeeModal) se está mostrando sin un event.relatedTarget (quizás programáticamente sin especificarlo).');
                    }
                });

                // Evento que se dispara inmediatamente cuando se llama al método hide
                editEmployeeModalEl.addEventListener('hide.bs.modal', function () {
                    $log.info('Modal de edición (#editEmployeeModal) comenzando a ocultarse (hide.bs.modal).');
                    // Si el foco está dentro del modal, muévelo al body temporalmente.
                    if (document.activeElement && editEmployeeModalEl && editEmployeeModalEl.contains(document.activeElement)) {
                        const activeElementInsideModal = document.activeElement;
                        activeElementInsideModal.blur(); // Quitar foco del elemento dentro del modal
                        document.body.focus(); // Mover el foco al body como medida segura
                        $log.info('Foco quitado del elemento activo y movido temporalmente al body desde el modal de edición.');
                    }
                });

                // Evento que se dispara cuando el modal se ha terminado de ocultar
                editEmployeeModalEl.addEventListener('hidden.bs.modal', function () {
                    $log.info('Modal de edición (#editEmployeeModal) completamente oculto (hidden.bs.modal).');
                    // Intenta quitar el foco de cualquier elemento dentro del modal primero
                    // La lógica de blur se movió a 'hide.bs.modal' para que actúe antes.

                    if (editModalTriggerButton) {
                        $log.info('Devolviendo foco a (editModal):', editModalTriggerButton);
                        // Usar $timeout para asegurar que el foco se establezca después del ciclo de digest
                        // y que el DOM esté completamente actualizado.
                        $timeout(function() {
                            editModalTriggerButton.focus();
                            // editModalTriggerButton = null; // Limpiar para la próxima vez - Considera si es necesario limpiar aquí o en show.bs.modal
                        }, 0); // Un timeout de 0ms es suficiente para ponerlo al final de la cola de eventos.
                    } else {
                        $log.warn('No se encontró el botón disparador (editModalTriggerButton) para devolver el foco. Intentando enfocar el body.');
                        $timeout(function() {
                            document.body.focus(); // Fallback
                        }, 0);
                    }
                });
            } else {
                $log.warn("Elemento del modal #editEmployeeModal no encontrado para la gestión de foco.");
            }

            // Gestión del foco para el modal de creación
            const createEmployeeModalEl = document.getElementById('createEmployeeModal');
            if (createEmployeeModalEl) {
                createEmployeeModalEl.addEventListener('show.bs.modal', function (event) {
                    if (event.relatedTarget) {
                        createModalTriggerButton = event.relatedTarget;
                        $log.info('Modal de creación (#createEmployeeModal) a punto de mostrarse, disparado por:', createModalTriggerButton);
                    } else {
                        $log.warn('Modal de creación (#createEmployeeModal) se está mostrando sin un event.relatedTarget (quizás programáticamente sin especificarlo).');
                    }
                });

                createEmployeeModalEl.addEventListener('hide.bs.modal', function () {
                    $log.info('Modal de creación (#createEmployeeModal) comenzando a ocultarse (hide.bs.modal).');
                    // Si el foco está dentro del modal, muévelo al body temporalmente.
                    if (document.activeElement && createEmployeeModalEl && createEmployeeModalEl.contains(document.activeElement)) {
                        const activeElementInsideModal = document.activeElement;
                        activeElementInsideModal.blur(); // Quitar foco del elemento dentro del modal
                        document.body.focus(); // Mover el foco al body como medida segura
                        $log.info('Foco quitado del elemento activo y movido temporalmente al body desde el modal de creación.');
                    }
                });

                createEmployeeModalEl.addEventListener('hidden.bs.modal', function () {
                    $log.info('Modal de creación (#createEmployeeModal) completamente oculto (hidden.bs.modal).');
                    // La lógica de blur se movió a 'hide.bs.modal'

                    if (createModalTriggerButton) {
                        $log.info('Devolviendo foco a (createModal):', createModalTriggerButton);
                        $timeout(function() {
                            createModalTriggerButton.focus();
                            // createModalTriggerButton = null;
                        }, 0);
                    } else {
                        $log.warn('No se encontró el botón disparador (createModalTriggerButton) para devolver el foco. Intentando enfocar el body.');
                        $timeout(function() { document.body.focus(); }, 0);
                    }
                });
            } else {
                $log.warn("Elemento del modal #createEmployeeModal no encontrado para la gestión de foco. Asegúrate de que el ID es correcto.");
            }
        }

        // --- Gestión del foco para el modal de carga CSV ---
            const uploadCsvModalEl = document.getElementById('uploadCsvModal'); // ID de tu modal de carga CSV

            if (uploadCsvModalEl) {
                // Evento que se dispara cuando el modal está a punto de mostrarse
                uploadCsvModalEl.addEventListener('show.bs.modal', function (event) {
                    // event.relatedTarget es el elemento que disparó el modal
                    if (event.relatedTarget) {
                        csvUploadModalTriggerButton = event.relatedTarget;
                        $log.info('Modal de carga CSV (#uploadCsvModal) a punto de mostrarse, disparado por:', csvUploadModalTriggerButton);
                    } else {
                        $log.warn('Modal de carga CSV (#uploadCsvModal) se está mostrando sin un event.relatedTarget (quizás programáticamente sin especificarlo).');
                    }
                });

                // Evento que se dispara inmediatamente cuando se llama al método hide
                uploadCsvModalEl.addEventListener('hide.bs.modal', function () {
                    $log.info('Modal de carga CSV (#uploadCsvModal) comenzando a ocultarse (hide.bs.modal).');
                    // Si el foco está dentro del modal, muévelo al body temporalmente.
                    if (document.activeElement && uploadCsvModalEl && uploadCsvModalEl.contains(document.activeElement)) {
                        const activeElementInsideModal = document.activeElement;
                        activeElementInsideModal.blur(); // Quitar foco del elemento dentro del modal
                        document.body.focus(); // Mover el foco al body como medida segura
                        $log.info('Foco quitado del elemento activo y movido temporalmente al body desde el modal de carga CSV.');
                    }
                });

                // Evento que se dispara cuando el modal se ha terminado de ocultar
                uploadCsvModalEl.addEventListener('hidden.bs.modal', function () {
                    $log.info('Modal de carga CSV (#uploadCsvModal) completamente oculto (hidden.bs.modal).');
                    if (csvUploadModalTriggerButton) {
                        $log.info('Devolviendo foco a (csvUploadModal):', csvUploadModalTriggerButton);
                        $timeout(function() { csvUploadModalTriggerButton.focus(); }, 0);
                    } else {
                        $log.warn('No se encontró el botón disparador (csvUploadModalTriggerButton) para devolver el foco. Intentando enfocar el body.');
                        $timeout(function() { document.body.focus(); }, 0);
                    }
                });
            } else {
                $log.warn("Elemento del modal #uploadCsvModal no encontrado para la gestión de foco. Asegúrate de que el ID es correcto.");
            }

        // Llamar a la función de inicialización.
        // Envolver en $timeout para asegurar que el DOM esté listo.
        $timeout(initializeModalFocusLogic, 0);

    }
})();