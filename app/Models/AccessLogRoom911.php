<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccessLogRoom911 extends Model
{
    use HasFactory;

    protected $table = 'access_logs_room911'; // Asegúrate de que coincida con el nombre de tu tabla

    protected $fillable = [
        'employee_id',
        'identification_attempted',
        'access_result',
        'attempted_at',
        'failure_reason',
    ];

    protected $casts = [
        'attempted_at' => 'datetime',
    ];
    

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}