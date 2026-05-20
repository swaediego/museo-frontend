'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function RegisterAdminPage() {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);
    const [formData, setFormData] = useState({
        login: '',
        password: '',
        nombre: '',
        apellido: '',
        email: '',
        cargo: ''
    });

    useEffect(() => {
        // 1. Verificamos si hay un usuario en sesión
        const storedUser = localStorage.getItem('user');

        if (!storedUser) {
            router.push('/login');
            return;
        }

        const authData = JSON.parse(storedUser);
        const user = authData.user;

        // 2. Si no tiene la propiedad 'cargo', no es admin
        if (!user || !user.cargo) {
            alert("Acceso denegado: Se requieren permisos de administrador.");
            router.push('/'); // Redirigir a la home o perfil
        } else {
            setAuthorized(true);
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('api/admins/register', { json: formData }).json();
            alert("Nuevo administrador registrado exitosamente");
            router.push('/admin/dashboard');
        } catch (error) {
            alert("Error al registrar administrador. Verifique si el login ya existe.");
            console.log(error)
        }
    };

    // Mientras verifica la sesión, no mostramos nada para evitar el "parpadeo" del formulario
    if (!authorized) return null;

    return (
        <div className="min-h-screen bg-stone-50 pt-32 pb-20 px-6">
            <div className="max-w-md mx-auto bg-white shadow-sm border border-stone-200 rounded-3xl p-10">
                <div className="mb-8">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                        Gestión de Personal
                    </span>
                    <h1 className="text-3xl font-serif font-bold text-slate-950 mt-4">Registro</h1>
                    <p className="text-stone-500 text-sm mt-2">Crea una nueva cuenta con privilegios administrativos.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1 tracking-tight">Nombre</label>
                            <input
                                required
                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                className="w-full p-3 bg-white rounded-xl border border-stone-300 text-slate-950 font-medium focus:ring-2 focus:ring-slate-950 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1 tracking-tight">Apellido</label>
                            <input
                                required
                                onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                                className="w-full p-3 bg-white rounded-xl border border-stone-300 text-slate-950 font-medium focus:ring-2 focus:ring-slate-950 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1 tracking-tight">Email Institucional</label>
                        <input
                            type="email"
                            required
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full p-3 bg-white rounded-xl border border-stone-300 text-slate-950 font-medium focus:ring-2 focus:ring-slate-950 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1 tracking-tight">Cargo / Departamento</label>
                        <input
                            required
                            placeholder="Ej: Curador Jefe"
                            onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                            className="w-full p-3 bg-stone-50 rounded-xl border border-stone-300 text-slate-950 font-medium focus:ring-2 focus:ring-slate-950 outline-none transition-all italic"
                        />
                    </div>

                    <div className="pt-4 border-t border-stone-100 mt-4">
                        <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1 tracking-tight">Usuario (Login)</label>
                        <input
                            required
                            onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                            className="w-full p-3 bg-white rounded-xl border border-stone-300 text-slate-950 font-medium focus:ring-2 focus:ring-slate-950 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase block mb-1 tracking-tight">Contraseña Temporal</label>
                        <input
                            type="password"
                            required
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full p-3 bg-white rounded-xl border border-stone-300 text-slate-950 font-medium focus:ring-2 focus:ring-slate-950 outline-none transition-all"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-slate-950 text-white font-bold py-4 rounded-xl hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all mt-6 active:scale-[0.98]"
                    >
                        Finalizar Registro
                    </button>
                </form>
            </div>
        </div>
    );
}