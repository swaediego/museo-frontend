'use client';

import { useState } from 'react';
import { buscarObrasEnMet, importarObraDesdeMet, MetSearchResult, ImportArtRequest, ImportArtResponse } from '@/lib/api';

interface ImportArtModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportSuccess: () => void;
}

// Labels legibles para las claves de detallesExtraidos
const DETAIL_LABELS: Record<string, string> = {
    tecnica: '🎨 Técnica',
    estilo: '🖌️ Estilo',
    material: '🪨 Material',
    peso: '⚖️ Peso (kg)',
    largo: '📏 Largo (cm)',
    ancho: '📐 Ancho (cm)',
    profundidad: '📦 Profundidad (cm)',
    purezaMetal: '💎 Pureza del Metal',
    metalBase: '🔩 Metal Base',
    tipoImpresion: '🖨️ Tipo de Impresión',
    papel: '📄 Papel',
    edicion: '🔢 Edición',
    tipoArcilla: '🏺 Tipo de Arcilla',
    temperaturaCoccion: '🔥 Temperatura de Cocción (°C)',
    fechaCreacion: '📅 Fecha de Creación',
};

export default function ImportArtModal({ isOpen, onClose, onImportSuccess }: ImportArtModalProps) {
    const [busqueda, setBusqueda] = useState('');
    const [resultados, setResultados] = useState<MetSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState<number | null>(null);
    const [processingAI, setProcessingAI] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [importResult, setImportResult] = useState<ImportArtResponse | null>(null);

    if (!isOpen) return null;

    const isBusy = loading || importing !== null || processingAI;

    const handleClose = () => {
        if (isBusy) return; // Prevent closing while processing
        onClose();
        // Reset state
        setBusqueda('');
        setResultados([]);
        setError(null);
        setImportResult(null);
    };

    const handleBuscar = async () => {
        if (!busqueda.trim()) return;
        setLoading(true);
        setError(null);
        setImportResult(null);
        setResultados([]);
        try {
            const results = await buscarObrasEnMet(busqueda);
            setResultados(results);
        } catch (e) {
            setError('Error al buscar en MET Museum');
        } finally {
            setLoading(false);
        }
    };

    const handleImportar = async (result: MetSearchResult) => {
        setImporting(result.objectId);
        setProcessingAI(true);
        setError(null);
        setImportResult(null);
        try {
            const request: ImportArtRequest = {
                objectId: result.objectId,
                busqueda: busqueda,
                tituloEspanol: result.tituloEspanol || result.titulo
            };
            const response = await importarObraDesdeMet(request);
            if (response.success) {
                setImportResult(response);
            } else {
                setError(response.message);
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Error desconocido al importar la obra';
            setError(msg);
        } finally {
            setImporting(null);
            setProcessingAI(false);
        }
    };

    const handleAcceptAndClose = () => {
        onImportSuccess();
        handleClose();
    };

    // ── Render: AI Success Confirmation Card ──
    if (importResult && importResult.success) {
        return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl"
                     style={{ animation: 'fadeInScale 0.35s ease-out' }}>
                    {/* Header */}
                    <div className="p-6 border-b border-stone-200 flex justify-between items-center"
                         style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}>
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">✅</span>
                            <div>
                                <h2 className="text-xl font-bold text-white">¡Importación Exitosa!</h2>
                                <p className="text-emerald-100 text-sm">Análisis de IA completado</p>
                            </div>
                        </div>
                        <button onClick={handleAcceptAndClose}
                                className="text-white/80 hover:text-white text-2xl transition-colors">
                            &times;
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                        {/* Artwork Summary */}
                        <div className="flex gap-4 items-start">
                            {importResult.imagenUrl && (
                                <img src={importResult.imagenUrl} alt={importResult.nombre}
                                     className="w-20 h-20 rounded-xl object-cover shadow-md flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                                <h3 className="font-bold text-stone-900 text-lg leading-tight truncate">{importResult.nombre}</h3>
                                <p className="text-stone-500 text-sm mt-1">ID: {importResult.obraId}</p>
                            </div>
                        </div>

                        {/* AI Genre Suggestion */}
                        {importResult.clasificacionSugeridaIA && (
                            <div className="rounded-xl p-4"
                                 style={{ background: 'linear-gradient(135deg, #ede9fe 0%, #e0e7ff 100%)' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">🤖</span>
                                    <span className="text-sm font-semibold text-violet-800">Clasificación Sugerida por IA</span>
                                </div>
                                <span className="inline-block px-4 py-1.5 rounded-full text-sm font-bold text-white shadow-sm"
                                      style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)' }}>
                                    {importResult.clasificacionSugeridaIA}
                                </span>
                            </div>
                        )}

                        {/* Extracted Details */}
                        {importResult.detallesExtraidos && Object.keys(importResult.detallesExtraidos).length > 0 && (
                            <div className="rounded-xl p-4 bg-stone-50 border border-stone-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-lg">🔍</span>
                                    <span className="text-sm font-semibold text-stone-700">Atributos Técnicos Extraídos</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(importResult.detallesExtraidos).map(([key, value]) => (
                                        <span key={key}
                                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-stone-200 text-stone-700 shadow-sm">
                                            <span className="text-stone-500">{DETAIL_LABELS[key] || key}:</span>
                                            <span className="font-semibold text-stone-900">{String(value)}</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-stone-200 bg-stone-50">
                        <button onClick={handleAcceptAndClose}
                                className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:shadow-lg active:scale-[0.98]"
                                style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}>
                            Aceptar y Cerrar
                        </button>
                    </div>
                </div>

                <style jsx>{`
                    @keyframes fadeInScale {
                        from { opacity: 0; transform: scale(0.92); }
                        to   { opacity: 1; transform: scale(1); }
                    }
                `}</style>
            </div>
        );
    }

    // ── Render: Search & Import View ──
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-stone-200 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-stone-900">Importar obra desde MET Museum</h2>
                    <button onClick={handleClose} disabled={isBusy}
                            className={`text-2xl transition-colors ${isBusy ? 'text-stone-300 cursor-not-allowed' : 'text-stone-500 hover:text-stone-800'}`}>
                        &times;
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-6 border-b border-stone-200">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                            placeholder="Ej: La noche estrellada, Mona Lisa..."
                            disabled={isBusy}
                            className="flex-1 border-2 border-stone-300 rounded-xl px-4 py-3 text-stone-900 font-medium focus:border-blue-500 focus:outline-none disabled:opacity-50"
                        />
                        <button
                            onClick={handleBuscar}
                            disabled={isBusy || !busqueda.trim()}
                            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            {loading ? 'Buscando...' : 'Buscar'}
                        </button>
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-300 text-red-700 rounded-xl flex items-start gap-3">
                            <span className="text-xl flex-shrink-0">⚠️</span>
                            <div>
                                <p className="font-semibold text-sm">Error en la importación</p>
                                <p className="text-sm mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Processing AI indicator */}
                    {processingAI && (
                        <div className="mb-4 p-5 rounded-xl border border-violet-200 flex items-center gap-4"
                             style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' }}>
                            <div className="relative flex-shrink-0">
                                <div className="w-10 h-10 rounded-full border-4 border-violet-200 border-t-violet-600"
                                     style={{ animation: 'spin 0.8s linear infinite' }} />
                            </div>
                            <div>
                                <p className="font-bold text-violet-900 text-sm">🤖 Analizando con IA (Ollama Llama3)...</p>
                                <p className="text-violet-600 text-xs mt-0.5">Clasificando género y extrayendo atributos técnicos</p>
                            </div>
                        </div>
                    )}

                    {resultados.length === 0 && !loading && !error && !processingAI && (
                        <p className="text-center text-stone-500 py-8">Ingresa el nombre de una obra para buscar en el MET Museum</p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {resultados.map((result) => (
                            <div key={result.objectId} className="border border-stone-200 rounded-xl overflow-hidden bg-white">
                                <img
                                    src={result.imagenUrl}
                                    alt={result.titulo}
                                    className="w-full h-40 object-cover"
                                />
                                <div className="p-4">
                                    <h3 className="font-bold text-stone-900 text-sm mb-1">{result.titulo}</h3>
                                    <p className="text-stone-600 text-xs mb-2">{result.artista}</p>
                                    <p className="text-stone-400 text-xs mb-3">{result.clasificacion}</p>
                                    <button
                                        onClick={() => handleImportar(result)}
                                        disabled={isBusy}
                                        className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50 transition"
                                    >
                                        {importing === result.objectId ? '🤖 Analizando con IA...' : '📥 Importar'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}