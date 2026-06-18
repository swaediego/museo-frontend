'use client';
import { useQuery } from '@tanstack/react-query';
import { getRecommendations } from '@/lib/api';
import ArtCard from '@/components/ArtCard';
import { Art, Genre } from '@/types/art';
import Link from 'next/link';

// Tipo de recommendation que viene del backend Neo4j
interface Recommendation {
    idRelacional: number;
    nombre: string;
    precio: number;
    estatus: string;
    imagenUrl: string;
    genero: string;
    artista: string;
}

// Convierte RecommendationDTO de Neo4j → Art para reuse de ArtCard
function toArt(rec: Recommendation): Art {
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
    return artBase as Art;
}

interface RecommendationSectionProps {
    buyerId: number;
}

export default function RecommendationSection({ buyerId }: RecommendationSectionProps) {
    const { data, isLoading, isError } = useQuery<Recommendation[]>({
        queryKey: ['recommendations', buyerId],
        queryFn: () => getRecommendations(buyerId).then(r => r ?? []),
        enabled: buyerId > 0,
        staleTime: 5 * 60 * 1000, // 5 min — las recomendaciones no cambian tan seguido
    });

    // ── Estado: Cargando ──────────────────────────────────────────
    if (isLoading) {
        return (
            <section className="w-full max-w-6xl mx-auto px-6 py-16">
                <h2 className="text-3xl font-serif font-bold text-slate-950 mb-8">
                    Sugerencias para tu colección
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
                            <div className="aspect-[4/3] bg-gray-200" />
                            <div className="p-5 space-y-3">
                                <div className="h-4 bg-gray-200 rounded w-3/4" />
                                <div className="h-3 bg-gray-200 rounded w-1/2" />
                                <div className="h-6 bg-gray-200 rounded w-1/3 mt-4" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    // ── Estado: Error silencioso (no rompe la UI) ────────────────
    if (isError || !data || data.length === 0) {
        return (
            <section className="w-full max-w-6xl mx-auto px-6 py-16">
                <h2 className="text-3xl font-serif font-bold text-slate-950 mb-6">
                    Sugerencias para tu colección
                </h2>
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-10 text-center">
                    <p className="text-stone-500 italic">
                        Aún no tenemos recomendaciones para ti.
                        Completa una compra para desbloquear sugerencias personalizadas.
                    </p>
                    <Link
                        href="/"
                        className="inline-block mt-4 text-sm font-bold uppercase tracking-widest text-slate-700 hover:text-amber-600 transition-colors"
                    >
                        Explorar el catálogo →
                    </Link>
                </div>
            </section>
        );
    }

    // ── Estado: Con recomendaciones ──────────────────────────────
    return (
        <section className="w-full max-w-6xl mx-auto px-6 py-16">
            {/* Header elegante y minimalista */}
            <div className="flex items-end justify-between mb-8">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-600 mb-2">
                        Basado en tus compras
                    </p>
                    <h2 className="text-3xl font-serif font-bold text-slate-950">
                        Sugerencias para tu colección
                    </h2>
                </div>
                <span className="text-xs text-stone-400 hidden sm:block">
                    {data.length} obra{data.length !== 1 ? 's' : ''} sugerida{data.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Grid de obras recomendadas — reuse de ArtCard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {data.map((rec) => (
                    <ArtCard key={rec.idRelacional} art={toArt(rec)} />
                ))}
            </div>

            {/* CTA */}{' '}
            <div className="mt-8 text-center">
                <Link
                    href="/"
                    className="text-sm font-bold uppercase tracking-widest text-slate-500 hover:text-amber-600 transition-colors"
                >
                    Ver todo el catálogo →
                </Link>
            </div>
        </section>
    );
}
