'use client';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getMongoArtByRelationalId } from '@/lib/api';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Art, Buyer, Ceramic, Orphebrery, Painting, Photography, Sculpture } from '@/types/art';
import { MembershipButton } from '@/components/MembershipButton';
import { ArtDetailField } from '@/components/ArtDetailField';
import { ArtReviewsSection } from '@/components/ArtReviewsSection';
import { mostrarAnio } from '@/utils/formatters';
import { finalizarCompra } from '@/lib/api';


export default function ArtDetailPage() {
    const { id } = useParams();
    const queryClient = useQueryClient();
    const [user, setUser] = useState<Buyer | null>(null);
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [securityCodeInput, setSecurityCodeInput] = useState('');
    // Qué acción se está haciendo en el modal: 'reservar' | 'comprar'
    const [modalAction, setModalAction] = useState<'reservar' | 'comprar'>('reservar');

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                setUser(parsed.user ? parsed.user : parsed);
            } catch (e) { console.error("Error al cargar usuario", e); }
        }
    }, []);

    // ── 1. PostgreSQL: datos transaccionales (compra, reserva, estado de membresía)
    //       El `id` de la URL ES el idRelacional → compatible con ambas bases de datos.
    const { data: art, isLoading, error } = useQuery<Art>({
        queryKey: ['art', id],
        queryFn: () => api.get(`api/arts/${id}`).json<Art>()
    });

    // ── 2. MongoDB: documento BSON con detallesEspecificos polimórficos
    //       Se carga en paralelo. Si MongoDB no está disponible, la página
    //       sigue funcionando con los datos de PostgreSQL como fallback.
    const { data: mongoDoc } = useQuery({
        queryKey: ['mongo-art', id],
        queryFn: () => getMongoArtByRelationalId(Number(id)),
        // No bloquear la UI si MongoDB falla
        retry: 1,
    });

    // ── 3. Mutación: Reservar obra (usa idRelacional = id PostgreSQL)
    const reserveMutation = useMutation({
        mutationFn: (securityCode: string) => {
            const storedUser = localStorage.getItem('user');
            const parsed = storedUser ? JSON.parse(storedUser) : null;
            const buyerId = parsed?.user?.id || parsed?.id;
            if (!buyerId) throw new Error("No se pudo obtener el ID del comprador");
            return api.post(`api/arts/${id}/reservar/${buyerId}?securityCode=${encodeURIComponent(securityCode)}`);
        },
        onSuccess: () => {
            alert(`¡Éxito! La obra ha sido reservada.`);
            queryClient.invalidateQueries({ queryKey: ['art', id] });
            queryClient.invalidateQueries({ queryKey: ['obras-reservadas'] });
            setSecurityCodeInput('');
        },
        onError: async (err: any) => {
            const errorMessage = await err.response?.text().catch(() => 'Error desconocido');
            alert(errorMessage || 'Error al procesar la reserva. Inténtalo de nuevo.');
        }
    });

    // ── 4. Mutación: Cancelar reserva
    const cancelReserveMutation = useMutation({
        mutationFn: () => api.post(`api/arts/${id}/cancelar-reserva`).json<Art>(),
        onSuccess: (updatedArt) => {
            alert(`La reserva de la obra "${updatedArt.nombre}" ha sido cancelada.`);
            queryClient.invalidateQueries({ queryKey: ['art', id] });
            queryClient.invalidateQueries({ queryKey: ['obras-reservadas'] });
        },
        onError: async (err: any) => {
            const errorMessage = await err.response?.text();
            alert(errorMessage || 'Error al cancelar la reserva. Inténtalo de nuevo.');
        }
    });

    // ── 5. Mutación: Finalizar compra (reserva → venta, dispara Neo4j + Cassandra)
    const buyMutation = useMutation({
        mutationFn: (securityCode: string) => {
            if (!user) throw new Error("No hay usuario logueado");
            return finalizarCompra(Number(id), Number(user.id), securityCode);
        },
        onSuccess: (invoice) => {
            alert(`¡Compra confirmada! Factura #${invoice.id} generada.`);
            queryClient.invalidateQueries({ queryKey: ['art', id] });
            queryClient.invalidateQueries({ queryKey: ['obras-reservadas'] });
            queryClient.invalidateQueries({ queryKey: ['recommendations'] });
            setShowSecurityModal(false);
            setSecurityCodeInput('');
        },
        onError: async (err: any) => {
            const errorMessage = await err.response?.text().catch(() => 'Error desconocido');
            alert(errorMessage || 'Error al procesar la compra. Inténtalo de nuevo.');
            setShowSecurityModal(false);
            setSecurityCodeInput('');
        }
    });

    if (isLoading) return (
        <div className="flex items-center justify-center min-h-screen bg-stone-50">
            <p className="p-20 text-center font-serif text-2xl text-stone-400 animate-pulse">
                Cargando obra maestra…
            </p>
        </div>
    );
    if (error || !art) return <div className="p-20 text-center">Obra no encontrada o error de conexión.</div>;

    // ─────────────────────────────────────────────────────────────────────────
    // Render de detalles específicos
    // Prioridad: MongoDB (detallesEspecificos polimórficos) → PostgreSQL (campos tipados)
    // Esto demuestra la integración real de Persistencia Políglota.
    // ─────────────────────────────────────────────────────────────────────────
    const renderSpecificDetails = () => {

        // ── RAMA MONGODB: campos heterogéneos del documento BSON ──
        if (mongoDoc?.detallesEspecificos && Object.keys(mongoDoc.detallesEspecificos).length > 0) {
            const details = mongoDoc.detallesEspecificos;
            return (
                <>
                    {/* Indicador de fuente */}
                    <div className="col-span-2 flex items-center gap-1.5 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600">
                            Detalles desde MongoDB
                        </span>
                    </div>

                    {/* Renderizado dinámico: cada campo de detallesEspecificos se muestra
                        sin necesidad de conocer de antemano el tipo de obra (polimorfismo real) */}
                    {Object.entries(details).map(([key, value]) => {
                        // Dimensiones es un objeto anidado (caso Escultura)
                        if (typeof value === 'object' && value !== null) {
                            const dims = value as Record<string, unknown>;
                            return (
                                <ArtDetailField
                                    key={key}
                                    label={key.charAt(0).toUpperCase() + key.slice(1)}
                                    value={Object.entries(dims)
                                        .map(([k, v]) => `${k}: ${v}`)
                                        .join(' · ')}
                                />
                            );
                        }
                        return (
                            <ArtDetailField
                                key={key}
                                label={key.charAt(0).toUpperCase() + key.slice(1)}
                                value={String(value)}
                            />
                        );
                    })}
                </>
            );
        }

        // ── RAMA POSTGRESQL: fallback tipado (por si MongoDB no está disponible) ──
        const genero = art.genero?.nombre.toLowerCase();
        switch (genero) {
            case 'pintura': {
                const p = art as Painting;
                return (
                    <>
                        <ArtDetailField label="Técnica" value={p.tecnica} />
                        <ArtDetailField label="Estilo" value={p.estilo} />
                    </>
                );
            }
            case 'escultura': {
                const s = art as Sculpture;
                return (
                    <>
                        <ArtDetailField label="Material" value={s.material} />
                        <ArtDetailField label="Peso" value={`${s.peso} kg`} />
                        <ArtDetailField label="Dimensiones" value={`${s.largo}x${s.ancho}x${s.profundidad} cm`} />
                    </>
                );
            }
            case 'orfebreria': {
                const o = art as Orphebrery;
                return (
                    <>
                        <ArtDetailField label="Metal Base" value={o.metalBase} />
                        <ArtDetailField label="Pureza" value={o.purezaMetal} />
                        <ArtDetailField label="Peso" value={`${o.peso} g`} />
                    </>
                );
            }
            case 'fotografia': {
                const ph = art as Photography;
                return (
                    <>
                        <ArtDetailField label="Impresión" value={ph.tipoImpresion} />
                        <ArtDetailField label="Papel" value={ph.papel} />
                        <ArtDetailField label="Edición" value={ph.edicion} />
                    </>
                );
            }
            case 'ceramica': {
                const c = art as Ceramic;
                return (
                    <>
                        <ArtDetailField label="Tipo de Arcilla" value={c.tipoArcilla} />
                        <ArtDetailField label="Temperatura" value={`${c.temperaturaCoccion}°C`} />
                    </>
                );
            }
            default:
                return <p className="text-stone-400">Sin detalles adicionales</p>;
        }
    };

    return (
        <div className="min-h-screen bg-stone-50 pt-32 pb-20 px-6">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">

                {/* Imagen */}
                <div className="bg-white p-4 shadow-2xl rotate-1 border border-stone-200">
                    <Image
                        src={art.imagenUrl || 'https://via.placeholder.com/600?text=undefined'}
                        alt={art.nombre || 'undefined'}
                        width={600}
                        height={400}
                        className="w-full h-auto object-cover"
                    />
                </div>

                {/* Información */}
                <div className="space-y-10">
                    <div className="border-b border-stone-200 pb-8">
                        <div className="flex justify-between items-start gap-4">
                            <h1 className="text-5xl font-serif font-medium text-slate-900 leading-tight">
                                {art.nombre}
                            </h1>
                            <span className={`shrink-0 px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full ${
                                art.estatus === 'Disponible' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                                {art.estatus}
                            </span>
                        </div>
                        <p className="text-2xl font-light text-stone-500 italic font-serif mt-2">
                            por <span className="text-stone-800 not-italic font-medium">{art.artista?.nombre}</span>
                        </p>
                        {/* Indicador de fuente de datos */}
                        <div className="flex items-center gap-3 mt-3">
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                PostgreSQL · Transaccional
                            </span>
                            {mongoDoc && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                    <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block" />
                                    MongoDB · Catálogo
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Especificaciones: campos fijos + detallesEspecificos polimórficos */}
                    <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                        {/* Campos que siempre existen (PostgreSQL) */}
                        <ArtDetailField label="Género" value={art.genero?.nombre} />
                        <ArtDetailField label="Año de Creación" value={mostrarAnio(art.fechaCreacion)} />

                        {/* Precio (MongoDB si disponible, PostgreSQL como fallback) */}
                        <ArtDetailField
                            label="Precio Base"
                            value={`$${(mongoDoc?.precio ?? art.precioBase).toLocaleString()}`}
                        />

                        {/* Artista embebido de MongoDB */}
                        {mongoDoc?.artista?.nacionalidad && (
                            <ArtDetailField label="Nacionalidad" value={mongoDoc.artista.nacionalidad} />
                        )}

                        {/* Campos específicos por género (polimorfismo) */}
                        {renderSpecificDetails()}
                    </div>

                    {/* Botones de acción — toda la lógica usa PostgreSQL (idRelacional) */}
                    <div className="mt-12">
                        {!user ? (
                            <Link
                                href="/login"
                                className="block w-full text-center py-5 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all"
                            >
                                Autenticarse para comprar
                            </Link>
                        ) : 'cargo' in user ? (
                            <div className="w-full py-5 bg-stone-100 text-stone-600 text-center text-xs font-bold uppercase tracking-[0.2em] border border-stone-200">
                                Vista de Administrador
                            </div>
                        ) : !user.activo ? (
                            <div className="w-full py-5 bg-red-100 text-red-800 text-center text-sm font-semibold uppercase tracking-wider border border-red-200 rounded-lg">
                                Tu cuenta está inactiva. Contacta a soporte para reactivarla.
                            </div>
                        ) : !user.membresiaPaga ? (
                            <MembershipButton
                                user={user}
                                onSuccess={(updated) => {
                                    localStorage.setItem('user', JSON.stringify(updated));
                                    setUser(updated);
                                    alert("¡Pago exitoso! Tu membresía ha sido activada y tu código de seguridad generado.");
                                    queryClient.invalidateQueries({ queryKey: ['art', id] });
                                }}
                            />
                        ) : art.estatus === 'Reservada' && art.compradorReserva?.id === user.id ? (
                            <div className="space-y-3">
                                <button
                                    onClick={() => {
                                        setModalAction('comprar');
                                        setSecurityCodeInput('');
                                        setShowSecurityModal(true);
                                    }}
                                    disabled={buyMutation.isPending}
                                    className="w-full py-5 bg-emerald-600 text-white text-xs font-bold uppercase tracking-[0.3em] hover:bg-emerald-700 border-2 border-emerald-600 transition-all duration-300 shadow-xl disabled:bg-emerald-400"
                                >
                                    {buyMutation.isPending ? 'Procesando...' : 'Finalizar Compra'}
                                </button>
                                <button
                                    onClick={() => cancelReserveMutation.mutate()}
                                    disabled={cancelReserveMutation.isPending}
                                    className="w-full py-3 bg-white text-red-600 text-xs font-bold uppercase tracking-widest hover:bg-red-50 border-2 border-red-200 transition-all duration-300 disabled:bg-red-100"
                                >
                                    {cancelReserveMutation.isPending ? 'Cancelando...' : 'Cancelar Reserva'}
                                </button>
                            </div>
                        ) : art.estatus !== 'Disponible' ? (
                            <button disabled className="w-full py-5 bg-stone-200 text-stone-500 text-xs font-bold uppercase tracking-[0.3em] cursor-not-allowed">
                                Obra ya {art.estatus}
                            </button>
                        ) : (
                            // La compra usa el id de la URL (= idRelacional de PostgreSQL)
                            <button
                                onClick={() => {
                                    setModalAction('reservar');
                                    setSecurityCodeInput('');
                                    setShowSecurityModal(true);
                                }}
                                disabled={reserveMutation.isPending}
                                className="w-full py-5 bg-slate-950 text-white text-xs font-bold uppercase tracking-[0.3em] hover:bg-white hover:text-slate-950 border-2 border-slate-950 transition-all duration-300 shadow-xl"
                            >
                                {reserveMutation.isPending ? 'Procesando Reserva...' : 'Confirmar reserva'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Nota de la obra — antes de reseñas */}
            {mongoDoc?.nota && (
                <div className="max-w-6xl mx-auto mt-12">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-4 text-sm text-amber-800">
                        {mongoDoc.nota}
                    </div>
                </div>
            )}

            {/* Reseñas — ancho completo, debajo del grid */}
            <div className="max-w-6xl mx-auto mt-12">
                <ArtReviewsSection artId={Number(id)} user={user} />
            </div>

            {/* Modal de Código de Seguridad */}
            {showSecurityModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-stone-100">
                        <h3 className="text-2xl font-serif font-bold text-slate-900 mb-2">Confirmar Compra</h3>
                        <p className="text-xs text-stone-500 mb-6">
                            Introduce tu código de seguridad alfanumérico de 10 caracteres enviado a tu correo al pagar la membresía.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-black uppercase tracking-widest mb-1.5">Código de Seguridad</label>
                                <input
                                    type="text"
                                    maxLength={10}
                                    placeholder="AB12CD34EF"
                                    value={securityCodeInput}
                                    onChange={(e) => setSecurityCodeInput(e.target.value.toUpperCase())}
                                    className="w-full text-center tracking-widest font-mono text-xl uppercase px-4 py-3 rounded-xl border-2 border-stone-850 focus:ring-2 focus:ring-black outline-none text-slate-950"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        setShowSecurityModal(false);
                                        setSecurityCodeInput('');
                                    }}
                                    className="flex-1 py-3 border-2 border-stone-200 text-stone-600 rounded-xl font-bold hover:border-stone-800 hover:text-stone-900 transition-all text-xs uppercase"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        if (securityCodeInput.length !== 10) {
                                            alert('El código de seguridad debe tener exactamente 10 caracteres.');
                                            return;
                                        }
                                        setShowSecurityModal(false);
                                        if (modalAction === 'comprar') {
                                            buyMutation.mutate(securityCodeInput);
                                        } else {
                                            reserveMutation.mutate(securityCodeInput);
                                        }
                                    }}
                                    disabled={reserveMutation.isPending || buyMutation.isPending}
                                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all text-xs uppercase shadow-md active:scale-95"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}