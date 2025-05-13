<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Laravel\Sanctum\HasApiTokens;

class Employee extends Model
{
    use HasFactory, HasApiTokens;

    protected $table = 'employees'; // Asegúrate de que coincida con el nombre de tu tabla

    protected $fillable = [
        'identification_id', // Asumiendo que este es el identificador principal
        'name',
        'last_name',
        'department_id',
        'access_enabled',
    ];

    protected $casts = [
        'access_enabled' => 'boolean',
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function accessLogs(): HasMany
    {
        return $this->hasMany(AccessLogRoom911::class,'employee_id', 'id');
    }
}