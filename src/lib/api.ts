import ky from 'ky';
import { Art, Invoice, MongoArtDocument, MongoFilterParams } from '@/types/art';

export const api = ky.create({

    prefixUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
    // Tiempo máximo de espera para la respuesta en ms
    timeout: 10000,

    // Configuraciones comunes
    headers: {
        'Content-Type': 'application/json',
    },

    // Manejo de errores automático
    hooks: {
        beforeRequest: [
            request => {
                // Útil para debug
                console.log(`Enviando petición a: ${request.url}`);
            }
        ],
        afterResponse: [
            async (_request, _options, response) => {
                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('Error de la API:', errorData);
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
}

export interface ImportArtRequest {
    objectId: number;
    busqueda: string;
    tituloEspanol?: string;
}

export interface ImportArtResponse {
    success: boolean;
    message: string;
    obraId?: number;
    idRelacional?: number;
    nombre?: string;
    tipo?: string;
    imagenUrl?: string;
}

export const buscarObrasEnMet = (busqueda: string): Promise<MetSearchResult[]> =>
    api.post('api/arts/import/buscar', { json: { busqueda } }).json<MetSearchResult[]>();

export const importarObraDesdeMet = (request: ImportArtRequest): Promise<ImportArtResponse> =>
    api.post('api/arts/import', { json: request }).json<ImportArtResponse>();

/** Migrar todas las obras de PostgreSQL a MongoDB */
export const migrateAllToMongo = (): Promise<{ message: string }> =>
    api.post('api/migration/migrate-all').json<{ message: string }>();