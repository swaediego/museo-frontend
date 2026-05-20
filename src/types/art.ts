export interface Artist {
    id: number;
    nombre: string;
    biografia: string;
    nacionalidad: string;
    fechaNacimiento: string;
    fotoUrl: string;
    porcentajeGanancia: number;
    generos: Genre[];
}

export interface Genre {
    id: number;
    nombre: string;
}


// ─────────────────────────────────────────────────────────────────────────────
// TIPOS MONGODB — Sprint 1: Catálogo Dinámico
// Estos tipos reflejan el documento BSON de la colección `art_catalog`
// ─────────────────────────────────────────────────────────────────────────────

/** Artista embebido dentro del documento MongoDB (sin relaciones externas) */
export interface MongoEmbeddedArtist {
    idArtistaRelacional: number;
    nombre: string;
    nacionalidad: string;
    biografia: string;
}

/**
 * Documento MongoDB de la colección `art_catalog`.
 * Cada obra tiene un campo `detallesEspecificos` polimórfico:
 *   - Pintura:    { tecnica, estilo }
 *   - Escultura:  { material, peso, dimensiones: {largo, ancho, profundidad} }
 *   - Fotografía: { tipoImpresion, papel, edicion }
 *   - Cerámica:   { tipoArcilla, temperaturaCoccion }
 *   - Orfebrería: { metalBase, purezaMetal, peso }
 */
export interface MongoArtDocument {
    /** _id de MongoDB (ObjectId como string) */
    id: string;
    /** Vínculo con la tabla `art` de PostgreSQL — usar para comprar/facturar */
    idRelacional: number;
    nombre: string;
    precio: number;
    estatus: 'Disponible' | 'Reservada' | 'Vendida';
    genero: string;
    imagenUrl: string;
    fechaCreacion: number;
    artista: MongoEmbeddedArtist;
    /** Campos variables según el género de la obra */
    detallesEspecificos: Record<string, unknown>;
}

/** Parámetros para el endpoint POST /api/catalog/filter (Aggregation Framework) */
export interface MongoFilterParams {
    precioMin?: number;
    precioMax?: number;
    genero?: string;
    estatus?: string;
    sortBy?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS POSTGRESQL — Core Transaccional
// ─────────────────────────────────────────────────────────────────────────────

// Base (Campos comunes que toda Obra tiene)
// En @/types/art.ts

export type Art = Painting | Sculpture | Orphebrery | Photography | Ceramic;

export interface BaseArt {
    id: number;
    nombre: string;
    precioBase: number;
    fechaCreacion: number;
    estatus: 'Disponible' | 'Reservada' | 'Vendida';
    imagenUrl: string;
    artista: Artist;
    genero: { id: number; nombre: string };
    compradorReserva?: Buyer;
}

export interface Painting extends BaseArt { tecnica: string; estilo: string; }
export interface Sculpture extends BaseArt { material: string; peso: number; largo: number; ancho: number; profundidad: number; }
export interface Orphebrery extends BaseArt { purezaMetal: string; metalBase: string; peso: number; }
export interface Photography extends BaseArt { tipoImpresion: string; papel: string; edicion: string; }
export interface Ceramic extends BaseArt { tipoArcilla: string; temperaturaCoccion: number; }

//para el paylaod de creacion de obra
export type CreateArtDTO = Omit<Art, 'id'>;

export interface User {
    id: number;
    login: string;
    nombre: string;
    apellido: string;
    email: string;
    password: string;
    telefono: string;
    fechaRegistro: string;
    activo: boolean;
    cargo?: string;
    rol?: 'PRINCIPAL' | 'SECUNDARIO';
}

export interface Buyer extends User {
    datosTarjetaMask: string;
    membresiaPaga: boolean;
    direccionEnvio: string;
    codigoSeguridad?: string;
}

export interface AuthResponse {
    user: User;
    tipo: 'ADMIN' | 'BUYER';
}

export interface Invoice {
    id: number;
    fechaVenta: string; // Formato: "2026-03-12T07:52:54.054103"
    total: number;
    obra: Art; // Detalles completos de la obra
    comprador: Buyer; // Detalles completos del comprador
    administrador: User; // Detalles completos del administrador que facturó
    direccionDestino: string;
    iva: number;
    montoGanancia: number;
    porcentajeGanancia: number;
    subtotal: number;
    codigoSeguridad?: string; // Opcional, podría no estar en la lista general
}