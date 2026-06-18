import ky from 'ky';
import { Art, Invoice, MongoArtDocument, MongoFilterParams, Review, ReviewStats } from '@/types/art';

export const api = ky.create({

    prefixUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
    // Tiempo máximo de espera para la respuesta en ms (120s para Ollama IA)
    timeout: 120000,

    // Configuraciones comunes
    headers: {
        'Content-Type': 'application/json',
    },

    // Manejo de errores automático
    hooks: {
        beforeRequest: [
            request => {
                const token = localStorage.getItem('token')
                    || (() => {
                        try {
                            const u = localStorage.getItem('user');
                            return u ? JSON.parse(u).token : null;
                        } catch { return null; }
                    })();
                if (token) {
                    request.headers.set('Authorization', `Bearer ${token}`);
                }
            }
        ]
    }
});

export interface UserHistory {
    reservas: Art[];
    facturas: Invoice[];
}

// Historial del usuario: Obras reservadas y Facturas asociadas
export const getUserHistory = (compradorId: number): Promise<UserHistory> => {
    return api.get(`api/invoices/user/${compradorId}`).json();
};

// ─────────────────────────────────────────────────────────────────────────────
// MONGODB CATALOG API — Sprint 1
// Fuente de datos para el catálogo dinámico (lecturas rápidas).
// Las transacciones (compra/factura) siguen usando PostgreSQL vía `api`.
// ─────────────────────────────────────────────────────────────────────────────

/** Todas las obras del catálogo MongoDB */
export const getMongoCatalog = (): Promise<MongoArtDocument[]> =>
    api.get('api/catalog').json<MongoArtDocument[]>();

/** Obra específica por su idRelacional (= id de PostgreSQL) */
export const getMongoArtByRelationalId = (idRelacional: number): Promise<MongoArtDocument> =>
    api.get(`api/catalog/${idRelacional}`).json<MongoArtDocument>();

/**
 * Filtrado avanzado con Aggregation Framework.
 * Un único endpoint en el backend procesa precio, género y estatus
 * en un solo pipeline $match → $project → $sort.
 *
 * Ejemplo: getMongoFilter({ genero: 'Pintura', precioMin: 500 })
 */
export const getMongoFilter = (params: MongoFilterParams): Promise<MongoArtDocument[]> => {
    const qs = new URLSearchParams();
    if (params.precioMin !== undefined) qs.set('precioMin', String(params.precioMin));
    if (params.precioMax !== undefined) qs.set('precioMax', String(params.precioMax));
    if (params.genero)  qs.set('genero',  params.genero);
    if (params.estatus) qs.set('estatus', params.estatus);
    if (params.sortBy)  qs.set('sortBy',  params.sortBy);

    const query = qs.toString();
    return api.post(`api/catalog/filter${query ? `?${query}` : ''}`).json<MongoArtDocument[]>();
};

/** Estadísticas de obras agrupadas por género */
export const getMongoStatsByGenero = (): Promise<MongoArtDocument[]> =>
    api.get('api/catalog/stats/genero').json<MongoArtDocument[]>();

export interface DeletedItem {
    type: 'art' | 'artist';
    id: number;
    timestamp?: number;
}

export interface SyncRequest {
    deletedIds: DeletedItem[];
}

export interface SyncResponse {
    processed: number[];
    notFound: number[];
    message: string;
}

/** Sincronizar elementos eliminados offline */
export const syncDeleted = (items: DeletedItem[]): Promise<SyncResponse> =>
    api.post('api/sync', { json: { deletedIds: items } }).json<SyncResponse>();

export interface MetSearchResult {
    objectId: number;
    titulo: string;
    tituloEspanol?: string;
    artista: string;
    imagenUrl: string;
    clasificacion: string;
    fuente?: string;      // "MET", "Rijksmuseum", "Harvard"
    fuenteId?: string;    // ID de fuente alternativa
}

export interface ImportArtRequest {
    objectId?: number;    // Para MET
    busqueda: string;
    tituloEspanol?: string;
    artista?: string;      // Para filtrar búsqueda
    fuente?: string;       // "MET", "Rijksmuseum", "Harvard"
    fuenteId?: string;     // ID de fuente alternativa
}

export interface ImportArtResponse {
    success: boolean;
    message: string;
    obraId?: number;
    idRelacional?: number;
    nombre?: string;
    tipo?: string;
    imagenUrl?: string;
    clasificacionSugeridaIA?: string;
    detallesExtraidos?: Record<string, unknown>;
}

export interface BuscarObrasResponse {
    success: boolean;
    message?: string;
    resultados: MetSearchResult[];
    sugerencias?: MetSearchResult[];
}

export const buscarObrasEnMet = async (busqueda: string, artista?: string): Promise<BuscarObrasResponse> => {
    try {
        const response = await api.post('api/arts/import/buscar', { 
            json: { busqueda, artista } 
        });
        
        const data = await response.json() as BuscarObrasResponse;
        
        // Si success=false con mensaje, devolvemos error amigable
        if (data.success === false && data.message) {
            return {
                success: false,
                message: data.message,
                resultados: data.sugerencias || [],
                sugerencias: data.sugerencias || []
            };
        }
        
        return {
            success: true,
            resultados: data.resultados || [],
            sugerencias: data.sugerencias || []
        };
    } catch (err: unknown) {
        throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.');
    }
};

