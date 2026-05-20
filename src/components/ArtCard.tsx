import Image from 'next/image';
import { Art } from '@/types/art';
import Link from 'next/link';

export default function ArtCard({ art }: { art: Art }) {
    // 1. Protección: Si por alguna razón no llega la obra, no renderizamos nada
    if (!art) return null;

    // 2. Formateo de precio seguro (usando precioBase que viene de tu JSON)
    const precioFormateado = (art.precioBase ?? 0).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
    });

    return (
        <div className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col h-full">

            {/* SECCIÓN DE IMAGEN */}
            <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                <Image
                    src={art.imagenUrl || 'https://via.placeholder.com/400x300?text=undefined'}
                    alt={art.nombre || 'Obra de arte'}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/* Etiqueta de Género flotante */}
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-gray-700 z-10 uppercase tracking-wider shadow-sm">
                    {art.genero?.nombre || 'Género'}
                </div>
            </div>

            {/* SECCIÓN DE CONTENIDO */}
            <div className="p-5 flex flex-col flex-grow">
                <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1">
                    {art.nombre || 'Sin título'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                    por <Link
                        href={`/artista/${art.artista.id}`}
                        className="font-medium text-blue-600 hover:underline hover:text-blue-800 transition-colors"
                    >
                        {art.artista?.nombre || 'Autor Desconocido'}
                    </Link>
                </p>

                {/* EMPUJAR EL CONTENIDO HACIA ABAJO */}
                <div className="mt-auto pt-4 border-t border-gray-50">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Precio Base</p>
                            <p className="text-xl font-black text-gray-900">{precioFormateado}</p>
                        </div>

                        {/* Badge de Estatus */}
                        <span className={`text-[10px] uppercase px-2 py-1 rounded-md font-bold ${art.estatus === 'Disponible'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                            }`}>
                            {art.estatus || 'N/A'}
                        </span>
                    </div>

                    <div className='flex-gap-3'>

                        <Link href={`/art/${art.id}`}>
                            <button className="w-full py-3 rounded-xl border-2 border-slate-900 text-slate-900 font-bold hover:bg-slate-900 hover:text-white transition-all active:scale-95 text-sm uppercase tracking-wider">
                                Ver Obra
                            </button>
                        </Link>
                    </div>

                </div>
            </div>
        </div>
    );
}