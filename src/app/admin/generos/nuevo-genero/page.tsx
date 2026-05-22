'use client';
import { useState, useEffect, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';

function NuevoGeneroPageContent() {
    const router = useRouter();
    const id = useSearchParams().get('id');
    const [nombre, setNombre] = useState('');

    const { data: generoEdicion } = useQuery({
        queryKey: ['genero', id],
        queryFn: () => api.get(`api/genres/${id}`).json<any>(),
        enabled: !!id
    });

    useEffect(() => { if (generoEdicion) setNombre(generoEdicion.nombre); }, [generoEdicion]);

    const mutation = useMutation({
        mutationFn: (data: any) => id ? api.put(`api/genres/${id}`, { json: data }) : api.post('api/genres', { json: data }),
        onSuccess: () => router.push('/admin/generos')
    });

    return (
        <div className="min-h-screen bg-stone-50 p-8">
            <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-sm border">
                <h1 className="text-xl font-bold text-black mb-6">{id ? 'Editar' : 'Nuevo'} Género</h1>
                <form onSubmit={(e) => { e.preventDefault(); mutation.mutate({ nombre }); }}>
                    <input className="w-full p-3 text-black border rounded-xl mb-4" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Pintura" />
                    <div className="flex gap-2">
                        <button type="button" onClick={() => router.back()} className="flex-1 px-4 py-2 text-black rounded-xl border">Cancelar</button>
                        <button type="submit" className="flex-1 bg-slate-900 text-white py-2 rounded-xl">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function NuevoGeneroPage() {
    return (
        <Suspense fallback={<div className="p-8">Cargando...</div>}>
            <NuevoGeneroPageContent />
        </Suspense>
    );
}