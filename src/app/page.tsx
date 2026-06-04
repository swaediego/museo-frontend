'use client';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getMongoFilter } from '@/lib/api';
import { MongoArtDocument } from '@/types/art';
import Link from 'next/link';
import Image from 'next/image';
import { useSyncOnMount } from '@/hooks/useSyncOnMount';
import { useDebounce } from '@/hooks/useDebounce';
import { useRouter } from 'next/navigation';
import ImportArtModal from '@/components/ImportArtModal';
import BuyerInfoTooltip from '@/components/BuyerInfoTooltip';

// ─────────────────────────────────────────────────────────────────────────────
// Sprint 1 — Catálogo Dinámico con MongoDB
// La consulta principal usa POST /api/catalog/filter (Aggregation Framework).
// Géneros siguen viniendo de PostgreSQL (fuente de verdad transaccional).
// ─────────────────────────────────────────────────────────────────────────────

// Helper: capitalizar primera letra de cada palabra ("la noche estrellada" → "La Noche Estrellada")
function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function badgeColor(estatus: string): string {
  const map: Record<string, string> = {
    'Disponible': 'bg-emerald-500 text-white',
    'Reservada': 'bg-amber-500 text-white',
    'Vendida': 'bg-red-600 text-white',
    'Préstamo': 'bg-blue-500 text-white',
  };
  return map[estatus] || 'bg-stone-400 text-white';
}

export default function CatalogPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch]         = useState('');
  const [searchType, setSearchType] = useState<'nombre' | 'artista'>('nombre');
  const [genre, setGenre]           = useState('');
  const [estatus, setEstatus]       = useState('');
  const [precioMinInput, setPrecioMinInput]   = useState<string>('');
  const [precioMaxInput, setPrecioMaxInput]   = useState<string>('');
  const precioMin = useDebounce(precioMinInput, 400);
  const precioMax = useDebounce(precioMaxInput, 400);
  const [sortBy, setSortBy]         = useState<string>('');
  const [showImportModal, setShowImportModal] = useState(false);

  // 0. Sincronizar tombstones al cargar la página
  useSyncOnMount();

  // 1. Géneros desde PostgreSQL (lista maestra)
  const { data: genres } = useQuery({
    queryKey: ['genres'],
    queryFn: () => api.get('api/genres').json<any[]>()
  });

  // 2. Catálogo desde MongoDB — un único pipeline de Aggregation Framework
  //    procesa género, estatus y precio en una sola operación eficiente.
  const { data: arts, isLoading, isError, error } = useQuery({
    queryKey: ['mongo-catalog', genre, estatus, precioMin, precioMax, sortBy],
    queryFn: () => getMongoFilter({
      genero:   genre   || undefined,
      estatus:  estatus || undefined,
      precioMin: precioMin ? Number(precioMin) : undefined,
      precioMax: precioMax ? Number(precioMax) : undefined,
      sortBy:   sortBy  || undefined,
    }),
    retry: 2,
    staleTime: 30 * 1000,
  });

