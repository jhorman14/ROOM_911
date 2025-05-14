<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Intentos de Acceso Fallidos (ID Inexistente)</title>
    <style>
        body {
            font-family: 'DejaVu Sans', sans-serif; /* DejaVu Sans soporta más caracteres UTF-8 */
            font-size: 10px;
            margin: 0;
            padding: 0;
        }
        .container {
            width: 95%;
            margin: 20px auto;
        }
        h1 {
            text-align: center;
            margin-bottom: 15px;
            font-size: 16px;
        }
        .filters {
            margin-bottom: 15px;
            font-size: 11px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 5px; /* Reducido para más datos por página */
            text-align: left;
            word-wrap: break-word; /* Para que el user agent no desborde */
        }
        th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        .footer { text-align: center; font-size: 9px; color: #777; position: fixed; bottom: -30px; left: 0px; right: 0px; height: 50px; }
        /* Para paginación si dompdf la soporta bien con page-break-after (puede ser limitado) */
        /* @page { margin: 100px 25px; } */
    </style>
</head>
<body>
    <div class="container">
        <h1>Intentos de Acceso Fallidos (Identificador Inexistente)</h1>
        <div class="filters">
            <strong>Filtros aplicados:</strong><br>
            Fecha Desde: {{ $startDate ?? 'N/A' }} <br>
            Fecha Hasta: {{ $endDate ?? 'N/A' }}
        </div>
        <table>
            <thead>
                <tr>
                    <th style="width: 20%;">Identificación Intentada</th>
                    <th style="width: 25%;">Fecha y Hora</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($attempts as $attempt)
                    <tr>
                        <td>{{ $attempt->identification_attempted }}</td>
                        <td>{{ \Carbon\Carbon::parse($attempt->attempted_at)->format('d/m/Y H:i:s') }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="4" style="text-align: center;">No hay intentos registrados para los filtros aplicados.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
        <div class="footer">Generado el {{ \Carbon\Carbon::now()->format('d/m/Y H:i:s') }}</div>
    </div>
</body>
</html>