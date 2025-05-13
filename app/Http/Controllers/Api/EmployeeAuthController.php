<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller; // Ya estaba
use App\Models\AccessLogRoom911; // Corregir capitalización
use App\Models\Employee;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log; // Asegúrate de que esta línea esté presente
use Illuminate\Support\Facades\Validator;

class EmployeeAuthController extends Controller
{
    public function login(Request $request)
    {
        Log::info('EmployeeAuthController@login - Request Data: ', $request->all());

        // Usar Validator para poder registrar errores de validación si ocurren
        $validator = Validator::make($request->all(), [
            'identification_id' => 'required',
        ]);

        if ($validator->fails()) {
            Log::error('EmployeeAuthController@login - Validation failed: ', $validator->errors()->toArray());
            return response()->json(['message' => 'Datos de validación incorrectos.', 'errors' => $validator->errors()], 422);
        }

        $identificationId = $request->identification_id;
        Log::info('EmployeeAuthController@login - Attempting login for identification_id: ' . $identificationId);
        $employee = Employee::where('identification_id', $identificationId)->first();
        $reason = null;
        $accessGranted = false;

        if ($employee) {
            if ($employee->department->name === 'ROOM_911') {
                if ($employee->access_enabled) {
                    Log::info('EmployeeAuthController@login - Employee found, department ROOM_911, access enabled.');
                    $accessGranted = true;
                } else {
                    Log::info('EmployeeAuthController@login - Employee found, department ROOM_911, but access NOT enabled.');
                    $reason = 'Acceso no habilitado';
                }
            } else {
                Log::info('EmployeeAuthController@login - Employee found, but department is not ROOM_911. Department: ' . $employee->department->name);
                $reason = 'Departamento incorrecto';
            }
        } else {
            $reason = 'Identificación inválida';
        }

        try {
            Log::info('EmployeeAuthController@login - Attempting to create AccessLogRoom911 entry.');
            AccessLogRoom911::create([
                'employee_id' => $employee ? $employee->id : null,
                'identification_attempted' => $identificationId,
                'attempted_at' => Carbon::now(),
                'access_result' => $accessGranted ? 'concedido' : ($reason === 'Acceso no habilitado' ? 'denegado-credenciales' : ($reason === 'Departamento incorrecto' ? 'denegado-departamento' : 'no-registrado')),
                'failure_reason' => !$accessGranted ? $reason : null,
            ]);
            Log::info('EmployeeAuthController@login - AccessLogRoom911 entry created successfully.');
        } catch (\Exception $e) {
            Log::error('EmployeeAuthController@login - Failed to create AccessLogRoom911 entry: ' . $e->getMessage(), ['exception' => $e]);
            // Decidir si devolver un error aquí o continuar. Por ahora, continuaremos para intentar dar una respuesta al usuario.
            // return response()->json(['message' => 'Error interno al registrar el acceso.'], 500); // Podrías descomentar esto si es crítico
        }

        if ($accessGranted) {
            Log::info('EmployeeAuthController@login - Access granted. Creating token for employee ID: ' . $employee->id);
            $token = $employee->createToken('employeeAuthToken', ['employee'])->plainTextToken;
            Log::info('EmployeeAuthController@login - Token created successfully.');
            return response()->json([
                'token' => $token,
                'role' => 'employee',
                'employee_name' => $employee->name // Añadir el nombre del empleado
            ], 200);
        } else {
            Log::info('EmployeeAuthController@login - Access denied. Reason: ' . $reason);
            //  401 para errores de autenticación/autorización
            return response()->json(['message' => 'Acceso denegado. ' . $reason], 401);
        }
    }
}