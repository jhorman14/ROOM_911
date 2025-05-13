<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Historial de Accesos</title>
    <style>
        body { font-family: 'DejaVu Sans', sans-serif; margin: 20px; font-size: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ccc; padding: 6px; text-align: left; word-wrap: break-word; }
        th { background-color: #f2f2f2; font-weight: bold; }
        h1 { text-align: center; font-size: 16px; margin-bottom: 5px; }
        .employee-info { margin-bottom: 10px; font-size: 11px; }
        .filter-info { font-size: 9px; color: #555; margin-bottom: 10px; }
        .text-muted { color: #6c757d; }
    </style>
</head>
<body>
    <h1>Historial de Accesos</h1>

    @if(isset($employeeName) && isset($employeeId))
        <div class="employee-info">
            <strong>Empleado:</strong> {{ $employeeName }} 
        </div>
    @endif

    @if(!empty($filters['startDate']) || !empty($filters['endDate']))
        <div class="filter-info">
            <strong>Filtros Aplicados:</strong>
            @if(!empty($filters['startDate']))
                Desde: {{ \Carbon\Carbon::parse($filters['startDate'])->format('d/m/Y') }}
            @endif
            @if(!empty($filters['endDate']))
                @if(!empty($filters['startDate'])) | @endif
                Hasta: {{ \Carbon\Carbon::parse($filters['endDate'])->format('d/m/Y') }}
            @endif
        </div>
    @endif

    <table>
        <thead>
            <tr>
                <th>Fecha y Hora</th>
                <th>Resultado</th>
                <th>Identificación Intentada</th>
                <th>Razón</th>
            </tr>
        </thead>
        <tbody>
            @forelse($accessLogs as $log)
                <tr>
                    <td>{{ \Carbon\Carbon::parse($log->attempted_at)->setTimezone(config('app.timezone'))->format('d/m/Y H:i:s') }}</td>
                    <td>{{ $log->access_result }}</td>
                    <td class="text-muted">{{ $log->identification_attempted ?: 'N/A' }}</td>
                    <td>{{ $log->failure_reason ?: 'Acceso exitoso' }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="4" style="text-align: center;">No se encontraron registros de acceso para los filtros aplicados.</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>