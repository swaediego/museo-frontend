'use client';

import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatCardMask } from '@/utils/formatters';

interface BuyerInfoTooltipProps {
  artIdRelacional: number;
  estatus: string;
}

export default function BuyerInfoTooltip({ artIdRelacional, estatus }: BuyerInfoTooltipProps) {
  const [show, setShow] = useState(false);
  const [buyer, setBuyer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const handleMouseEnter = () => {
    // No hace fetch si es Disponible o ya cargado
    if (buyer !== null || estatus === 'Disponible') {
      setShow(true);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setShow(true);
      if (loading) return;
      setLoading(true);
      setError(null);
      try {
        const art = await api.get(`api/arts/${artIdRelacional}`).json<any>();
        setBuyer(art?.compradorReserva || null);
      } catch (err: any) {
        setError(err.message);
        setBuyer(null);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleMouseLeave = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setShow(false);
  };

  if (estatus === 'Disponible') {
    return <span>{estatus}</span>;
  }

  return (
    <span
      className="relative inline-block cursor-help"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {loading ? '⏳' : estatus}
      {show && error && (
        <span className="absolute left-0 top-full mt-1 z-50 bg-red-50 border border-red-300 rounded-xl shadow-xl p-3 text-left text-xs">
          <span className="block font-bold text-red-600">Error: {error}</span>
        </span>
      )}
      {show && !loading && buyer && (
        <span className="absolute left-0 top-full mt-1 z-50 bg-white border border-stone-300 rounded-xl shadow-xl p-3 text-left text-xs whitespace-nowrap min-w-[180px]"
          style={{ pointerEvents: 'none' }}
        >
          <span className="block font-bold text-stone-700 mb-1">👤 {buyer.nombre} {buyer.apellido}</span>
          <span className="block text-stone-500">📧 {buyer.email}</span>
          <span className="block text-stone-500">📱 {buyer.telefono}</span>
          {/* MODIFICADO por Diego Torrelles ( bd2-proyecto ) — normalizar formato */}
          <span className="block text-stone-500">💳 {formatCardMask(buyer.datosTarjetaMask)}</span>
        </span>
      )}
      {show && !loading && !buyer && !error && (
        <span className="absolute left-0 top-full mt-1 z-50 bg-white border border-stone-300 rounded-xl shadow-xl p-3 text-left text-xs">
          <span className="block font-bold text-stone-600">Sin comprador asignado</span>
        </span>
      )}
    </span>
  );
}