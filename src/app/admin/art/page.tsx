'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Art } from '@/types/art'; // Asegúrate de tener tu tipo Art definido
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

export default function AdminArtPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [arts, setArts] = useState<Art[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchArts = async () => {
        try {
            const data = await api.get('api/arts/all').json<Art[]>();
            setArts(data);
        } catch (err) {
            console.error("Error cargando obras:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchArts();
    }, []);

    if (loading) return <div className="p-32 text-center">Cargando catálogo...</div>;


    const handleDelete = async (id: number) => {
        if (!confirm("¿Estás seguro de eliminar esta obra? Esta acción no se puede deshacer.")) return;

        try {
            await api.delete(`api/arts/${id}`);
            setArts(prev => prev.filter(art => art.id !== id));
            alert("Obra eliminada con éxito.");
        } catch (err) {
            alert("Error al eliminar la obra.");
            console.error(err);
        }
    };


    const handleEdit = async (id: number) => {
        router.push(`/admin/art/nueva-obra?id=${id}`)
    };

    return (
        <div className="min-h-screen bg-stone-50 pt-32 pb-20 px-6">
            <div className="max-w-6xl mx-auto bg-white shadow-sm border border-stone-200 rounded-3xl p-10">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-serif font-bold text-slate-950">Gestión de Obras</h1>
                    <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800"
                        onClick={() => router.push('/admin/art/nueva-obra')}>
                        + Nueva Obra
                    </button>
                </div>

                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-stone-200 text-stone-400 text-[10px] uppercase tracking-widest">
                            <th className="pb-4">Nombre</th>
                            <th className="pb-4">Artista</th>
                            <th className="pb-4">Género</th>
                            <th className="pb-4">Precio</th>
                            <th className="pb-4">Estatus</th>
                            <th className="pb-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                        {arts.map((art) => (
                            <tr key={art.id} className="text-sm">
                                <td className="py-4 font-bold text-slate-900">{art.nombre}</td>
                                <td className="py-4 text-stone-600">{art.artista?.nombre || 'Desconocido'}</td>
                                <td className="py-4 text-stone-600">{art.genero?.nombre}</td>
                                <td className="py-4 text-stone-600">${art.precioBase.toLocaleString()}</td>
                                <td className="py-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${art.estatus === 'Disponible' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'
                                        }`}>
                                        {art.estatus.toUpperCase()}
                                    </span>
                                </td>
                                <td className="py-4 text-right">
                                    <Link
                                        href={`/admin/art/nueva-obra?id=${art.id}`}
                                        className="text-stone-400 hover:text-slate-900 mx-2"
                                    >
                                        Editar
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(art.id)}
                                        disabled={art.estatus !== 'Disponible'} // Bloqueado si no está disponible
                                        className={`font-bold ${art.estatus === 'Disponible'
                                            ? 'text-red-400 hover:text-red-600 cursor-pointer'
                                            : 'text-stone-300 cursor-not-allowed' // Gris cuando está bloqueado
                                            }`}
                                    >
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}