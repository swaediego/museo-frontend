'use client';

import { useState } from 'react';
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

  const handleMouseEnter = async () => {
    setShow(true);
    // Solo cargar una vez
    if (loading || buyer !== null || estatus === 'Disponible') return;

    setLoading(true);
    setError(null);
    try {
      console.log(`[BuyerTooltip] Fetching api/arts/${artIdRelacional}`);
      const art = await api.get(`api/arts/${artIdRelacional}`).json<any>();
      console.log(`[BuyerTooltip] Response:`, art);
      console.log(`[BuyerTooltip] compradorReserva:`, art?.compradorReserva);
      setBuyer(art?.compradorReserva || null);
    } catch (err: any) {
      console.error(`[BuyerTooltip] Error:`, err);
      setError(err.message);
      setBuyer(null);
    } finally {
      setLoading(false);
    }
  };

  if (estatus === 'Disponible') {
    return <span>{estatus}</span>;
  }

  return (
    <span
      className="relative inline-block cursor-help"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
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