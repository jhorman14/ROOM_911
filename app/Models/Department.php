<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Department extends Model
{
    use HasFactory;

    protected $table = 'departments'; // Asegúrate de que coincida con el nombre de tu tabla

    protected $fillable = [
        'name',
    ];

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }
}