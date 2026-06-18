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

interface BitacoraEliminacion {
    idEntidad: number;
    timestampEvento: string;
    detalleJson: string;
    usuarioOrigen: string;
    severidad: string;
}

function parseDetalle(detalleJson: string): { nombreObra?: string } {
    try {
        return JSON.parse(detalleJson);
    } catch {
        return {};
    }
}

export default function HistorialPage() {
    const hoy = new Date();
    const hace30dias = new Date(hoy);
    hace30dias.setDate(hace30dias.getDate() - 30);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const { data: ventas, isLoading: loadingVentas, error: errorVentas } = useQuery({
        queryKey: ['ventas-por-obra'],
        queryFn: () => api.get('api/history/gerencial/ventas-por-obra').json<VentaPorObra[]>(),
    });

    const { data: eliminaciones, isLoading: loadingEliminaciones, error: errorEliminaciones } = useQuery({
        queryKey: ['eliminaciones', formatDate(hace30dias), formatDate(hoy)],
        queryFn: () => {
            const desde = formatDate(hace30dias);
            const hasta = formatDate(hoy);
            return api.get(`api/history/bitacora/OBRA_ELIMINADA?desde=${desde}&hasta=${hasta}`).json<BitacoraEliminacion[]>();
        },
    });

    const agrupadas = ventas?.reduce<Record<number, VentaPorObra[]>>((acc, v) => {
        (acc[v.idRelacional] ??= []).push(v);
        return acc;
    }, {});

    const loading = loadingVentas || loadingEliminaciones;
    const hasError = errorVentas || errorEliminaciones;

    if (loading) return <div className="p-8 bg-stone-50 min-h-screen text-center">Cargando historial...</div>;
    if (hasError) return <div className="p-8 bg-stone-50 min-h-screen text-center text-red-600">Error al cargar el historial.</div>;

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
                                            <p>Subtotal: <span className="text-stone-300">${totalMonto.toLocaleString('de-DE')}</span></p>
                                            <p className="text-stone-300">IVA: ${totalImpuesto.toLocaleString('de-DE')}</p>
                                            <p>Total: <span className="font-bold text-emerald-300">${(totalMonto + totalImpuesto).toLocaleString('de-DE')}</span></p>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full">
                                            <thead className="bg-stone-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Factura</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Fecha</th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Subtotal</th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">IVA</th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Total</th>
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
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-emerald-700 font-bold">${(v.monto + v.impuesto).toLocaleString('de-DE')}</td>
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

                {/* === SECCIÓN: OBRAS ELIMINADAS === */}
                <div className="mt-12">
                    <h2 className="text-2xl font-bold mb-2 text-slate-800">Obras Eliminadas</h2>
                    <p className="text-stone-500 mb-6">Registro de obras removidas del catálogo (últimos 30 días).</p>

                    {eliminaciones && eliminaciones.length > 0 ? (
                        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-red-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">ID Obra</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Nombre</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Fecha de eliminación</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Usuario</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Severidad</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-200">
                                        {eliminaciones.map((e, i) => {
                                            const detalle = parseDetalle(e.detalleJson);
                                            return (
                                                <tr key={i} className="hover:bg-red-50/50">
                                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">#{e.idEntidad}</td>
                                                    <td className="px-6 py-4 text-red-700 font-medium">{detalle.nombreObra ?? 'Desconocido'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-stone-600">
                                                        {new Date(e.timestampEvento).toLocaleString('es-VE', {
                                                            year: 'numeric', month: 'short', day: 'numeric',
                                                            hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-stone-600">{e.usuarioOrigen ?? 'system'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                            {e.severidad}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <p className="text-stone-500 bg-white p-6 rounded-xl border shadow-sm">No hay obras eliminadas en los últimos 30 días.</p>
                    )}
                </div>

                <div className="mt-8">
                    <Link href="/admin/dashboard" className="text-blue-600 hover:underline">&larr; Volver al panel</Link>
                </div>
            </div>
        </div>
    );
}
