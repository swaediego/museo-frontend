'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiSearch, AISearchResponse } from '@/lib/api';
import ArtCard from '@/components/ArtCard';
import { Art, Genre } from '@/types/art';

function toArt(rec: AISearchResponse['resultados'][0]): Art {
    const artBase = {
        id: rec.idRelacional,
        nombre: rec.nombre,
        precioBase: rec.precio,
        fechaCreacion: 0,
        estatus: rec.estatus as Art['estatus'],
        imagenUrl: rec.imagenUrl,
        artista: {
            id: 0,
            nombre: rec.artista,
            biografia: '',
            nacionalidad: '',
            fechaNacimiento: '',
            fotoUrl: '',
            porcentajeGanancia: 0,
            generos: [] as Genre[],
        },
        genero: {
            id: 0,
            nombre: rec.genero,
        },
    };
    // Casting directo funciona porque ArtCard solo lee campos de BaseArt
    return artBase as Art;
}

export default function AISearchBar() {
    const [query, setQuery] = useState('');
    const [lastResponse, setLastResponse] = useState<AISearchResponse | null>(null);

    const mutation = useMutation<AISearchResponse, Error, string>({
        mutationFn: (q: string) => aiSearch(q),
        onSuccess: (data) => {
            setLastResponse(data);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        mutation.mutate(query.trim());
    };

    const isLoading = mutation.isPending;

    return (
        <div className="w-full max-w-6xl mx-auto px-6 py-12">
            {/* Encabezado del módulo */}
            <div className="mb-10">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-600 mb-2">
                    Graph AI — Experimental
                </p>
                <h2 className="text-3xl font-serif font-bold text-slate-950 mb-3">
                    Búsqueda Inteligente
                </h2>
                <p className="text-sm text-stone-500 max-w-xl">
                    Preguntá al grafo en lenguaje natural. La IA traduce tu pregunta a Cypher
                    y consulta la red de obras, artistas y géneros en tiempo real.
                </p>
            </div>

            {/* Barra de búsqueda */}
            <form onSubmit={handleSubmit} className="mb-10">
                <div className="flex gap-3 max-w-2xl">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder='Ej: "¿Qué esculturas hay disponibles?"'
                        disabled={isLoading}
                        className="flex-1 px-5 py-4 rounded-xl border border-stone-300 text-slate-950
                                   placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600
                                   focus:border-transparent transition-all disabled:bg-stone-100 disabled:cursor-not-allowed"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !query.trim()}
                        className="px-8 py-4 bg-slate-900 text-white font-bold uppercase tracking-widest
                                   text-sm rounded-xl hover:bg-amber-600 disabled:bg-stone-300
                                   disabled:cursor-not-allowed transition-all"
                    >
                        {isLoading ? 'Buscando...' : 'Buscar'}
                    </button>
                </div>
                {mutation.isError && (
                    <p className="mt-2 text-sm text-red-500">
                        Error: {(mutation.error as Error)?.message || 'No se pudo completar la búsqueda.'}
                    </p>
                )}
            </form>

            {/* Sugerencias de preguntas */}
            {!lastResponse && !isLoading && (
                <div className="mb-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-4">
                        Preguntá al grafo
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {[
                            '¿Qué obras de pintura hay disponibles?',
                            '¿Cuántas obras hay en el catálogo?',
                            '¿Qué artistas trabajan en Sculptura?',
                            '¿Qué género tiene más obras?',
                            '¿Obras de Van Gogh?',
                        ].map((suggestion) => (
                            <button
                                key={suggestion}
                                onClick={() => {
                                    setQuery(suggestion);
                                    mutation.mutate(suggestion);
                                }}
                                className="px-4 py-2 bg-stone-100 text-stone-600 text-sm rounded-full
                                           hover:bg-amber-100 hover:text-amber-700 border border-stone-200
                                           transition-all"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Resultado: Cypher generado (debug visual) */}
            {lastResponse && !isLoading && (
                <div className="mb-6 p-4 bg-slate-900 rounded-xl">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-2">
                        Cypher generado por IA
                    </p>
                    <p className="text-xs text-stone-300 font-mono leading-relaxed">
                        {lastResponse.pregunta}
                    </p>
                </div>
            )}

            {/* Resultados de la búsqueda */}
            {lastResponse && !isLoading && (
                <>
                    {lastResponse.resultados.length === 0 ? (
                        <div className="text-center py-16 bg-stone-50 rounded-2xl border border-stone-200">
                            <p className="text-stone-500 italic">
                                No se encontraron resultados para tu búsqueda.
                            </p>
                            <p className="text-xs text-stone-400 mt-1">
                                Probá con otra pregunta o verificá que el grafo tenga datos cargados.
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className="text-xs text-stone-400 mb-6 uppercase tracking-wider">
                                {lastResponse.resultados.length} resultado{lastResponse.resultados.length !== 1 ? 's' : ''}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {lastResponse.resultados.map((rec) => (
                                    <ArtCard key={rec.idRelacional} art={toArt(rec)} />
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
