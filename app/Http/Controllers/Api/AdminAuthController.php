<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminUserRoom911; // Asegúrate de usar tu modelo de administrador
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash; // Importar Hash
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log;

class AdminAuthController extends Controller
{
    public function login(Request $request)
    {
        try {
            $request->validate([
                'username' => 'required',
                'password' => 'required',
            ]);

            $user = AdminUserRoom911::where('username', $request->username)->first();

            if (!$user) {
                return response()->json(['message' => 'Usuario inexistente'], 401);
            }

            // Verificar la contraseña manualmente en lugar de usar Auth::attempt
            if (! Hash::check($request->password, $user->password)) {
                return response()->json(['message' => 'Credenciales inválidas'], 401); // Mensaje más genérico
            }

            $token = $user->createToken('adminAuthToken', ['admin'])->plainTextToken;
            return response()->json(['token' => $token, 'role' => 'admin'], 200);

        } catch (ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->validator->errors()->messages()], 422);
        }
        catch (\Exception $e) {
            // Capturar cualquier otro error inesperado
            return response()->json(['message' => 'Ocurrió un error inesperado durante el inicio de sesión.'], 500);
        }
        
        
    }

    public function logout(Request $request)
    {
        try {
            // Revocar el token actual con el que se está haciendo la petición
            $request->user()->currentAccessToken()->delete();
            Log::info('AdminAuthController@logout - Token revocado exitosamente para el usuario: ' . $request->user()->username);
            return response()->json(['message' => 'Sesión cerrada exitosamente.'], 200);
        } catch (\Exception $e) {
            Log::error("Error durante el logout del administrador: " . $e->getMessage(), ['exception' => $e]);
            // Devolver un error genérico si algo falla, aunque la revocación del token es bastante directa.
            // Si el token ya no es válido o no se encuentra el usuario, $request->user() podría ser null.
            return response()->json(['message' => 'No se pudo cerrar la sesión o ya no estaba activa.'], 400);
        }
    }
}