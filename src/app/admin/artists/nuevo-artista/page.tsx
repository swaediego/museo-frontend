'use client';
import { useEffect, useState, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { Artist, Genre } from '@/types/art';

function NuevaArtistaPageContent() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');

    const [formData, setFormData] = useState({
        nombre: '',
        nacionalidad: '',
        biografia: '',
        porcentajeGanancia: 5,
        fechaNacimiento: '',
        fotoUrl: '',
        generoIds: [] as number[]
    });

    const { data: artistaEdicion, isLoading } = useQuery({
        queryKey: ['artista', id],
        queryFn: () => api.get(`api/artists/${id}`).json<Artist>(),
        enabled: !!id,
    });

    useEffect(() => {
        if (artistaEdicion) {
            setFormData({
                nombre: artistaEdicion.nombre || '',
                nacionalidad: artistaEdicion.nacionalidad || '',
                biografia: artistaEdicion.biografia || '',
                porcentajeGanancia: artistaEdicion.porcentajeGanancia || 5,
                fechaNacimiento: artistaEdicion.fechaNacimiento || '',
                fotoUrl: artistaEdicion.fotoUrl || '',
                generoIds: (artistaEdicion.generos || []).map((g: any) => g.id)
            });
        }
    }, [artistaEdicion]);

    const { data: generos } = useQuery({
        queryKey: ['generos'],
        queryFn: () => api.get('api/genres').json<Genre[]>()
    });

    const mutation = useMutation({
        mutationFn: (data: any) => id
            ? api.put(`api/artists/${id}`, { json: data })
            : api.post('api/artists', { json: data }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['artistas'] });
            router.push('/admin/artists');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({
            ...formData,
            generos: formData.generoIds.map(gId => ({ id: gId }))
        });
    };

    const toggleGenero = (gId: number) => {
        setFormData(prev => ({
            ...prev,
            generoIds: prev.generoIds.includes(gId)
                ? prev.generoIds.filter(id => id !== gId)
                : [...prev.generoIds, gId]
        }));
    };

    if (id && isLoading) return <div className="p-8">Cargando artista...</div>;

    return (
        <div className="min-h-screen bg-stone-50 p-8">
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-stone-100 p-8">
                <h1 className="text-2xl font-serif font-bold mb-6">{id ? 'Editar' : 'Registrar'} Artista</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Nombre</label>
                        <input className="w-full p-3 border rounded-xl" required value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Nacionalidad</label>
                            <input className="w-full p-3 border rounded-xl" value={formData.nacionalidad} onChange={e => setFormData({ ...formData, nacionalidad: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Fecha Nacimiento</label>
                            <input type="date" className="w-full p-3 border rounded-xl" value={formData.fechaNacimiento} onChange={e => setFormData({ ...formData, fechaNacimiento: e.target.value })} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Biografía</label>
                        <textarea className="w-full p-3 border rounded-xl h-24" value={formData.biografia} onChange={e => setFormData({ ...formData, biografia: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">% Ganancia</label>
                            <input type="number" step="0.01" className="w-full p-3 border rounded-xl" value={formData.porcentajeGanancia} onChange={e => setFormData({ ...formData, porcentajeGanancia: Number(e.target.value) })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">URL de la Foto</label>
                            <input type="url" className="w-full p-3 border rounded-xl" value={formData.fotoUrl} onChange={e => setFormData({ ...formData, fotoUrl: e.target.value })} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Géneros Especializados</label>
                        <div className="flex flex-wrap gap-2">
                            {generos?.map(g => (
                                <button key={g.id} type="button" onClick={() => toggleGenero(g.id)} className={`px-3 py-1 rounded-lg text-sm ${formData.generoIds.includes(g.id) ? 'bg-amber-600 text-white' : 'bg-stone-500'}`}>
                                    {g.nombre}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-6">
                        <button type="button" onClick={() => router.back()} className="flex-1 px-6 py-3 rounded-xl border border-stone-200 font-bold text-stone-600 hover:bg-stone-50">Cancelar</button>
                        <button type="submit" className="flex-1 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800">{mutation.isPending ? 'Guardando...' : 'Guardar Artista'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function NuevaArtistaPage() {
    return (
        <Suspense fallback={<div className="p-8">Cargando...</div>}>
            <NuevaArtistaPageContent />
        </Suspense>
    );
}