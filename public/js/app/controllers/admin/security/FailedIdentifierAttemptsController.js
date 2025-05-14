(function () {
    'use strict';

    angular
        .module('miApp') // Asegúrate que 'miApp' es el nombre de tu módulo principal
        .controller('FailedIdentifierAttemptsController', FailedIdentifierAttemptsController);

    FailedIdentifierAttemptsController.$inject = ['$http', '$location', '$log', '$window', '$scope', 'AdminAuthService'];
    function FailedIdentifierAttemptsController($http, $location, $log, $window, $scope, AdminAuthService) {
        var vm = this;

        vm.failedAttempts = [];
        vm.pagination = {};
        vm.isLoading = true;
        vm.isDownloadingPdf = false;
        vm.errorMessage = null;

        // Filtros de fecha (opcional, pero útil)
        vm.filterStartDate = null;
        vm.filterEndDate = null;

        // Funciones expuestas
        vm.loadAttempts = loadAttempts;
        vm.getPagesArray = getPagesArray;
        vm.applyDateFilters = applyDateFilters;
        vm.clearDateFilters = clearDateFilters;
        vm.downloadPdf = downloadPdf;
        vm.logout = logout;
        vm.goBack = function() { // Función simple para volver, ajusta la ruta si es necesario
            $location.path('/admin/dashboard'); // O a donde quieras que regrese
        };

        activate();

        function activate() {
            $log.info("FailedIdentifierAttemptsController: Activado.");
            loadAttempts(1); // Cargar la primera página de intentos
        }

        function getAuthToken() {
            return $window.localStorage.getItem('adminAuthToken'); // O la key que uses para el token de admin
        }

        function loadAttempts(page) {
            vm.isLoading = true;
            vm.errorMessage = null;
            page = page || vm.pagination.current_page || 1;

            var token = getAuthToken();
            if (!token) {
                vm.errorMessage = "No autenticado. Redirigiendo al login...";
                // $location.path('/login/admin'); // Mantén esto comentado por ahora si el bucle se resolvió
                vm.isLoading = false; // <--- ASEGÚRATE QUE ESTA LÍNEA NO ESTÉ COMENTADA
                return;
            }

            var params = { page: page };
            if (vm.filterStartDate) {
                params.start_date = formatDate(vm.filterStartDate);
            }
            if (vm.filterEndDate) {
                params.end_date = formatDate(vm.filterEndDate);
            }

            $http({
                method: 'GET',
                url: '/api/admin/security/failed-identifier-logins', // La URL de tu nueva API
                params: params,
                headers: { 'Authorization': 'Bearer ' + token }
            }).then(function (response) { // response es el objeto completo de $http, response.data es el payload JSON
                // Verificar si response.data y response.data.data existen y son del tipo esperado
                if (response && response.data && 
                    response.data.hasOwnProperty('data') && Array.isArray(response.data.data) && 
                    response.data.hasOwnProperty('total')) {
                    vm.failedAttempts = response.data.data;
                    vm.pagination = {
                        current_page: response.data.current_page,
                        last_page: response.data.last_page,
                        per_page: response.data.per_page,
                        total: response.data.total,
                        from: response.data.from,
                        to: response.data.to
                    };
                    if (vm.failedAttempts.length === 0) {
                        $log.info("FailedIdentifierAttemptsController: La API devolvió una lista vacía de intentos (total: " + (vm.pagination.total || 0) + ").");
                    }
                } else {
                    vm.failedAttempts = [];
                    vm.pagination = {}; // Resetear paginación
                    $log.warn("FailedIdentifierAttemptsController: La respuesta de la API no tiene la estructura de paginación esperada de Laravel.","Respuesta completa:", response, "Response.data:", response ? response.data : 'response es nulo/undefined');
                }
                vm.isLoading = false;
                $log.info("FailedIdentifierAttemptsController: Intentos fallidos cargados. Página:", page);
            }).catch(function (errorResponse) {
                vm.errorMessage = "Error al cargar los intentos de login fallidos: " + (errorResponse.data ? errorResponse.data.message : errorResponse.statusText);
                vm.isLoading = false;
                $log.error("FailedIdentifierAttemptsController: Error en la llamada API para cargar intentos. Página:", page, "Error:", errorResponse);
            });
        }

        function applyDateFilters() {
            $log.info("FailedIdentifierAttemptsController: Aplicando filtros de fecha. Desde:", vm.filterStartDate, "Hasta:", vm.filterEndDate);
            loadAttempts(1); // Recargar desde la página 1 con los nuevos filtros
        }

        function clearDateFilters() {
            $log.info("FailedIdentifierAttemptsController: Limpiando filtros de fecha.");
            vm.filterStartDate = null;
            vm.filterEndDate = null;
            loadAttempts(1); // Recargar desde la página 1 sin filtros de fecha
        }

        function formatDate(date) { // Copiado de tu AccessHistoryController
            if (date instanceof Date) {
                var day = ('0' + date.getDate()).slice(-2);
                var month = ('0' + (date.getMonth() + 1)).slice(-2);
                var year = date.getFullYear();
                return year + '-' + month + '-' + day;
            }
            return date;
        }

        function getPagesArray(lastPage, currentPage, pageRange = 2) { // Copiado de tu AccessHistoryController
            var pages = [];
            var startPage, endPage;
            if (!lastPage || lastPage <= 1) { return []; }
            if (lastPage <= (pageRange * 2) + 1) { startPage = 1; endPage = lastPage; }
            else {
                if (currentPage <= pageRange + 1) { startPage = 1; endPage = (pageRange * 2) + 1; }
                else if (currentPage + pageRange >= lastPage) { startPage = lastPage - (pageRange * 2); endPage = lastPage; }
                else { startPage = currentPage - pageRange; endPage = currentPage + pageRange; }
            }
            for (var i = startPage; i <= endPage; i++) { pages.push(i); }
            return pages;
        }

        function downloadPdf() {
            vm.isDownloadingPdf = true;
            vm.errorMessage = null;
            $log.info("FailedIdentifierAttemptsController: Iniciando descarga de PDF con $http.");

            var token = getAuthToken();
            if (!token) {
                vm.errorMessage = "No autenticado. No se puede descargar el PDF.";
                vm.isDownloadingPdf = false;
                $location.path('/login/admin'); // O tu ruta de login de admin
                return;
            }

            var params = {};
            if (vm.filterStartDate) {
                params.start_date = formatDate(vm.filterStartDate);
            }
            if (vm.filterEndDate) {
                params.end_date = formatDate(vm.filterEndDate);
            }

            $http({
                method: 'GET',
                url: '/api/admin/security/failed-identifier-logins/pdf', // Ruta de la API para el PDF
                params: params,
                headers: { 'Authorization': 'Bearer ' + token },
                responseType: 'blob' // ¡Importante para que AngularJS maneje la respuesta como datos binarios!
            }).then(function(response) {
                var contentType = response.headers('Content-Type');
                var blob = new Blob([response.data], { type: contentType || 'application/pdf' });
                
                var filename = "intentos_fallidos_id_inexistente.pdf"; // Nombre por defecto
                var disposition = response.headers('Content-Disposition');
                if (disposition && disposition.indexOf('attachment') !== -1) {
                    var filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                    var matches = filenameRegex.exec(disposition);
                    if (matches != null && matches[1]) {
                        filename = matches[1].replace(/['"]/g, '');
                    }
                }

                if (window.navigator && window.navigator.msSaveOrOpenBlob) {
                    // Para IE y Edge
                    window.navigator.msSaveOrOpenBlob(blob, filename);
                } else {
                    // Para otros navegadores
                    var link = document.createElement('a');
                    link.href = window.URL.createObjectURL(blob);
                    link.download = filename;
                    document.body.appendChild(link); // Requerido en Firefox
                    link.click();
                    document.body.removeChild(link); // Limpiar
                    window.URL.revokeObjectURL(link.href); // Liberar el objeto URL
                }
                vm.isDownloadingPdf = false;
                $log.info("FailedIdentifierAttemptsController: PDF descargado/solicitado.");
            }).catch(function(errorResponse) {
                vm.errorMessage = "Error al descargar el PDF: ";
                if (errorResponse.data && errorResponse.data instanceof Blob && errorResponse.data.type === "application/json") {
                    // Intentar leer el error del Blob si es JSON
                    var reader = new FileReader();
                    reader.onload = function() {
                        var errorJson = JSON.parse(reader.result);
                        vm.errorMessage += errorJson.message || "Error desconocido del servidor.";
                        $scope.$apply(); // Actualizar la vista ya que esto es asíncrono
                    };
                    reader.onerror = function() {
                        vm.errorMessage += "No se pudo leer el mensaje de error del servidor.";
                        $scope.$apply();
                    };
                    reader.readAsText(errorResponse.data);
                } else if (errorResponse.data && errorResponse.data.message) {
                     vm.errorMessage += errorResponse.data.message;
                } else {
                    vm.errorMessage += errorResponse.statusText || "Error desconocido.";
                }
                vm.isDownloadingPdf = false;
                $log.error("FailedIdentifierAttemptsController: Error descargando PDF:", errorResponse);
            });
        }
    
    // Función de Logout similar a la de AdminAdminsListController
        function logout() {
            var logoutPromise;
            $log.info("FailedIdentifierAttemptsController: Iniciando proceso de logout...");

            // Intenta llamar al servicio de logout del backend si está disponible
            if (AdminAuthService && typeof AdminAuthService.logout === 'function') {
                try {
                    $log.info("FailedIdentifierAttemptsController: Llamando a AdminAuthService.logout()...");
                    logoutPromise = AdminAuthService.logout(); // Asume que esto devuelve una promesa
                } catch (e) {
                    $log.error("FailedIdentifierAttemptsController: Error síncrono al llamar a AdminAuthService.logout():", e);
                    // logoutPromise seguirá siendo undefined o no será una promesa.
                }
            } else {
                $log.warn("FailedIdentifierAttemptsController: AdminAuthService.logout no es una función o AdminAuthService no está disponible. Procediendo con logout local.");
            }

            function performLocalLogoutAndRedirect() {
                $log.info("FailedIdentifierAttemptsController: Ejecutando performLocalLogoutAndRedirect...");
                // AdminAuthService.logout() ya debería manejar la limpieza del token y la redirección.
                // Si necesitas una lógica de limpieza adicional específica de este controlador, añádela aquí.
                // Por ejemplo, si el servicio solo limpia el token pero no redirige (aunque el tuyo sí lo hace):
                // $window.localStorage.removeItem('adminAuthToken');
                // $window.localStorage.removeItem('currentAdmin');
                // $log.info('Token de autenticación "adminAuthToken" removido de localStorage.');
                // var targetLoginPath = '/login/admin'; 
                // $log.info('Redirigiendo a: ' + targetLoginPath);
                // $location.path(targetLoginPath);
            }

            if (logoutPromise && typeof logoutPromise.then === 'function') {
                // Si el servicio devolvió una promesa, esperar a que se complete
                logoutPromise
                    .then(function (response) {
                        $log.info('FailedIdentifierAttemptsController: Promesa de AdminAuthService.logout() resuelta exitosamente:', response);
                        // La redirección ya la hace el servicio.
                    })
                    .catch(function (error) {
                        $log.error('FailedIdentifierAttemptsController: Promesa de AdminAuthService.logout() rechazada con error:', error);
                        $log.info('FailedIdentifierAttemptsController: La redirección debería ocurrir igualmente desde AdminAuthService.logout().finally()');
                    });
            } else {
                $log.info("FailedIdentifierAttemptsController: No hubo promesa de AdminAuthService.logout() o falló. El servicio debería manejar la redirección si fue llamado.");
                // Si AdminAuthService.logout() no fue llamado o no existe, necesitarías una lógica de fallback aquí,
                // pero tu AdminAuthService.logout() ya es bastante robusto.
            }
        }
    }
})();