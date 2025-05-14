<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccessLogRoom911; // Asegúrate que el namespace y modelo son correctos
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;


class SecurityController extends Controller
{
    public function getFailedIdentifierAttempts(Request $request)
    {
        // Para mostrar los intentos donde la identificación no existe,
        // el valor correcto es 'no-registrado', según tu EmployeeAuthController.
        $query = AccessLogRoom911::where('access_result', 'no-registrado');

        if ($request->filled('start_date')) {
            $query->whereDate('attempted_at', '>=', $request->start_date); // Usar attempted_at
        }
        if ($request->filled('end_date')) {
            $query->whereDate('attempted_at', '<=', $request->end_date); // Usar attempted_at
        }

        $attempts = $query->orderBy('attempted_at', 'desc')  // Usar attempted_at
                           ->paginate(20);

        return response()->json($attempts);
    }

    public function downloadFailedIdentifierAttemptsPdf(Request $request)
    {
        $query = AccessLogRoom911::where('access_result', 'no-registrado');

        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        if ($startDate) {
            $query->whereDate('attempted_at', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('attempted_at', '<=', $endDate);
        }

        $attempts = $query->orderBy('attempted_at', 'desc')->get(); // Obtener todos, no paginar para el PDF

        $pdf = PDF::loadView('pdfs.failed_identifier_attempts', [
            'attempts' => $attempts,
            'startDate' => $startDate ? \Carbon\Carbon::parse($startDate)->format('d/m/Y') : 'Inicio',
            'endDate' => $endDate ? \Carbon\Carbon::parse($endDate)->format('d/m/Y') : 'Fin',
        ]);

        return $pdf->download('intentos_fallidos_id_inexistente.pdf');
    }
}