// 3. Filtro local por nombre u artista (búsqueda de texto)
  const filteredArts = arts?.filter(art => {
    const term = search.toLowerCase();
    if (!term) return true;
    if (searchType === 'nombre') return art.nombre?.toLowerCase().includes(term);
    return art.artista?.nombre?.toLowerCase().includes(term);
  }) ?? [];

  // Admin check for import button
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    const adminUser = JSON.parse(localStorage.getItem('user') || '{}');
    const hasAdminRole = adminUser?.tipo === 'ADMIN' || adminUser?.user?.rol === 'PRINCIPAL' || adminUser?.user?.rol === 'ADMIN' || adminUser?.rol === 'PRINCIPAL' || adminUser?.rol === 'ADMIN';
    setIsAdminUser(!!hasAdminRole);
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <div className="max-w-6xl mx-auto">

        <div className="mb-10 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-serif mb-1 text-slate-900">Nuestra Colección</h1>
            {/* Indicador visual de fuente MongoDB */}
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Catálogo · MongoDB
            </span>
          </div>
          {/* Botón importar solo visible para administradores */}
          {isAdminUser && (
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition"
            >
              <span className="text-lg">+</span> Importar Obra
            </button>
          )}
        </div>

        {/* ── BARRA DE FILTROS ── */}
        <div className="flex flex-wrap items-end gap-6 mb-12 bg-white p-8 rounded-2xl shadow-md border border-stone-300">

          {/* 1. Búsqueda por texto */}
          <div className="flex-1 min-w-[300px]">
            <label className="text-xs font-black uppercase tracking-[0.15em] text-stone-900 mb-2 block ml-1">
              Búsqueda Directa
            </label>
            <div className="flex shadow-sm">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as any)}
                className="bg-stone-100 border-2 border-stone-800 border-r-0 rounded-l-xl px-4 text-stone-900 font-bold text-sm outline-none cursor-pointer hover:bg-stone-200 transition-colors"
              >
                <option value="nombre">OBRA</option>
                <option value="artista">ARTISTA</option>
              </select>
              <input
                type="text"
                placeholder={`Escribe el nombre del ${searchType}...`}
                className="flex-1 border-2 border-stone-800 rounded-r-xl px-5 py-3 outline-none focus:ring-2 focus:ring-black text-stone-900 font-bold placeholder:text-stone-400 text-base"
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* 2. Género (MongoDB: campo string directo, no relación FK) */}
          <div className="flex flex-col min-w-[200px]">
            <label className="text-xs font-black uppercase tracking-[0.15em] text-stone-900 mb-2 block ml-1">
              Categoría / Género
            </label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="border-2 border-stone-800 rounded-xl px-4 py-3 outline-none bg-white text-stone-900 font-black text-sm cursor-pointer hover:bg-stone-50 transition-all appearance-none shadow-sm"
            >
              <option value="">TODOS LOS GÉNEROS</option>
              {genres?.map((g) => (
                <option key={g.id} value={g.nombre} className="font-bold">
                  {g.nombre.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Estatus */}
          <div className="flex flex-col min-w-[180px]">
            <label className="text-xs font-black uppercase tracking-[0.15em] text-stone-900 mb-2 block ml-1">
              Disponibilidad
            </label>
            <select
              value={estatus}
              onChange={(e) => setEstatus(e.target.value)}
              className="border-2 border-stone-800 rounded-xl px-4 py-3 outline-none bg-white text-stone-900 font-black text-sm cursor-pointer hover:bg-stone-50 transition-all appearance-none shadow-sm"
            >
              <option value="">TODOS</option>
              <option value="Disponible">DISPONIBLE</option>
              <option value="Reservada">RESERVADA</option>
              <option value="Vendida">VENDIDA</option>
            </select>
          </div>

          {/* 4. Rango de precio */}
          <div className="flex flex-col min-w-[240px]">
            <label className="text-xs font-black uppercase tracking-[0.15em] text-stone-900 mb-2 block ml-1">
              Rango de Precio ($)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Mín"
                value={precioMinInput}
                onChange={(e) => setPrecioMinInput(e.target.value)}
                className="w-full border-2 border-stone-800 rounded-xl px-3 py-3 outline-none text-stone-900 font-bold text-sm"
              />
              <input
                type="number"
                placeholder="Máx"
                value={precioMaxInput}
                onChange={(e) => setPrecioMaxInput(e.target.value)}
                className="w-full border-2 border-stone-800 rounded-xl px-3 py-3 outline-none text-stone-900 font-bold text-sm"
              />
            </div>
          </div>

          {/* 5. Ordenamiento */}
          <div className="flex flex-col min-w-[180px]">
            <label className="text-xs font-black uppercase tracking-[0.15em] text-stone-900 mb-2 block ml-1">
              Ordenar Por
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border-2 border-stone-800 rounded-xl px-4 py-3 outline-none bg-white text-stone-900 font-black text-sm cursor-pointer hover:bg-stone-50 transition-all appearance-none shadow-sm"
            >
              <option value="">Por defecto</option>
              <option value="precioAsc">Precio: Menor a Mayor</option>
              <option value="precioDesc">Precio: Mayor a Menor</option>
            </select>
          </div>

          {/* Botón limpiar */}
          <button
            onClick={() => { setGenre(''); setEstatus(''); setPrecioMinInput(''); setPrecioMaxInput(''); setSearch(''); setSortBy(''); }}
            className="px-5 py-3 rounded-xl font-black text-xs uppercase tracking-tighter border-2 border-stone-300 text-stone-500 hover:border-stone-800 hover:text-stone-900 transition-all"
          >
            Limpiar filtros
          </button>
        </div>

        {/* ── GRILLA DE RESULTADOS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredArts?.map(art => (
            <MongoArtCard key={art.id} art={art} badgeColor={badgeColor} router={router} />
          ))}
        </div>

        {filteredArts?.length === 0 && (
          <p className="text-center text-stone-400 py-20">No se encontraron obras con esos criterios.</p>
        )}
      </div>

      <ImportArtModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ['mongo-catalog'] })}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tarjeta de obra MongoDB
// Navega a /art/[idRelacional] → el detalle carga datos de PostgreSQL para
// la lógica de compra/reserva, pero puede enriquecerse con detallesEspecificos
// ─────────────────────────────────────────────────────────────────────────────
function MongoArtCard({
  art,
  badgeColor,
  router,
}: {
  art: MongoArtDocument;
  badgeColor: (s: string) => string;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div
      onClick={() => router.push(`/art/${art.idRelacional}`)}
      className="group bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
    >
      {/* Imagen */}
      <div className="relative h-56 bg-stone-100 overflow-hidden">
        <Image
          src={art.imagenUrl || 'https://via.placeholder.com/400x300?text=undefined'}
          alt={toTitleCase(art.nombre) || 'undefined'}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <span className={`absolute top-3 right-3 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest rounded-full ${badgeColor(art.estatus)}`}>
          <BuyerInfoTooltip artIdRelacional={art.idRelacional} estatus={art.estatus} />
        </span>
        <span className="absolute top-3 left-3 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded-full bg-black/60 text-white">
          MongoDB
        </span>
      </div>

      {/* Información */}
      <div className="p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">
          {art.genero}
        </p>
        <h2 className="text-lg font-serif font-semibold text-slate-900 leading-tight mb-1 line-clamp-1">
          {toTitleCase(art.nombre)}
        </h2>
        <div className="text-sm text-stone-500 mb-3 font-light">
          por{' '}
          <Link
            href={`/artista/${art.artista?.idArtistaRelacional}`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-stone-700 hover:text-stone-900 underline underline-offset-4 decoration-stone-400 decoration-1"
          >
            {toTitleCase(art.artista?.nombre)}
          </Link>
          {art.artista?.nacionalidad && (
            <span className="text-stone-400"> · {art.artista.nacionalidad}</span>
          )}
        </div>

        {/* Polimorfismo: muestra hasta 2 detallesEspecificos como pills */}
        {art.detallesEspecificos && Object.keys(art.detallesEspecificos).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {Object.entries(art.detallesEspecificos).slice(0, 2).map(([k, v]) =>
              typeof v !== 'object' ? (
                <span key={k} className="text-[9px] font-bold uppercase tracking-wider bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
                  {k}: {String(v)}
                </span>
              ) : null
            )}
          </div>
        )}

        <p className="text-xl font-black text-slate-900">${(art.precio ?? 0).toLocaleString()}</p>
      </div>
    </div>
  );
}