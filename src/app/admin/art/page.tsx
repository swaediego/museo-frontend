'use client';
import { HTTPError } from 'ky';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Art } from '@/types/art';

export default function AdminArtPage() {
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

    const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
    const [newPriceValue, setNewPriceValue] = useState<string>('');
    const [historyModal, setHistoryModal] = useState<{ art: Art; entries: HistorialPrecio[]; loading: boolean; error: string | null } | null>(null);

    interface HistorialPrecio {
        idRelacional: number;
        fechaCambio: string;
        idEvento: string;
        precioAnterior: number;
        precioNuevo: number;
        motivo: string;
        usuarioAdmin: string;
    }

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

    const handleEditPrice = async (art: Art) => {
        setNewPriceValue(String(art.precioBase));
        setEditingPriceId(art.id);
    };

    const handleViewHistory = async (art: Art) => {
        setHistoryModal({ art, entries: [], loading: true, error: null });
        try {
            const data = await api.get(`api/history/precios/${art.id}`).json<HistorialPrecio[]>();
            setHistoryModal({ art, entries: data, loading: false, error: null });
        } catch {
            setHistoryModal(prev => prev ? { ...prev, loading: false, error: 'Error al cargar el historial.' } : null);
        }
    };

    const handleConfirmPrice = async () => {
        if (editingPriceId === null) return;
        const art = arts.find(a => a.id === editingPriceId);
        if (!art) return;

        const nuevoPrecio = Number(newPriceValue);
        if (!Number.isFinite(nuevoPrecio) || nuevoPrecio <= 0) {
            alert("El precio debe ser un número mayor a 0.");
            return;
        }

        try {
            const updated = await api.patch(`api/arts/${editingPriceId}/precio`, { json: { precio: nuevoPrecio } }).json<Art>();
            setArts(prev => prev.map(a => a.id === editingPriceId ? updated : a));
            alert(`Precio actualizado a $${updated.precioBase.toLocaleString()}.`);
        } catch (err) {
            let msg = "Error al actualizar el precio.";
            if (err instanceof HTTPError) {
                try {
                    msg = await err.response.text();
                } catch { /* dejar mensaje genérico */ }
            } else if (err instanceof Error) {
                msg = err.message;
            }
            alert(msg);
            console.error(err);
        } finally {
            setEditingPriceId(null);
            setNewPriceValue('');
        }
    };
return (
        <div className="min-h-screen bg-stone-50 pt-32 pb-20 px-6">
            <div className="max-w-6xl mx-auto bg-white shadow-sm border border-stone-200 rounded-3xl p-10">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-serif font-bold text-slate-950">Gestión de Obras</h1>
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
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${art.estatus?.toLowerCase() === 'disponible' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'
                                        }`}>
                                        {art.estatus?.toUpperCase()}
                                    </span>
                                </td>
                                <td className="py-4 text-right space-x-4">
                                    <button
                                        onClick={() => handleViewHistory(art)}
                                        className="font-bold text-sky-600 hover:text-sky-800 cursor-pointer"
                                    >
                                        Ver historial
                                    </button>
                                    <button
                                        onClick={() => handleEditPrice(art)}
                                        disabled={art.estatus?.toLowerCase() !== 'disponible'}
                                        className={`font-bold ${art.estatus?.toLowerCase() === 'disponible'
                                            ? 'text-amber-600 hover:text-amber-800 cursor-pointer'
                                            : 'text-stone-300 cursor-not-allowed'
                                            }`}
                                    >
                                        Editar precio
                                    </button>
                                    <button
                                        onClick={() => handleDelete(art.id)}
                                        disabled={art.estatus?.toLowerCase() !== 'disponible'}
                                        className={`font-bold ${art.estatus?.toLowerCase() === 'disponible'
                                            ? 'text-red-400 hover:text-red-600 cursor-pointer'
                                            : 'text-stone-300 cursor-not-allowed'
                                            }`}
                                    >
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {historyModal !== null && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-serif font-bold text-slate-900">Historial de Precios</h3>
                                    <p className="text-sm text-stone-500">{historyModal.art.nombre}</p>
                                </div>
                                <button
                                    onClick={() => setHistoryModal(null)}
                                    className="text-stone-400 hover:text-stone-600 text-2xl leading-none"
                                >
                                    &times;
                                </button>
                            </div>

                            {historyModal.loading && (
                                <p className="text-center text-stone-500 py-8">Cargando historial desde Cassandra...</p>
                            )}

                            {historyModal.error && (
                                <p className="text-center text-red-500 py-8">{historyModal.error}</p>
                            )}

                            {!historyModal.loading && !historyModal.error && historyModal.entries.length === 0 && (
                                <div className="text-center py-8">
                                    <p className="text-stone-500">Esta obra no tiene cambios de precio registrados.</p>
                                    <p className="text-stone-400 text-sm mt-2">Los cambios quedan registrados automáticamente en Cassandra al editar el precio.</p>
                                </div>
                            )}

                            {!historyModal.loading && !historyModal.error && historyModal.entries.length > 0 && (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-stone-200 text-stone-400 text-[10px] uppercase tracking-widest">
                                            <th className="pb-3">Fecha</th>
                                            <th className="pb-3">Precio Anterior</th>
                                            <th className="pb-3">Precio Nuevo</th>
                                            <th className="pb-3">Motivo</th>
                                            <th className="pb-3">Admin</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100">
                                        {historyModal.entries.map((entry, i) => (
                                            <tr key={entry.idEvento || i} className="text-sm">
                                                <td className="py-3 text-stone-600">
                                                    {new Date(entry.fechaCambio).toLocaleString('es-VE')}
                                                </td>
                                                <td className="py-3 text-stone-500">
                                                    ${entry.precioAnterior.toLocaleString()}
                                                </td>
                                                <td className="py-3 font-bold text-emerald-700">
                                                    ${entry.precioNuevo.toLocaleString()}
                                                </td>
                                                <td className="py-3 text-stone-600">{entry.motivo}</td>
                                                <td className="py-3 text-stone-600">{entry.usuarioAdmin}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {!historyModal.loading && !historyModal.error && historyModal.entries.length > 0 && (
                                <div className="mt-6 pt-4 border-t border-stone-100 text-right">
                                    <a
                                        href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/history/precios/${historyModal.art.id}/csv`}
                                        target="_blank"
                                        className="text-sm text-sky-600 hover:text-sky-800 font-bold"
                                    >
                                        Exportar CSV
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {editingPriceId !== null && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
                            <h3 className="text-xl font-serif font-bold text-slate-900 mb-2">Editar Precio</h3>
                            <p className="text-sm text-stone-500 mb-6">
                                {arts.find(a => a.id === editingPriceId)?.nombre}
                            </p>
                            <label className="block text-xs font-bold text-black uppercase mb-2">Nuevo Precio</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={newPriceValue}
                                onChange={e => setNewPriceValue(e.target.value)}
                                className="w-full p-3 bg-white text-black rounded-xl border border-stone-300 mb-6"
                                autoFocus
                            />
                            <div className="flex gap-4">
                                <button
                                    onClick={() => { setEditingPriceId(null); setNewPriceValue(''); }}
                                    className="flex-1 px-6 py-3 rounded-xl border border-stone-200 font-bold text-stone-600 hover:bg-stone-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmPrice}
                                    className="flex-1 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}