export const importarObraDesdeMet = async (request: ImportArtRequest): Promise<ImportArtResponse> => {
    try {
        return await api.post('api/arts/import', { json: request }).json<ImportArtResponse>();
    } catch (err: unknown) {
        // Ky throws HTTPError for non-2xx responses
        if (err && typeof err === 'object' && 'response' in err) {
            const httpErr = err as { response: Response };
            try {
                const body = await httpErr.response.json() as ImportArtResponse;
                throw new Error(body.message || 'Error desconocido al importar la obra');
            } catch (parseErr) {
                if (parseErr instanceof Error && parseErr.message !== 'Error desconocido al importar la obra') {
                    // JSON parse failed, re-check if it's our own throw
                    if ((parseErr as Error).message) throw parseErr;
                }
                throw parseErr;
            }
        }
        throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.');
    }
};

/** Migrar todas las obras de PostgreSQL a MongoDB */
export const migrateAllToMongo = (): Promise<{ message: string }> =>
    api.post('api/migration/migrate-all').json<{ message: string }>();

// ─────────────────────────────────────────────────────────────────────────────
// NEO4J RECOMMENDATIONS API — Sprint 3: Redes de Conocimiento
// Devuelve obras recomendadas basadas en los géneros que el comprador
// ya adquirió (recorrido del grafo en tiempo real).
// ─────────────────────────────────────────────────────────────────────────────

export interface RecommendationDTO {
    idRelacional: number;
    nombre: string;
    precio: number;
    estatus: string;
    imagenUrl: string;
    genero: string;
    artista: string;
}

/** GET /api/recommendations/{buyerId} */
export const getRecommendations = (buyerId: number): Promise<RecommendationDTO[]> =>
    api.get(`api/recommendations/${buyerId}`).json<RecommendationDTO[]>();

/** GET /api/recommendations/{buyerId}/genres */
export const getTopGenres = (buyerId: number): Promise<[string, number][]> =>
    api.get(`api/recommendations/${buyerId}/genres`).json<[string, number][]>();

/** GET /api/recommendations/{buyerId}/artists */
export const getFavoriteArtists = (buyerId: number): Promise<[string, number][]> =>
    api.get(`api/recommendations/${buyerId}/artists`).json<[string, number][]>();

/** GET /api/recommendations/{buyerId}/summary */
export const getRecommendationSummary = (buyerId: number): Promise<{
    recomendaciones: RecommendationDTO[];
    topGeneros: [string, number][];
    artistasFavoritos: [string, number][];
}> =>
    api.get(`api/recommendations/${buyerId}/summary`).json();

// Finalizar compra — Dispara crearFactura (reserva → venta + Neo4j + Cassandra)
export const finalizarCompra = (obraId: number, compradorId: number, securityCode: string): Promise<Invoice> =>
    api.post(`api/invoices/buy/${obraId}/${compradorId}?securityCode=${encodeURIComponent(securityCode)}`).json();

// ─────────────────────────────────────────────────────────────────────────────
// SPRINT 3 — RETO DE INNOVACIÓN: BÚSQUEDA IA POR LENGUAJE NATURAL
// POST /api/recommendations/ai-search { query: string }
// → Ollama traduce a Cypher → Neo4j ejecuta → resultados
// ─────────────────────────────────────────────────────────────────────────────

export interface AISearchResponse {
    pregunta: string;
    resultados: RecommendationDTO[];
}

/** POST /api/recommendations/ai-search */
export const aiSearch = async (query: string): Promise<AISearchResponse> => {
    const response = await api.post('api/recommendations/ai-search', {
        json: { query }
    });
    return response.json() as Promise<AISearchResponse>;
};

// ─────────────────────────────────────────────────────────────────────────────
// SPRINT 4 — RESEÑAS DE OBRAS
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/arts/{id}/reviews — todas las reseñas de una obra */
export const getArtReviews = (id: number): Promise<Review[]> =>
    api.get(`api/arts/${id}/reviews`).json<Review[]>();

/** GET /api/arts/{id}/reviews/stats — promedio + total */
export const getArtReviewStats = (id: number): Promise<ReviewStats> =>
    api.get(`api/arts/${id}/reviews/stats`).json<ReviewStats>();

/** POST /api/arts/{id}/reviews — crear o actualizar reseña */
export const createArtReview = (id: number, rating: number, comentario?: string): Promise<Review> =>
    api.post(`api/arts/${id}/reviews`, {
        json: { rating, comentario: comentario || null }
    }).json<Review>();

/** MODIFICADO por Diego Torrelles ( bd2-proyecto ) — admin borra una reseña por id */
export const deleteArtReviewAdmin = (reviewId: string): Promise<{ message: string }> =>
    api.delete(`api/admin/reviews/${reviewId}`).json<{ message: string }>();

/** MODIFICADO por Diego Torrelles ( bd2-proyecto ) — buyer elimina SU propia reseña */
export const deleteMyArtReview = (artId: number): Promise<{ message: string }> =>
    api.delete(`api/arts/${artId}/reviews`).json<{ message: string }>();

/** MODIFICADO por Diego Torrelles ( bd2-proyecto ) — admin da de baja a un comprador */
export const desactivarBuyer = (buyerId: number): Promise<void> =>
    api.patch(`api/buyers/${buyerId}/desactivar`, { json: {} }).then(() => undefined);