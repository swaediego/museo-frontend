'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Buyer } from '@/types/art';

export default function AdminBuyersPage() {
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [loading, setLoading] = useState(true);
    const [soloActivos, setSoloActivos] = useState(true);

    const fetchBuyers = async () => {
        try {
            // Asegúrate de que el endpoint GET coincida con tu @GetMapping
            const data = await api.get(`api/buyers?soloActivos=${soloActivos}`).json<Buyer[]>();
            setBuyers(data);
        } catch (err) {
            console.error("Error cargando compradores:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBuyers();
    }, [soloActivos]);

    const handleDeactivation = async (id: number) => {
        if (!confirm("¿Estás seguro de cambiar el estado de este comprador?")) return;

        try {
            await api.patch(`api/buyers/${id}/desactivar`);
            await fetchBuyers();
            alert("Estatus del comprador actualizado.");
        } catch (error) {
            alert("Error al intentar cambiar el estado del comprador.");
            console.log(error)
        }
    };

    if (loading) return <div className="p-32 text-center">Cargando lista...</div>;

    return (
        <div className="min-h-screen bg-stone-50 pt-32 pb-20 px-6">
            <div className="flex items-center gap-4 mb-6">
                <label className="flex items-center gap-2 text-sm text-stone-600">
                    <input
                        type="checkbox"
                        checked={soloActivos}
                        onChange={() => setSoloActivos(!soloActivos)}
                        className="rounded border-stone-300"
                    />
                    Solo mostrar compradores activos
                </label>
            </div>
            <div className="max-w-6xl mx-auto bg-white shadow-sm border border-stone-200 rounded-3xl p-10">
                <h1 className="text-3xl font-serif font-bold text-slate-950 mb-8">Gestión de Compradores</h1>



                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-stone-200 text-stone-400 text-[10px] uppercase tracking-widest">
                            <th className="pb-4">Nombre</th>
                            <th className="pb-4">Email</th>
                            <th className="pb-4">Membresía</th>
                            <th className="pb-4">estado</th>
                            <th className="pb-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                        {buyers.map((buyer) => (
                            <tr key={buyer.id} className="text-sm">
                                <td className="py-4 font-bold text-slate-900">{buyer.nombre} {buyer.apellido}</td>
                                <td className="py-4 text-stone-600">{buyer.email}</td>
                                <td className="py-4">
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${buyer.membresiaPaga ? 'bg-yellow-100 text-yellow-700' : 'bg-stone-100 text-stone-500'}`}>
                                        {buyer.membresiaPaga ? 'PREMIUM' : 'BÁSICA'}
                                    </span>
                                </td>
                                <td>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${buyer.activo ? 'bg-yellow-400 text-black' : 'bg-stone-200 text-stone-600'}`}>
                                        {buyer.activo ? 'ACTIVO' : 'INACTIVO'}
                                    </span>
                                </td>
                                <td className="py-4 text-right">
                                    <button
                                        onClick={() => handleDeactivation(buyer.id)}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${buyer.activo
                                            ? 'border-red-500 text-red-600 hover:bg-red-50'
                                            : 'border-green-500 text-green-600 hover:bg-green-50'
                                            }`}
                                    >
                                        {buyer.activo ? 'Desactivar' : 'Activar'}
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