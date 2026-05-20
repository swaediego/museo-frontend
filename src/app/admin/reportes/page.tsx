'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function AdministrativeReportsPage() {
    // Rango de fecha por defecto: del inicio de este mes al fin de este mes
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const formatDateInput = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [inicioDate, setInicioDate] = useState(formatDateInput(firstDay));
    const [finDate, setFinDate] = useState(formatDateInput(today));
    const [reportType, setReportType] = useState<'billing' | 'sold' | 'memberships'>('billing');
    
    const [reportData, setReportData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Formatear las fechas en formato LocalDateTime de Java (YYYY-MM-DDT00:00:00)
    const formatLocalDateTime = (dateStr: string, isEnd: boolean) => {
        if (!dateStr) return '';
        return isEnd ? `${dateStr}T23:59:59` : `${dateStr}T00:00:00`;
    };

    const fetchReport = async () => {
        if (!inicioDate || !finDate) {
            alert('Por favor selecciona ambas fechas.');
            return;
        }

        setIsLoading(true);
        setErrorMessage(null);
        setReportData(null);

        const startParam = formatLocalDateTime(inicioDate, false);
        const endParam = formatLocalDateTime(finDate, true);

        try {
            if (reportType === 'billing') {
                const data = await api.get(`api/invoices/report/billing-summary?inicio=${startParam}&fin=${endParam}`).json<any>();
                setReportData(data);
            } else if (reportType === 'sold') {
                const data = await api.get(`api/invoices/report/sold?inicio=${startParam}&fin=${endParam}`).json<any[]>();
                setReportData({ obras: data });
            } else if (reportType === 'memberships') {
                const data = await api.get(`api/memberships/report?inicio=${startParam}&fin=${endParam}`).json<any>();
                setReportData(data);
            }
        } catch (err: any) {
            console.error(err);
            setErrorMessage('No se pudieron obtener los datos para este rango de fechas o no hay registros.');
        } finally {
            setIsLoading(false);
        }
    };

    // Funciones utilitarias para formatear datos en la UI
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const formatDateStr = (dateStr?: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="min-h-screen bg-stone-50 pt-32 pb-20 px-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-stone-200 gap-4">
                    <div>
                        <Link href="/admin/dashboard" className="text-stone-400 hover:text-stone-850 font-bold text-xs uppercase tracking-widest block mb-2 transition-colors">
                            ← Volver al Dashboard
                        </Link>
                        <h1 className="text-4xl font-serif font-bold text-slate-950">Reportes Administrativos</h1>
                        <p className="text-stone-500 mt-1 text-sm">Monitorea y analiza el desempeño financiero de la Galería.</p>
                    </div>

                    {/* Botón Imprimir */}
                    {reportData && (
                        <button
                            onClick={() => window.print()}
                            className="bg-white border-2 border-stone-800 text-slate-950 font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-stone-100 transition-all shadow-sm shrink-0"
                        >
                            Imprimir Reporte
                        </button>
                    )}
                </div>

                {/* Filtros de Reporte */}
                <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm mb-10">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                        {/* Tipo de Reporte */}
                        <div>
                            <label className="block text-xs font-bold text-black uppercase tracking-widest mb-2">Tipo de Informe</label>
                            <select
                                value={reportType}
                                onChange={(e) => setReportType(e.target.value as any)}
                                className="w-full px-4 py-3 rounded-xl border border-stone-250 bg-white text-black font-semibold text-sm cursor-pointer outline-none focus:ring-2 focus:ring-black transition-all"
                            >
                                <option value="billing">Resumen de Facturación y Ventas</option>
                                <option value="sold">Inventario de Obras Vendidas</option>
                                <option value="memberships">Ingresos por Membresías</option>
                            </select>
                        </div>

                        {/* Fecha Inicio */}
                        <div>
                            <label className="block text-xs font-bold text-black uppercase tracking-widest mb-2">Fecha Inicio</label>
                            <input
                                type="date"
                                value={inicioDate}
                                onChange={(e) => setInicioDate(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-stone-250 bg-white text-black font-semibold text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                            />
                        </div>

                        {/* Fecha Fin */}
                        <div>
                            <label className="block text-xs font-bold text-black uppercase tracking-widest mb-2">Fecha Fin</label>
                            <input
                                type="date"
                                value={finDate}
                                onChange={(e) => setFinDate(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-stone-250 bg-white text-black font-semibold text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                            />
                        </div>

                        {/* Botón Generar */}
                        <button
                            onClick={fetchReport}
                            disabled={isLoading}
                            className="bg-slate-900 text-white font-bold text-xs uppercase tracking-widest py-3.5 px-6 rounded-xl hover:bg-slate-800 transition-all shadow-md disabled:bg-stone-300 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Generando...' : 'Generar Reporte'}
                        </button>
                    </div>
                </div>

                {errorMessage && (
                    <div className="p-6 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-2xl font-medium mb-10">
                        {errorMessage}
                    </div>
                )}

                {/* Vista del Reporte */}
                {reportData ? (
                    <div className="space-y-10 animate-in fade-in duration-300">
                        
                        {/* 1. KPIs de Alto Nivel */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            {reportType === 'billing' && (
                                <>
                                    <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">Total Recaudado Ventas</span>
                                        <div className="text-3xl font-bold font-serif text-slate-950">
                                            {formatCurrency(reportData.totalRecaudado || 0)}
                                        </div>
                                        <p className="text-xs text-stone-500 mt-2">Monto total facturado en obras.</p>
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm border-l-4 border-l-amber-600">
                                        <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest block mb-2">Ganancia para el Museo</span>
                                        <div className="text-3xl font-bold font-serif text-amber-700">
                                            {formatCurrency(reportData.totalGananciaMuseo || 0)}
                                        </div>
                                        <p className="text-xs text-stone-500 mt-2">Porcentaje neto retenido por el museo.</p>
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">Ventas Completadas</span>
                                        <div className="text-3xl font-bold font-serif text-slate-950">
                                            {reportData.facturas?.length || 0}
                                        </div>
                                        <p className="text-xs text-stone-500 mt-2">Obras de arte adquiridas por coleccionistas.</p>
                                    </div>
                                </>
                            )}

                            {reportType === 'sold' && (
                                <>
                                    <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">Total Obras Vendidas</span>
                                        <div className="text-3xl font-bold font-serif text-slate-950">
                                            {reportData.obras?.length || 0}
                                        </div>
                                        <p className="text-xs text-stone-500 mt-2">Piezas de arte liquidadas en el periodo.</p>
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">Valor Estimado</span>
                                        <div className="text-3xl font-bold font-serif text-slate-950">
                                            {formatCurrency(reportData.obras?.reduce((acc: number, o: any) => acc + (o.precioBase || 0), 0) || 0)}
                                        </div>
                                        <p className="text-xs text-stone-500 mt-2">Valor acumulado de las obras entregadas.</p>
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm border-l-4 border-l-emerald-650">
                                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block mb-2">Estatus Inventario</span>
                                        <div className="text-lg font-bold font-serif text-emerald-700 mt-1.5 uppercase">
                                            Catálogo Actualizado
                                        </div>
                                        <p className="text-xs text-stone-500 mt-2">Registros auditados exitosamente.</p>
                                    </div>
                                </>
                            )}

                            {reportType === 'memberships' && (
                                <>
                                    <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">Ingresos Membresías</span>
                                        <div className="text-3xl font-bold font-serif text-slate-950">
                                            {formatCurrency(reportData.totalRecaudado || 0)}
                                        </div>
                                        <p className="text-xs text-stone-500 mt-2">Recaudación directa por cuotas ($10.00 c/u).</p>
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm border-l-4 border-l-blue-600">
                                        <span className="text-[10px] font-bold text-blue-800 uppercase tracking-widest block mb-2">Nuevos Miembros Activos</span>
                                        <div className="text-3xl font-bold font-serif text-blue-700">
                                            {reportData.totalMembresias || 0}
                                        </div>
                                        <p className="text-xs text-stone-500 mt-2">Coleccionistas que obtuvieron su código.</p>
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">Valor Promedio</span>
                                        <div className="text-3xl font-bold font-serif text-slate-950">
                                            $10.00 USD
                                        </div>
                                        <p className="text-xs text-stone-500 mt-2">Cuota fija por registro de membresía.</p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* 2. Tabla de Detalles del Reporte */}
                        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-stone-150 flex items-center justify-between">
                                <h2 className="text-xl font-serif font-bold text-slate-950">Detalle de Operaciones</h2>
                                <span className="text-xs font-semibold text-stone-400 uppercase tracking-widest">
                                    {inicioDate} al {finDate}
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                {reportType === 'billing' && (
                                    <table className="w-full text-left border-collapse text-sm">
                                        <thead>
                                            <tr className="bg-stone-50 text-slate-950 font-bold uppercase tracking-wider text-[10px] border-b border-stone-200">
                                                <th className="p-4">Factura ID</th>
                                                <th className="p-4">Fecha Venta</th>
                                                <th className="p-4">Comprador</th>
                                                <th className="p-4">Obra</th>
                                                <th className="p-4 text-right">Total Venta</th>
                                                <th className="p-4 text-right">Ganancia Museo</th>
                                                <th className="p-4 text-right">Ganancia Artista</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportData.facturas?.map((inv: any) => (
                                                <tr key={inv.id} className="border-b border-stone-150 hover:bg-stone-50/50 transition-colors text-stone-800">
                                                    <td className="p-4 font-mono font-bold">#{inv.id}</td>
                                                    <td className="p-4">{formatDateStr(inv.fechaVenta)}</td>
                                                    <td className="p-4">
                                                        <div className="font-semibold">{inv.comprador?.nombre} {inv.comprador?.apellido}</div>
                                                        <div className="text-[10px] text-stone-400">{inv.comprador?.email}</div>
                                                    </td>
                                                    <td className="p-4 font-serif font-medium">{inv.obra?.nombre}</td>
                                                    <td className="p-4 text-right font-bold text-slate-950">{formatCurrency(inv.total)}</td>
                                                    <td className="p-4 text-right text-amber-700 font-semibold">{formatCurrency(inv.montoGanancia)}</td>
                                                    <td className="p-4 text-right text-stone-500">{formatCurrency(inv.total - inv.montoGanancia)}</td>
                                                </tr>
                                            ))}
                                            {(!reportData.facturas || reportData.facturas.length === 0) && (
                                                <tr>
                                                    <td colSpan={7} className="p-8 text-center text-stone-400">No se encontraron facturas en este periodo.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                )}

                                {reportType === 'sold' && (
                                    <table className="w-full text-left border-collapse text-sm">
                                        <thead>
                                            <tr className="bg-stone-50 text-slate-950 font-bold uppercase tracking-wider text-[10px] border-b border-stone-200">
                                                <th className="p-4">Obra ID</th>
                                                <th className="p-4">Obra</th>
                                                <th className="p-4">Artista</th>
                                                <th className="p-4">Género</th>
                                                <th className="p-4">Estatus Actual</th>
                                                <th className="p-4 text-right">Precio Base</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportData.obras?.map((art: any) => (
                                                <tr key={art.id} className="border-b border-stone-150 hover:bg-stone-50/50 transition-colors text-stone-800">
                                                    <td className="p-4 font-mono font-bold">#{art.id}</td>
                                                    <td className="p-4 font-serif font-medium">{art.nombre}</td>
                                                    <td className="p-4">{art.artista?.nombre}</td>
                                                    <td className="p-4">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
                                                            {art.genero?.nombre}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="text-[9px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                                            {art.estatus}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right font-bold text-slate-950">{formatCurrency(art.precioBase || 0)}</td>
                                                </tr>
                                            ))}
                                            {(!reportData.obras || reportData.obras.length === 0) && (
                                                <tr>
                                                    <td colSpan={6} className="p-8 text-center text-stone-400">No se encontraron obras vendidas en este periodo.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                )}

                                {reportType === 'memberships' && (
                                    <table className="w-full text-left border-collapse text-sm">
                                        <thead>
                                            <tr className="bg-stone-50 text-slate-950 font-bold uppercase tracking-wider text-[10px] border-b border-stone-200">
                                                <th className="p-4">Pago ID</th>
                                                <th className="p-4">Fecha Pago</th>
                                                <th className="p-4">Miembro (Comprador)</th>
                                                <th className="p-4">Método de Pago</th>
                                                <th className="p-4 text-right">Cuota Recaudada</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportData.pagos?.map((pay: any) => (
                                                <tr key={pay.id} className="border-b border-stone-150 hover:bg-stone-50/50 transition-colors text-stone-800">
                                                    <td className="p-4 font-mono font-bold">#{pay.id}</td>
                                                    <td className="p-4">{formatDateStr(pay.fechaPago)}</td>
                                                    <td className="p-4">
                                                        <div className="font-semibold">{pay.comprador?.nombre} {pay.comprador?.apellido}</div>
                                                        <div className="text-[10px] text-stone-400">{pay.comprador?.email}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                                                            {pay.metodoPago || 'Tarjeta de Crédito'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right font-bold text-slate-950">{formatCurrency(pay.monto || 10.0)}</td>
                                                </tr>
                                            ))}
                                            {(!reportData.pagos || reportData.pagos.length === 0) && (
                                                <tr>
                                                    <td colSpan={5} className="p-8 text-center text-stone-400">No se registraron pagos de membresías en este periodo.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="text-center py-20 bg-white border border-stone-200 rounded-3xl shadow-sm text-stone-400 italic">
                        Selecciona los criterios y haz clic en "Generar Reporte" para visualizar el informe.
                    </div>
                )}
            </div>
        </div>
    );
}
