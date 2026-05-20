'use client';
import { useEffect, useState } from 'react';
import { User } from '@/types/art';
import { api } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';

export default function ProfilePage() {
    const [user, setUser] = useState<User | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [passwordData, setPasswordData] = useState({ passwordActual: '', passwordNueva: '', confirmarPassword: '' });

    useEffect(() => {
        const loadUserData = () => {
            const stored = localStorage.getItem('user');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    const userData = parsed.user || parsed;
                    setUser(userData);
                    setFormData(userData);
                } catch (e) {
                    console.error("Error al parsear user:", e);
                }
            }
        };

        loadUserData();
        window.addEventListener('storage', loadUserData);
        return () => window.removeEventListener('storage', loadUserData);
    }, []);

    const isAdmin = user && 'cargo' in user;
    const isPrincipal = isAdmin && user?.rol === 'PRINCIPAL';

    const updateMutation = useMutation({
        mutationFn: (data: any) => {
            const endpoint = isAdmin ? `api/admins/${user?.id}` : `api/buyers/${user?.id}`;
            return api.patch(endpoint, { json: data }).json<any>();
        },
        onSuccess: (updatedUser) => {
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            setFormData(updatedUser);
            setIsEditing(false);
            alert("Perfil actualizado exitosamente");
        }
    });

    const resignMutation = useMutation({
        mutationFn: () => {
            return api.post(`api/admins/${user?.id}/resign`).json<any>();
        },
        onSuccess: () => {
            alert("Has renunciado al cargo de administrador principal.");
            setUser({ ...user!, rol: 'SECUNDARIO' });
            localStorage.setItem('user', JSON.stringify({ ...user!, rol: 'SECUNDARIO' }));
        },
        onError: (err: any) => {
            alert(err?.message || "Error al renunciar al cargo.");
        }
    });

    const passwordMutation = useMutation({
        mutationFn: () => {
            if (passwordData.passwordNueva !== passwordData.confirmarPassword) {
                throw new Error("Las contraseñas nuevas no coinciden.");
            }
            return api.put(`api/admins/${user?.id}/password`, {
                json: {
                    passwordActual: passwordData.passwordActual,
                    passwordNueva: passwordData.passwordNueva
                }
            }).json<any>();
        },
        onSuccess: () => {
            alert("Contraseña actualizada exitosamente.");
            setPasswordData({ passwordActual: '', passwordNueva: '', confirmarPassword: '' });
            setShowPasswordSection(false);
        },
        onError: (err: any) => {
            alert(err?.message || "Error al cambiar la contraseña.");
        }
    });

    if (!user) return <div className="p-40 text-center">Cargando perfil...</div>;


    //Helper para reducir cantidad de codigo en el return de inputs
    const renderInput = (label: string, field: string, type: string = "text") => (
        <div>
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">{label}</label>
            <input
                type={type}
                disabled={!isEditing}
                value={formData[field] || ''}
                onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                className="w-full p-3 bg-white rounded-xl border border-stone-300 text-slate-950 font-medium focus:ring-2 focus:ring-amber-600 outline-none transition-all disabled:bg-stone-50 disabled:border-stone-200"
            />
        </div>
    );

    const renderReadOnly = (label: string, field: string) => (
        <div>
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">{label}</label>
            <input

                disabled={true} // Siempre deshabilitado
                value={formData[field] || 'SIN PAGAR'}
                className="w-full p-3 bg-stone-100 rounded-xl border border-stone-200 text-slate-500 font-medium cursor-not-allowed"
            />
        </div>
    );

    return (
        <div className="min-h-screen bg-stone-50 pt-32 pb-20 px-6">
            <div className="max-w-2xl mx-auto bg-white shadow-sm border border-stone-200 rounded-3xl p-10">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-serif font-bold text-slate-950">
                        {isAdmin ? "Perfil de Administrador" : "Mi Perfil"}
                    </h1>
                    <div className="flex gap-3">
                        {isPrincipal && (
                            <button
                                onClick={() => {
                                    if (confirm("¿Estás seguro de renunciar al cargo de administrador principal?")) {
                                        resignMutation.mutate();
                                    }
                                }}
                                className="text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                            >
                                Renunciar al cargo
                            </button>
                        )}
                        <button
                            onClick={() => isEditing ? updateMutation.mutate(formData) : setIsEditing(true)}
                            className={`text-xs font-bold uppercase tracking-widest px-6 py-2 rounded-full transition-all ${isEditing ? 'bg-amber-600 text-white shadow-lg' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                        >
                            {updateMutation.isPending ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Editar Datos'}
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    {renderReadOnly("Nombre de Usuario", "login")}
                    <div className="grid grid-cols-2 gap-4">
                        {renderInput("Nombre", "nombre")}
                        {renderInput("Apellido", "apellido")}
                    </div>
                    {renderInput("Email", "email", "email")}


                    {isAdmin ? (
                        <div>
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Cargo</label>
                            <input
                                disabled={true}
                                value={(user as any).cargo?.nombre || 'Sin cargo'}
                                className="w-full p-3 bg-stone-100 rounded-xl border border-stone-200 text-slate-500 font-medium cursor-not-allowed"
                            />
                        </div>
                    ) : (
                        <>
                            {renderInput("Dirección de Envío", "direccionEnvio")}
                            <div className="grid grid-cols-2 gap-4">
                                {renderInput("Número de Tarjeta (últimos 4 dígitos)", "datosTarjetaMask")}
                                {/* AQUÍ USAMOS EL NUEVO COMPONENTE QUE ES SOLO DE LECTURA */}
                                {renderReadOnly("Código de Seguridad", "codigoSeguridad")}
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Tipo de Membresía</label>
                                <div
                                    className={`w-full p-3 rounded-xl text-center font-bold
                                        ${formData.membresiaPaga
                                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                            : 'bg-stone-100 text-stone-500 border border-stone-200'
                                        }`}
                                >
                                    {formData.membresiaPaga ? 'Premium' : 'Básica'}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Botón Cancelar - Solo visible si estamos editando */}
                    {isEditing && (
                        <button
                            onClick={() => { setIsEditing(false); setFormData(user); }}
                            className="text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-red-500 underline transition-colors"
                        >
                            Cancelar edición
                        </button>
                    )}

                    {/* Sección de cambio de contraseña */}
                    {isAdmin && (
                        <div className="border-t border-stone-200 pt-6 mt-6">
                            {!showPasswordSection ? (
                                <button
                                    onClick={() => setShowPasswordSection(true)}
                                    className="text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-stone-800 underline transition-colors"
                                >
                                    Cambiar contraseña
                                </button>
                            ) : (
                                <div className="space-y-4 bg-stone-50 p-6 rounded-xl">
                                    <h3 className="text-sm font-bold text-stone-700 uppercase tracking-wider">Cambiar Contraseña</h3>
                                    <div>
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Contraseña Actual</label>
                                        <input
                                            type="password"
                                            value={passwordData.passwordActual}
                                            onChange={(e) => setPasswordData({ ...passwordData, passwordActual: e.target.value })}
                                            className="w-full p-3 bg-white rounded-xl border border-stone-300 text-slate-950 font-medium focus:ring-2 focus:ring-amber-600 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Nueva Contraseña</label>
                                        <input
                                            type="password"
                                            value={passwordData.passwordNueva}
                                            onChange={(e) => setPasswordData({ ...passwordData, passwordNueva: e.target.value })}
                                            className="w-full p-3 bg-white rounded-xl border border-stone-300 text-slate-950 font-medium focus:ring-2 focus:ring-amber-600 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Confirmar Nueva Contraseña</label>
                                        <input
                                            type="password"
                                            value={passwordData.confirmarPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, confirmarPassword: e.target.value })}
                                            className="w-full p-3 bg-white rounded-xl border border-stone-300 text-slate-950 font-medium focus:ring-2 focus:ring-amber-600 outline-none"
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => passwordMutation.mutate()}
                                            className="px-6 py-2 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-full hover:bg-slate-800 transition-all"
                                        >
                                            Guardar Contraseña
                                        </button>
                                        <button
                                            onClick={() => { setShowPasswordSection(false); setPasswordData({ passwordActual: '', passwordNueva: '', confirmarPassword: '' }); }}
                                            className="px-6 py-2 bg-stone-200 text-stone-600 text-xs font-bold uppercase tracking-widest rounded-full hover:bg-stone-300 transition-all"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}