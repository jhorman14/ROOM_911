<?php

namespace Database\Seeders;

use App\Models\AdminUserRoom911; // Asegúrate de usar el namespace correcto de tu modelo
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        AdminUserRoom911::create([
            'username' => 'admin', 
            'password' => Hash::make('12345678'),
        ]);
    }
}