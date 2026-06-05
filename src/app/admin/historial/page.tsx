'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';

interface VentaPorObra {
    idRelacional: number;
    fechaVenta: string;
    idFactura: number;
    monto: number;
    impuesto: number;
    idComprador: number;
}

export default function HistorialPage() {
    const { data: ventas, isLoading, error } = useQuery({
        queryKey: ['ventas-por-obra'],
        queryFn: () => api.get('api/history/gerencial/ventas-por-obra').json<VentaPorObra[]>(),
    });

    const agrupadas = ventas?.reduce<Record<number, VentaPorObra[]>>((acc, v) => {
        (acc[v.idRelacional] ??= []).push(v);
        return acc;
    }, {});

    if (isLoading) return <div className="p-8 bg-stone-50 min-h-screen text-center">Cargando historial...</div>;
    if (error) return <div className="p-8 bg-stone-50 min-h-screen text-center text-red-600">Error al cargar el historial.</div>;

    return (
        <div className="p-8 bg-stone-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-2 text-slate-800">Historial Gerencial</h1>
                <p className="text-stone-500 mb-8">Ventas registradas agrupadas por obra.</p>

                {agrupadas && Object.entries(agrupadas).length > 0 ? (
                    <div className="space-y-8">
                        {Object.entries(agrupadas).map(([idRelacional, ventasObra]) => {
                            const totalMonto = ventasObra.reduce((s, v) => s + v.monto, 0);
                            const totalImpuesto = ventasObra.reduce((s, v) => s + v.impuesto, 0);
                            return (
                                <div key={idRelacional} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                                    <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center">
                                        <h2 className="text-lg font-bold">Obra #{idRelacional}</h2>
                                        <div className="text-right text-sm">
                                            <p>Total: <span className="font-bold text-emerald-300">${totalMonto.toLocaleString('de-DE')}</span></p>
                                            <p className="text-stone-300">IVA: ${totalImpuesto.toLocaleString('de-DE')}</p>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full">
                                            <thead className="bg-stone-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Factura</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Fecha</th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Monto</th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">IVA</th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Comprador</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-200">
                                                {ventasObra.map((v) => (
                                                    <tr key={`${v.idFactura}-${v.fechaVenta}`} className="hover:bg-stone-50">
                                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">#{v.idFactura}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-stone-600">
                                                            {new Date(v.fechaVenta).toLocaleDateString('es-VE', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-slate-800">${v.monto.toLocaleString('de-DE')}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-stone-600">${v.impuesto.toLocaleString('de-DE')}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-stone-600">#{v.idComprador}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-stone-500 bg-white p-6 rounded-xl border shadow-sm">No hay ventas registradas en el historial.</p>
                )}

                <div className="mt-8">
                    <Link href="/admin/dashboard" className="text-blue-600 hover:underline">&larr; Volver al panel</Link>
                </div>
            </div>
        </div>
    );
}
