<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccessLogRoom911;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Barryvdh\DomPDF\Facade\Pdf;

class AccessLogController extends Controller
{
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'employee_internal_id' => 'required|exists:employees,internal_id',
            'access_result' => 'required|in:concedido,denegado-credenciales,denegado-departamento,no-registrado',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $employee = Employee::where('internal_id', $request->input('employee_internal_id'))->first();

        if (!$employee) {
            // Esto no debería ocurrir si la validación 'exists' funciona, pero es una buena guarda.
            return response()->json(['message' => 'Empleado no encontrado con el internal_id proporcionado.'], 404);
        }

        AccessLogRoom911::create([
            'employee_id' => $employee->id,
            'access_result' => $request->input('access_result'),
            'attempted_at' => now(),
        ]);

        return response()->json(['message' => 'Registro de acceso guardado'], 201);
    }

    public function history(Employee $employee, Request $request)
    {
        $query = AccessLogRoom911::where('employee_id', $employee->id)->orderBy('attempted_at', 'desc');

        if ($request->has('from') && $request->has('to')) {
            $query->whereBetween('attempted_at', [$request->input('from'), $request->input('to')]);
        }

        $history = $query->get();
        return response()->json($history);
    }

    public function generatePdfHistory(Employee $employee, Request $request)
    {
        $history = $this->history($employee, $request)->getData();
        $pdf = Pdf::loadView('pdf.access_history', ['history' => $history, 'employee' => $employee]); // Usa Pdf (con 'P' mayúscula)
        return $pdf->download("historico_accesos_{$employee->internal_id}.pdf");
    }
}