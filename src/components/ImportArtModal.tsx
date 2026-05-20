'use client';

import { useState } from 'react';
import { buscarObrasEnMet, importarObraDesdeMet, MetSearchResult, ImportArtRequest } from '@/lib/api';

interface ImportArtModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportSuccess: () => void;
}

export default function ImportArtModal({ isOpen, onClose, onImportSuccess }: ImportArtModalProps) {
    const [busqueda, setBusqueda] = useState('');
    const [resultados, setResultados] = useState<MetSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleBuscar = async () => {
        if (!busqueda.trim()) return;
        setLoading(true);
        setError(null);
        setSuccess(null);
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
        setError(null);
        setSuccess(null);
        try {
            const request: ImportArtRequest = {
                objectId: result.objectId,
                busqueda: busqueda,
                tituloEspanol: result.tituloEspanol || result.titulo
            };
            const response = await importarObraDesdeMet(request);
            if (response.success) {
                setSuccess(`Obra "${response.nombre}" importada exitosamente`);
                setTimeout(() => {
                    onImportSuccess();
                    onClose();
                    setBusqueda('');
                    setResultados([]);
                    setSuccess(null);
                }, 1500);
            } else {
                setError(response.message);
            }
        } catch (e) {
            setError('Error al importar la obra');
        } finally {
            setImporting(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-stone-200 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-stone-900">Importar obra desde MET Museum</h2>
                    <button onClick={onClose} className="text-stone-500 hover:text-stone-800 text-2xl">&times;</button>
                </div>

                <div className="p-6 border-b border-stone-200">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                            placeholder="Ej: La noche estrellada, Mona Lisa..."
                            className="flex-1 border-2 border-stone-300 rounded-xl px-4 py-3 text-stone-900 font-medium focus:border-blue-500 focus:outline-none"
                        />
                        <button
                            onClick={handleBuscar}
                            disabled={loading || !busqueda.trim()}
                            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            {loading ? 'Buscando...' : 'Buscar'}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-xl">{error}</div>
                    )}
                    {success && (
                        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-xl">{success}</div>
                    )}

                    {resultados.length === 0 && !loading && !error && (
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
                                        disabled={importing !== null}
                                        className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50 transition"
                                    >
                                        {importing === result.objectId ? 'Importando...' : '📥 Importar'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}