<?php
 
 namespace App\Http\Controllers\Api;
 
use App\Models\AdminUserRoom911 as Admin; // Usar tu modelo específico y un alias 'Admin'.
 use App\Http\Controllers\Controller;
 use Illuminate\Http\Request;
 use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator; // Asegúrate de importar Validator

class AdminController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
     {
        //
        // Podrías añadir lógica de búsqueda o paginación aquí si es necesario
        $admins = Admin::orderBy('username')->get();
        return response()->json(['data' => $admins]);
     }
 
     /**
      * Store a newly created resource in storage.
      *
      * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
      */
     public function store(Request $request)
     {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string|max:255|unique:admin_users_room911,username',
            'password' => 'required|string|min:8|confirmed',
        ]);
 
         if ($validator->fails()) {
            return response()->json(['message' => 'Error de validación', 'errors' => $validator->errors()], 422);
         }
 
         try {
            $admin = Admin::create([
                'username' => $request->username,
                'password' => Hash::make($request->password),
            ]);
 
 
             return response()->json([
                 'message' => 'Administrador creado exitosamente.',
                 'admin' => $admin,
             ], 201); // Cerrar el array y la llamada a json
         } catch (\Exception $e) {
             return response()->json(['message' => 'Error al crear el administrador.', 'error' => $e->getMessage()], 500);
        }
    }

    
     
} // Cerrar la clase AdminController
