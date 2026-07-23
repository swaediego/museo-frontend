'use client';
import { useEffect, useState } from 'react';
import { User, Buyer } from '@/types/art';
import { api } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';
import RecommendationSection from '@/components/RecommendationSection';
import { formatCardMask } from '@/utils/formatters';

// MODIFICADO por Diego Torrelles (23/07/2026) — input de solo lectura con toggle
// de visibilidad (ojito). Reemplaza al renderReadOnly genérico solo para campos
// sensibles como el código de seguridad. El ojito tachado = oculto, normal = visible.
// Al hacer click se mantiene el código visible el tiempo que el usuario quiera
// (no se auto-oculta), para permitir copiarlo.
function ReadOnlyWithToggle({ label, value }: { label: string; value: string }) {
    const [visible, setVisible] = useState(false);
    // Si no hay valor, mostramos un placeholder neutro
    const hasValue = value && value.trim().length > 0;
    const display = !hasValue
        ? '—'
        : visible
            ? value
            : '•'.repeat(Math.max(value.length, 6));

    return (
        <div>
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                {label}
            </label>
            <div className="relative">
                <input
                    type="text"
                    readOnly
                    value={display}
                    className="w-full p-3 pr-12 bg-stone-100 rounded-xl border border-stone-200 text-slate-500 font-medium cursor-not-allowed select-all"
                    aria-label={label}
                />
                <button
                    type="button"
                    // MODIFICADO por Diego Torrelles (23/07/2026) — toggle manual,
                    // no se auto-oculta para que el usuario pueda copiar el código
                    // con el ojito abierto.
                    onClick={() => setVisible(v => !v)}
                    title={visible ? 'Ocultar código' : 'Mostrar código'}
                    aria-label={visible ? 'Ocultar código' : 'Mostrar código'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-stone-200 text-stone-500 hover:text-slate-800 transition-colors"
                >
                    {visible ? (
                        // Ojito ABIERTO (sin tachar) = código VISIBLE
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                    ) : (
                        // Ojito TACHADO = código OCULTO
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
}

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
    const renderInput = (label: string, field: string, type: string = "text", transform?: (val: string) => string) => (
        <div>
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">{label}</label>
            <input
                type={type}
                disabled={!isEditing}
                // MODIFICADO por Diego Torrelles ( bd2-proyecto ) — aplicar transform al display
                // tambien, asi si la DB tiene "3456" sin formato, al renderizar se ve
                // "XXXX-XXXX-XXXX-3456".
                value={transform ? transform(formData[field] || '') : (formData[field] || '')}
                onChange={(e) => {
                    const raw = e.target.value;
                    setFormData({ ...formData, [field]: transform ? transform(raw) : raw });
                }}
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
                                {renderInput("Número de Tarjeta (últimos 4 dígitos)", "datosTarjetaMask", "text", formatCardMask)}
                                {/* MODIFICADO por Diego Torrelles (23/07/2026) — código de seguridad
                                    ahora usa ReadOnlyWithToggle (ojito) en lugar de renderReadOnly.
                                    Por defecto oculto (••••), el usuario hace click en el ojito
                                    para mostrarlo y poder copiarlo. Toggle manual, no se auto-oculta. */}
                                <ReadOnlyWithToggle
                                    label="Código de Seguridad"
                                    value={formData.codigoSeguridad || ''}
                                />
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
                    {/* Perfil del comprador — sección de recomendaciones de Neo4j (solo miembros premium) */}
                    {!isAdmin && user && 'membresiaPaga' in user && (user as Buyer).membresiaPaga && (
                        <RecommendationSection buyerId={user.id} />
                    )}
                </div>
            </div>
        </div>
    );
}