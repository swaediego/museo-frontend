export const mostrarAnio = (fecha: number | string): string => {

    const anio = typeof fecha === 'string' ? parseInt(fecha) : fecha;

    if (isNaN(anio)) return "Fecha desconocida";

    if (anio < 0) return `${Math.abs(anio)} A.C.`;
    return `${anio} D.C.`;
};

/**
 * MODIFICADO por Diego Torrelles ( bd2-proyecto ) — normaliza cualquier valor de
 * `datosTarjetaMask` al formato canonico `XXXX-XXXX-XXXX-{ultimos4}`.
 * Acepta entradas como:
 *   - "" / null / undefined       -> ""
 *   - "3456"                      -> "XXXX-XXXX-XXXX-3456"
 *   - "4540-XXXX-XXXX-1234"       -> "XXXX-XXXX-XXXX-1234" (los digitos visibles se preservan)
 *   - "tarjeta 4111 xxx 1111"     -> "XXXX-XXXX-XXXX-4111" (toma los ultimos 4 digitos)
 *
 * Esto resuelve el caso donde la DB tiene valores "crudos" guardados antes
 * de que se implementara el autocompletado.
 */
export const formatCardMask = (raw: string | null | undefined): string => {
    if (!raw) return '';
    const digits = String(raw).replace(/\D/g, '');
    if (!digits) return '';
    const last4 = digits.slice(-4);
    return `XXXX-XXXX-XXXX-${last4}`;
};