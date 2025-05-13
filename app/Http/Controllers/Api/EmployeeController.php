<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log; // Asegúrate de que esta línea esté presente
use League\Csv\Reader;
use Carbon\Carbon;
use Barryvdh\DomPDF\Facade\Pdf;

class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        $query = Employee::query()->withCount('accessLogs'); // Cargar el conteo de la relación accessLogs
        Log::info('EmployeeController@index - Request All: ', $request->all());

        // Búsqueda general por ID, identificación, nombre, apellido
        if ($request->filled('search') && !empty(trim($request->input('search')))) {
            $searchTerm = trim($request->input('search'));
            Log::info('EmployeeController@index - Applying search filter: ' . $searchTerm);
            $query->where(function ($q) use ($searchTerm) {
                $q->where('id', 'like', "%{$searchTerm}%")
                  ->orWhere('identification_id', 'like', "%{$searchTerm}%")
                  ->orWhere('name', 'like', "%{$searchTerm}%")
                  ->orWhere('last_name', 'like', "%{$searchTerm}%");
            });
        } else {
            Log::info('EmployeeController@index - No search filter applied or search term is empty.');
        }

        // Filtrar por ID de departamento
        if ($request->filled('department_id') && !empty(trim($request->input('department_id')))) {
            $departmentId = trim($request->input('department_id'));
            Log::info('EmployeeController@index - Applying department_id filter: ' . $departmentId);
            $query->where('department_id', $departmentId);
        } else {
            Log::info('EmployeeController@index - No department_id filter applied or department_id is empty.');
        }

        // Filtrar por rango de fechas de creación (created_at)
        if ($request->filled('start_date') && $request->filled('end_date')) {
            try {
                $startDate = Carbon::parse($request->input('start_date'))->startOfDay(); // Inicio del día
                $endDate = Carbon::parse($request->input('end_date'))->endOfDay();     // Fin del día
                Log::info('EmployeeController@index - Applying date range filter: ' . $startDate->toDateTimeString() . ' to ' . $endDate->toDateTimeString());
                $query->whereBetween('created_at', [$startDate, $endDate]);
            } catch (\Exception $e) {
                Log::error('EmployeeController@index - Invalid date format for date range filter: ' . $e->getMessage());
                // Opcional: devolver un error si las fechas no son válidas, o simplemente ignorar el filtro
            }
        } elseif ($request->filled('start_date')) { // Solo fecha de inicio
            try {
                $startDate = Carbon::parse($request->input('start_date'))->startOfDay();
                Log::info('EmployeeController@index - Applying start_date filter: >= ' . $startDate->toDateTimeString());
                $query->where('created_at', '>=', $startDate);
            } catch (\Exception $e) { Log::error('EmployeeController@index - Invalid start_date format: ' . $e->getMessage()); }
        } elseif ($request->filled('end_date')) { // Solo fecha de fin
            try {
                $endDate = Carbon::parse($request->input('end_date'))->endOfDay();
                Log::info('EmployeeController@index - Applying end_date filter: <= ' . $endDate->toDateTimeString());
                $query->where('created_at', '<=', $endDate);
            } catch (\Exception $e) { Log::error('EmployeeController@index - Invalid end_date format: ' . $e->getMessage()); }
        }

        // Cargar relaciones
        // Si el frontend siempre envía with=department, esta lógica es más simple.
        // Si no, podemos cargar 'department' por defecto.
        if ($request->has('with')) {
            $relations = explode(',', $request->input('with'));
            // Validar que las relaciones solicitadas sean permitidas para evitar carga masiva
            $allowedRelations = ['department']; // Define aquí las relaciones permitidas
            $validRelations = array_intersect($relations, $allowedRelations);
            if (in_array('department', $validRelations)) { // Asegurarnos de que 'department' se cargue si se pide
                $query->with($validRelations);
            }
        }
        // Siempre cargar 'department' si no se especificó 'with' o si 'with' no lo incluyó explícitamente
        // y también asegurar que withCount no lo elimine.
        if (!$request->has('with') || ($request->has('with') && !str_contains($request->input('with'), 'department'))) {
            $query->with('department');
        }


        // Aplicar paginación
        Log::info('EmployeeController@index - SQL Query before pagination: ' . $query->toSql(), $query->getBindings());
        $employees = $query->paginate(15)->appends($request->except('page')); // appends para mantener los filtros en los enlaces de paginación

        
        return response()->json($employees);
    }


    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'identification_id' => 'required|unique:employees',
            'name' => 'required',
            'last_name' => 'required',
            'department_id' => 'required|exists:departments,id',
            'access_enabled' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $employeeData = $request->all();

        $employee = Employee::create($employeeData);
        return response()->json($employee, 201);
    }

    public function uploadCsv(Request $request)
    {
        if (!$request->hasFile('csv_file')) {
            return response()->json(['error' => 'No se encontró el archivo CSV'], 400);
        }

        $file = $request->file('csv_file');
        $reader = Reader::createFromPath($file->getPathname(), 'r'); // Usar getPathname() para la ruta completa del archivo
        $reader->setHeaderOffset(0); // Si tu CSV tiene encabezados

        $importedCount = 0;
        foreach ($reader as $record) {
            try {
                // Validación de los datos del CSV (¡Importante!)
                $validator = Validator::make($record, [
                    'identification_id' => 'required|unique:employees',
                    'name' => 'required',
                    'last_name' => 'required',
                    'department_id' => 'required|exists:departments,id',
                    'access_enabled' => 'sometimes|boolean',
                ]);

                if ($validator->fails()) {
                    // Loggear los errores de validación para este registro
                    continue; // O lanzar una excepción, dependiendo de cómo quieras manejar los errores
                }

                Employee::create([
                    'identification_id' => $record['identification_id'],
                    'name' => $record['name'],
                    'last_name' => $record['last_name'],
                    'department_id' => $record['department_id'],
                    'access_enabled' => $record['access_enabled'] ?? true, // Default a true si no se especifica
                ]);
                $importedCount++;
            } catch (\Exception $e) {
                // Loggear otros errores durante la creación
            }
        }

        return response()->json(['message' => "Se importaron $importedCount empleados"], 200);
    }

    public function show(Employee $employee)
    {
        return response()->json($employee);
    }

    public function update(Request $request, Employee $employee)
    {
        $rules = [
            'identification_id' => 'sometimes|required|unique:employees,identification_id,' . $employee->id,
            'name' => 'sometimes|required',
            'last_name' => 'sometimes|required',
            'department_id' => 'sometimes|required|exists:departments,id',
            'access_enabled' => 'sometimes|boolean',
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $employeeData = $request->all();

        $employee->update($employeeData);
        return response()->json($employee, 200);
    }

    public function search(Request $request)
    {
        $query = Employee::query();

        if ($request->has('internal_id')) {
            $query->where('internal_id', 'like', '%' . $request->input('internal_id') . '%');
        }
        if ($request->has('name')) {
            $query->where('name', 'like', '%' . $request->input('name') . '%');
        }
        if ($request->has('last_name')) {
            $query->where('last_name', 'like', '%' . $request->input('last_name') . '%');
        }

        $results = $query->get();
        return response()->json($results);
    }

    public function filterByDepartment($departmentId)
    {
        $employees = Employee::where('department_id', $departmentId)->get();
        return response()->json($employees);
    }

    public function toggleAccess(Employee $employee)
    {
        // Cambia el valor booleano
        $employee->access_enabled = !$employee->access_enabled;
        $employee->save();

        // Devuelve el empleado actualizado o un mensaje de éxito
        // Es bueno devolver el estado actualizado para que el frontend pueda usarlo si es necesario
        return response()->json(['message' => 'Estado de acceso actualizado.', 'employee' => $employee], 200);
    }
    public function getAccessHistory(Request $request, Employee $employee)
    {
        Log::info('EmployeeController@getAccessHistory - Fetching access history for employee ID: ' . $employee->id);
        Log::info('EmployeeController@getAccessHistory - Request params: ', $request->all());

        // Cargar los logs de acceso para el empleado, ordenados por fecha descendente y paginados
        $query = $employee->accessLogs()->orderBy('attempted_at', 'desc');

        // Filtrar por rango de fechas de intento (attempted_at)
        if ($request->filled('start_date') && $request->filled('end_date')) {
            try {
                $startDate = Carbon::parse($request->input('start_date'))->startOfDay();
                $endDate = Carbon::parse($request->input('end_date'))->endOfDay();
                Log::info('EmployeeController@getAccessHistory - Applying date range filter on attempted_at: ' . $startDate->toDateTimeString() . ' to ' . $endDate->toDateTimeString());
                $query->whereBetween('attempted_at', [$startDate, $endDate]);
            } catch (\Exception $e) {
                Log::error('EmployeeController@getAccessHistory - Invalid date format for date range filter: ' . $e->getMessage());
            }
        } elseif ($request->filled('start_date')) {
            try {
                $startDate = Carbon::parse($request->input('start_date'))->startOfDay();
                Log::info('EmployeeController@getAccessHistory - Applying start_date filter on attempted_at: >= ' . $startDate->toDateTimeString());
                $query->where('attempted_at', '>=', $startDate);
            } catch (\Exception $e) { Log::error('EmployeeController@getAccessHistory - Invalid start_date format: ' . $e->getMessage()); }
        }

        $accessLogs = $query->paginate(10)->appends($request->except('page')); // Puedes ajustar el número de items por página
        Log::info('EmployeeController@getAccessHistory - Access logs query SQL: ' . $query->toSql(), $query->getBindings());
        return response()->json($accessLogs);
    }

    public function downloadAccessHistoryPdf(Request $request, Employee $employee)
    {
        Log::info('EmployeeController@downloadAccessHistoryPdf - Generating PDF for employee ID: ' . $employee->id);
        Log::info('EmployeeController@downloadAccessHistoryPdf - Request params: ', $request->all());

        $query = $employee->accessLogs()->orderBy('attempted_at', 'desc');

        $filters = [];
        if ($request->filled('start_date')) {
            try {
                $startDate = Carbon::parse($request->input('start_date'))->startOfDay();
                $query->where('attempted_at', '>=', $startDate);
                $filters['startDate'] = $startDate->toDateString(); // Guardar para mostrar en el PDF
                Log::info('EmployeeController@downloadAccessHistoryPdf - Applying start_date filter: >= ' . $startDate->toDateTimeString());
            } catch (\Exception $e) {
                Log::error('EmployeeController@downloadAccessHistoryPdf - Invalid start_date format: ' . $e->getMessage());
                // Podrías retornar un error aquí si la fecha es inválida
            }
        }

        if ($request->filled('end_date')) {
            try {
                $endDate = Carbon::parse($request->input('end_date'))->endOfDay();
                $query->where('attempted_at', '<=', $endDate);
                $filters['endDate'] = $endDate->toDateString(); // Guardar para mostrar en el PDF
                Log::info('EmployeeController@downloadAccessHistoryPdf - Applying end_date filter: <= ' . $endDate->toDateTimeString());
            } catch (\Exception $e) {
                Log::error('EmployeeController@downloadAccessHistoryPdf - Invalid end_date format: ' . $e->getMessage());
            }
        }

        $accessLogs = $query->get(); // Obtener todos los registros filtrados, sin paginación

        $data = [
            'accessLogs' => $accessLogs,
            'employeeName' => $employee->name . ' ' . $employee->last_name, // Asumiendo que tienes estos campos
            'employeeId' => $employee->id,
            'filters' => $filters, // Pasar los filtros a la vista
        ];

        $pdf = Pdf::loadView('pdfs.access_history', $data);
        $fileName = 'historial_accesos_empleado_' . $employee->id . '_' . now()->format('Ymd_His') . '.pdf';
        return $pdf->download($fileName);
    }
}
