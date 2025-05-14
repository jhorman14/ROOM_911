<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AdminAuthController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\AccessLogController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\EmployeeAuthController;
use App\Http\Controllers\Api\SecurityController;


Route::post('/admin/login', [AdminAuthController::class, 'login']);
Route::post('/employee/login', [EmployeeAuthController::class, 'login']);

Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/employees', [EmployeeController::class, 'index']);
    Route::post('/employees', [EmployeeController::class, 'store']);
    Route::put('/employees/{employee}', [EmployeeController::class, 'update']);
    Route::get('/employees/{employee}', [EmployeeController::class, 'show']);
    Route::patch('/employees/{employee}/toggle-access', [EmployeeController::class, 'toggleAccess']); // Nueva ruta
    Route::post('/employees/upload-csv', [EmployeeController::class, 'uploadCsv']);
    Route::get('employees/{employee}/access-history', [EmployeeController::class, 'getAccessHistory']);
    Route::get('admin/security/failed-identifier-logins', [SecurityController::class, 'getFailedIdentifierAttempts'])->name('admin.api.security.failed_identifier_logins'); // Ajustado el nombre de la ruta también por consistencia
    Route::get('/employees/{employee}/access-history/pdf', [EmployeeController::class, 'downloadAccessHistoryPdf'])->name('employees.accessHistory.pdf');
    Route::get('admin/security/failed-identifier-logins/pdf', [SecurityController::class, 'downloadFailedIdentifierAttemptsPdf'])->name('admin.api.security.failed_identifier_logins.pdf');
    Route::apiResource('admins', AdminController::class)->only(['index', 'store']);
    Route::get('/departments', [DepartmentController::class, 'index']);
    Route::post('/departments', [DepartmentController::class, 'store']);
    Route::get('/departments/{department}', [DepartmentController::class, 'show']);
    Route::put('/departments/{department}', [DepartmentController::class, 'update']);

    Route::get('/access-logs/{employee}', [AccessLogController::class, 'history']);
    
    Route::post('/admin/logout', [AdminAuthController::class, 'logout']);
});

Route::middleware(['auth:sanctum'])->group(function () { // Puedes usar 'auth:sanctum' solo para empleados
    Route::post('/employee/logout', [EmployeeAuthController::class, 'logout']);
    Route::post('/access-logs', [AccessLogController::class, 'store']);

});