'use client';
import { useEffect, useState, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { User } from '@/types/art';

type AdminDTO = Omit<User, 'id' | 'fechaRegistro' | 'activo' | 'cargo'> & { idCargo: number };

interface Cargo {
    id: number;
    nombre: string;
    descripcion: string;
}

function CrearAdminPageContent() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const isEditMode = Boolean(id);

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<AdminDTO>({
        login: '',
        nombre: '',
        apellido: '',
        email: '',
        password: '',
        telefono: '',
        idCargo: 7,
        rol: 'SECUNDARIO',
    });
    const [loginError, setLoginError] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (stored) {
            const parsed = JSON.parse(stored);
            setCurrentUser(parsed.user || parsed);
        }
    }, []);

    const { data: cargos } = useQuery<Cargo[]>({
        queryKey: ['cargos'],
        queryFn: () => api.get('api/cargos').json<Cargo[]>(),
    });

    const { data: adminData } = useQuery({
        queryKey: ['admin', id],
        queryFn: () => api.get(`api/admins/${id}`).json<User>(),
        enabled: isEditMode,
    });

    useEffect(() => {
        if (adminData) {
            const adminCargo = (adminData as any).cargo;
            setFormData({
                login: adminData.login || '',
                nombre: adminData.nombre || '',
                apellido: adminData.apellido || '',
                email: adminData.email || '',
                password: '',
                telefono: adminData.telefono || '',
                idCargo: adminCargo?.id || 7,
                rol: (adminData as any).rol || 'SECUNDARIO',
            });
        }
    }, [adminData]);

    const isEditingSelf = currentUser && id && Number(id) === currentUser.id;

    const mutation = useMutation<User, Error, AdminDTO>({
        mutationFn: (adminPayload: AdminDTO) => {
            const endpoint = isEditMode ? `api/admins/${id}?requesterId=${currentUser?.id}` : 'api/admins/register';
            const method = isEditMode ? 'patch' : 'post';
            return api[method](endpoint, { json: adminPayload }).json<User>();
        },
        onSuccess: (updatedAdmin) => {
            queryClient.invalidateQueries({ queryKey: ['admins'] });

            if (isEditingSelf && updatedAdmin) {
                localStorage.setItem('user', JSON.stringify(updatedAdmin));
            }

            alert(`Administrador ${isEditMode ? 'actualizado' : 'creado'} con éxito!`);
            router.push('/admin/admins');
        },
        onError: (err: any) => {
            alert(err?.message || `Error al ${isEditMode ? 'actualizar' : 'crear'} el administrador.`);
        }
    });

    const handleLoginChange = async (value: string) => {
        setFormData(prev => ({ ...prev, login: value }));
        setLoginError('');

        if (!value || value.length < 3) return;

        if (/\s/.test(value)) {
            setLoginError('El nombre de usuario no puede contener espacios.');
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(value)) {
            setLoginError('Solo se permiten letras, números y guiones bajos.');
            return;
        }

        const exists = await api.get(`api/admins/login-exists?login=${encodeURIComponent(value)}&excludeId=${id || ''}`).json<boolean>();
        if (exists) {
            setLoginError('Este nombre de usuario ya está en uso.');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (loginError) {
            alert('Por favor corrige el error en el nombre de usuario.');
            return;
        }

        if (isEditMode && !isEditingSelf) {
            const payload = { rol: formData.rol };
            mutation.mutate(payload as any);
            return;
        }

        const payload = { ...formData } as any;
        if (!payload.password) {
            delete payload.password;
        }
        delete payload.rol;

        mutation.mutate(payload);
    };

    const handleInputChange = (field: keyof AdminDTO, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="min-h-screen bg-stone-50 p-8 pt-32">
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-stone-100 p-8">
                <h1 className="text-2xl font-serif font-bold text-gray-950 mb-2">
                    {isEditMode ? (isEditingSelf ? 'Editar Mi Perfil' : 'Editar Administrador') : 'Crear Nuevo Administrador'}
                </h1>
                {isEditMode && !isEditingSelf && (
                    <p className="text-sm text-stone-500 mb-6">Solo puedes cambiar el rol de este administrador.</p>
                )}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(isEditingSelf || !isEditMode) && (
                        <>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-black uppercase mb-2">Nombre de Usuario</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.login}
                                    onChange={e => handleLoginChange(e.target.value)}
                                    className={`w-full p-3 bg-white text-black rounded-xl border ${loginError ? 'border-red-500' : 'border-stone-300'}`}
                                />
                                {loginError && <p className="text-red-500 text-xs mt-1">{loginError}</p>}
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-black uppercase mb-2">Nombre</label>
                                <input required type="text" value={formData.nombre} onChange={e => handleInputChange('nombre', e.target.value)} className="w-full p-3 bg-white text-black rounded-xl border border-stone-300" />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-black uppercase mb-2">Apellido</label>
                                <input required type="text" value={formData.apellido} onChange={e => handleInputChange('apellido', e.target.value)} className="w-full p-3 bg-white text-black rounded-xl border border-stone-300" />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-black uppercase mb-2">Email</label>
                                <input required type="email" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} className="w-full p-3 bg-white text-black rounded-xl border border-stone-300" />
                            </div>

                            {isEditMode && (
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-black uppercase mb-2">
                                        Contraseña <span className="font-normal text-stone-400">(dejar en blanco para no cambiar)</span>
                                    </label>
                                    <input type="password" value={formData.password} onChange={e => handleInputChange('password', e.target.value)} className="w-full p-3 bg-white text-black rounded-xl border border-stone-300" />
                                </div>
                            )}

                            {!isEditMode && (
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-black uppercase mb-2">Contraseña</label>
                                    <input required type="password" value={formData.password} onChange={e => handleInputChange('password', e.target.value)} className="w-full p-3 bg-white text-black rounded-xl border border-stone-300" />
                                </div>
                            )}

                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-black uppercase mb-2">Teléfono</label>
                                <input type="tel" value={formData.telefono} onChange={e => handleInputChange('telefono', e.target.value)} className="w-full p-3 bg-white text-black rounded-xl border border-stone-300" />
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-black uppercase mb-2">Cargo</label>
                                <select
                                    value={formData.idCargo}
                                    onChange={e => handleInputChange('idCargo', Number(e.target.value))}
                                    className="w-full p-3 bg-white text-black rounded-xl border border-stone-300"
                                >
                                    {cargos?.map(cargo => (
                                        <option key={cargo.id} value={cargo.id}>
                                            {cargo.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    {isEditMode && !isEditingSelf && currentUser?.rol === 'PRINCIPAL' && (
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-black uppercase mb-2">Rol</label>
                            <select
                                value={formData.rol}
                                onChange={e => setFormData(prev => ({ ...prev, rol: e.target.value as 'PRINCIPAL' | 'SECUNDARIO' }))}
                                className="w-full p-3 bg-white text-black rounded-xl border border-stone-300"
                            >
                                <option value="SECUNDARIO">Secundario</option>
                                <option value="PRINCIPAL">Principal</option>
                            </select>
                        </div>
                    )}

                    <div className="md:col-span-2 flex gap-4 mt-4">
                        <button type="button" onClick={() => router.back()} className="flex-1 px-6 py-3 rounded-xl border border-stone-200 font-bold text-stone-600 hover:bg-stone-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={mutation.isPending || !!loginError} className="flex-1 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 disabled:bg-stone-400">
                            {mutation.isPending ? 'Guardando...' : (isEditMode ? 'Actualizar' : 'Crear')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function CrearAdminPage() {
    return (
        <Suspense fallback={<div className="p-8">Cargando...</div>}>
            <CrearAdminPageContent />
        </Suspense>
    );
}