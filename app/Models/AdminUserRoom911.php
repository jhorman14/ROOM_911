<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class AdminUserRoom911 extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'admin_users_room911'; // Asegúrate de que coincida con el nombre de tu tabla

    protected $fillable = [
        'username',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'password' => 'hashed',
    ];

    public function hasAbility(string $ability): bool
    {
        // Define tus habilidades aquí. Puedes usar roles, permisos, etc.
        // Este es un ejemplo básico.

        if ($this->username === 'admin' && $ability === 'admin') {
            return true;
        }

        // Puedes tener una columna 'role' en tu tabla de administradores
        // y verificarla aquí.
        // if ($this->role === 'superadmin') {
        //     return true;
        // }

        // Otro ejemplo usando una columna 'permissions' como un array JSON
        // if (in_array($ability, json_decode($this->permissions, true) ?? [])) {
        //     return true;
        // }

        return false; // Por defecto, el usuario no tiene la habilidad
    }
}