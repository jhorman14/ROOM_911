<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('access_logs_room911', function (Blueprint $table) {
            // Cambiar la columna employee_id para que sea nullable
            // Asegúrate de que el tipo de dato (unsignedBigInteger) coincida con tu definición original
            // Si tu columna employee_id no es una clave foránea o es de otro tipo, ajusta esto.
            // Por ejemplo, si solo es BIGINT: $table->bigInteger('employee_id')->nullable()->change();
            $table->unsignedBigInteger('employee_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('access_logs_room911', function (Blueprint $table) {
            // Para revertir, la haríamos no nullable de nuevo.
            // ¡PRECAUCIÓN! Esto fallará si ya hay datos NULL en la columna.
            // Considera si realmente necesitas una lógica de down() compleja aquí.
            $table->unsignedBigInteger('employee_id')->nullable(false)->change();
        });
    }
};