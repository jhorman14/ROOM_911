(function () {
    'use strict';

    angular
        .module('miApp')
        .controller('EmployeeAccessHistoryController', EmployeeAccessHistoryController);

    EmployeeAccessHistoryController.$inject = ['$http', '$location', '$routeParams', '$log', '$window'];

    function EmployeeAccessHistoryController($http, $location, $routeParams, $log, $window) {
        var vm = this;

        vm.employeeId = $routeParams.employeeId; // Obtener el ID del empleado de la ruta
        vm.employeeName = $routeParams.employeeName || null; // Obtener el nombre si se pasa por la ruta (opcional)
        vm.accessLogs = [];
        vm.pagination = {};
        vm.isLoading = true;
        vm.errorMessage = null;
        vm.isDownloadingPdf = false;

        vm.loadHistory = loadHistory;
        vm.goBack = goBack;
        vm.getPagesArray = getPagesArray; // <--- Añadido para la paginación
        vm.applyDateFilters = applyDateFilters;
        vm.clearDateFilters = clearDateFilters;
        vm.downloadPdf = downloadPdf;

        activate();

        function activate() {
            $log.info("EmployeeAccessHistoryController: Activado para empleado ID:", vm.employeeId);
            if (!vm.employeeId) {
                vm.errorMessage = "No se especificó un ID de empleado.";
                vm.isLoading = false;
                $log.error("EmployeeAccessHistoryController: ID de empleado no encontrado en $routeParams.");
                return;
            }
            // Si no se pasó el nombre, podríamos hacer una llamada para obtenerlo, o dejarlo así.
            // Por ahora, lo dejamos opcional.
            loadHistory(1); // Cargar la primera página del historial
        }

        vm.isActive = function (viewLocation) {
            // $location.path() devuelve la ruta actual sin el #!
            return viewLocation === $location.path();
        };


        function getAuthToken() {
            return $window.localStorage.getItem('adminAuthToken');
        }

        function loadHistory(page) {
            vm.isLoading = true;
            vm.errorMessage = null;
            page = page || vm.pagination.current_page || 1;

            var params = { page: page }; // Parámetros base para la API

            // Añadir filtros de fecha si están definidos
            if (vm.filterStartDate) {
                // Asumimos que el input type="date" con ng-model ya da YYYY-MM-DD
                // Si no, necesitarías formatearlo aquí.
                params.start_date = formatDate(vm.filterStartDate);
            }
            if (vm.filterEndDate) {
                params.end_date = formatDate(vm.filterEndDate);
            }

            var token = getAuthToken();
            if (!token) {
                vm.errorMessage = "No autenticado. Redirigiendo al login...";
                $location.path('/login/admin');
                vm.isLoading = false;
                return;
            }

            $http({
                method: 'GET',
                url: '/api/employees/' + vm.employeeId + '/access-history',
                params: params, // <--- CORRECCIÓN AQUÍ
                headers: { 'Authorization': 'Bearer ' + token }
            }).then(function (response) {
                if (response.data && response.data.data) {
                    vm.accessLogs = response.data.data;
                    vm.pagination = {
                        current_page: response.data.current_page,
                        last_page: response.data.last_page,
                        per_page: response.data.per_page,
                        total: response.data.total,
                        from: response.data.from,
                        to: response.data.to
                    };
                } else {
                    // Si la respuesta no tiene la estructura esperada o está vacía de forma inesperada
                    vm.accessLogs = [];
                    vm.pagination = {}; // Resetear paginación
                    $log.warn("EmployeeAccessHistoryController: La respuesta de la API no tiene la estructura esperada o no contiene datos.");
                }
                vm.isLoading = false;
                $log.info("EmployeeAccessHistoryController: Historial cargado para empleado ID:", vm.employeeId, "Página:", page);
            }).catch(function (errorResponse) {
                vm.errorMessage = "Error al cargar el historial de accesos: " + (errorResponse.data ? errorResponse.data.message : errorResponse.statusText);
                vm.isLoading = false;
                $log.error("EmployeeAccessHistoryController: Error cargando historial:", errorResponse);
            });
        }

        function goBack() {
            // Podríamos usar $window.history.back() o una ruta específica
            $location.path('/admin/employees');
            $log.info('EmployeeAccessHistoryController: Volviendo a la lista de empleados.');
        }

        function applyDateFilters() {
            $log.info("EmployeeAccessHistoryController: Aplicando filtros de fecha. Desde:", vm.filterStartDate, "Hasta:", vm.filterEndDate);
            loadHistory(1); // Recargar desde la página 1 con los nuevos filtros
        }

        function clearDateFilters() {
            $log.info("EmployeeAccessHistoryController: Limpiando filtros de fecha.");
            vm.filterStartDate = null;
            vm.filterEndDate = null;
            loadHistory(1); // Recargar desde la página 1 sin filtros de fecha
        }

        function downloadPdf() {
            vm.isDownloadingPdf = true;
            vm.errorMessage = null; // Limpiar errores previos
            $log.info("EmployeeAccessHistoryController: Solicitando PDF del historial.");

            var token = getAuthToken();
            if (!token) {
                vm.errorMessage = "No autenticado. No se puede descargar el PDF.";
                vm.isDownloadingPdf = false;
                // Opcional: $location.path('/login/admin');
                return;
            }

            var pdfParams = {};
            if (vm.filterStartDate) {
                pdfParams.start_date = formatDate(vm.filterStartDate);
            }
            if (vm.filterEndDate) {
                pdfParams.end_date = formatDate(vm.filterEndDate);
            }

            var downloadUrl = '/api/employees/' + vm.employeeId + '/access-history/pdf';

            $http({
                method: 'GET',
                url: downloadUrl,
                params: pdfParams,
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/pdf' // Informar al servidor que esperamos un PDF
                },
                responseType: 'arraybuffer' // Crucial para manejar datos binarios
            }).then(function(response) {
                var headers = response.headers();
                var filename = 'historial_accesos.pdf'; // Nombre por defecto
                var contentDisposition = headers['content-disposition'];
                if (contentDisposition) {
                    var filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                    var matches = filenameRegex.exec(contentDisposition);
                    if (matches != null && matches[1]) {
                        filename = matches[1].replace(/['"]/g, '');
                    }
                }
                
                var blob = new Blob([response.data], { type: 'application/pdf' });
                var downloadLink = angular.element('<a></a>');
                downloadLink.attr('href', $window.URL.createObjectURL(blob));
                downloadLink.attr('download', filename);
                downloadLink[0].click(); // Simular clic para descargar
                $window.URL.revokeObjectURL(downloadLink.attr('href')); // Limpiar
                vm.isDownloadingPdf = false;
            }).catch(function(errorResponse) {
                vm.isDownloadingPdf = false;
                vm.errorMessage = "Error al descargar el PDF: " + (errorResponse.data ? (errorResponse.data.message || errorResponse.statusText) : errorResponse.statusText);
                $log.error("EmployeeAccessHistoryController: Error descargando PDF:", errorResponse);
            });
        }

        // Función helper para formatear la fecha si ng-model devuelve un objeto Date
        // Si ng-model con input type="date" ya devuelve YYYY-MM-DD, esta función es más un seguro.
        function formatDate(date) {
            if (date instanceof Date) {
                var day = ('0' + date.getDate()).slice(-2);
                var month = ('0' + (date.getMonth() + 1)).slice(-2);
                var year = date.getFullYear();
                return year + '-' + month + '-' + day;
            }
            return date; // Asumir que ya es un string YYYY-MM-DD o null
        }

        function getPagesArray(lastPage, currentPage, pageRange = 2) {
            var pages = [];
            var startPage, endPage;

            if (!lastPage || lastPage <= 1) {
                return []; // No mostrar números si solo hay 0 o 1 página
            }

            // Lógica para determinar el rango de páginas a mostrar
            // Muestra 'pageRange' páginas antes y después de la actual, más la actual.
            // Y asegura que no se salga de los límites 1 y lastPage.
            if (lastPage <= (pageRange * 2) + 1) {
                // Si el total de páginas es pequeño, muéstralas todas
                startPage = 1;
                endPage = lastPage;
            } else {
                // Calcular el inicio y fin del rango
                if (currentPage <= pageRange + 1) {
                    startPage = 1;
                    endPage = (pageRange * 2) + 1;
                } else if (currentPage + pageRange >= lastPage) {
                    startPage = lastPage - (pageRange * 2);
                    endPage = lastPage;
                } else {
                    startPage = currentPage - pageRange;
                    endPage = currentPage + pageRange;
                }
            }

            for (var i = startPage; i <= endPage; i++) {
                pages.push(i);
            }
            return pages;
        }
    }
})();