'use client';
import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { StarRating } from './StarRating';
import {
    getArtReviews,
    getArtReviewStats,
    createArtReview,
    deleteArtReviewAdmin,
    deleteMyArtReview,
} from '@/lib/api';
import { Review, ReviewStats, ReviewsResponse, Buyer } from '@/types/art';

/**
 * Sección de reseñas — debajo de los botones de acción.
 * MODIFICADO por Diego Torrelles ( bd2-proyecto )
 *
 * Modos de render según `user`:
 *   - sin login     → bloque con links a /register y /login
 *   - buyer logueado → form para calificar (no requiere membresía)
 *   - admin logueado → ve todas las reseñas (incluyendo autores dados de baja, en gris
 *                      con badge) y tiene botón "Eliminar comentario"
 */
interface ArtReviewsSectionProps {
    artId: number;
    user: Buyer | null;
}

const isAdmin = (u: Buyer | null): boolean =>
    !!u && (u as any).cargo != null;

export function ArtReviewsSection({ artId, user }: ArtReviewsSectionProps) {
    const queryClient = useQueryClient();
    const [selectedRating, setSelectedRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comentario, setComentario] = useState('');

    // IDs de compradores desactivados, provistos por el backend.
    // El admin los ve en gris con badge; para no-admin el backend ya los filtró.
    const [deactivatedBuyers, setDeactivatedBuyers] = useState<Set<number>>(new Set());

    // MODIFICADO por Diego Torrelles ( bd2-proyecto ) — modo edición de la propia reseña.
    // Si editingReviewId === myReview.id, el form se precarga con sus valores y el boton
    // dice "Guardar cambios" en vez de "Publicar/Actualizar".
    const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

    // Modal de confirmación: ¿Eliminar comentario? (admin o dueño)
    const [confirmDelete, setConfirmDelete] = useState<{ reviewId: string; buyerId: number; buyerNombre: string; scope: 'admin' | 'self' } | null>(null);


    const { data: reviewsResponse, isLoading } = useQuery<ReviewsResponse>({
        queryKey: ['art-reviews', artId],
        queryFn: () => getArtReviews(artId),
    });

    const reviews = reviewsResponse?.reviews ?? [];

    // Sincronizar desactivados desde el backend (persiste entre recargas)
    useEffect(() => {
        if (reviewsResponse?.deactivatedBuyerIds?.length) {
            setDeactivatedBuyers(new Set(reviewsResponse.deactivatedBuyerIds));
        }
    }, [reviewsResponse]);

    const { data: stats } = useQuery<ReviewStats>({
        queryKey: ['art-reviews-stats', artId],
        queryFn: () => getArtReviewStats(artId),
    });

    // El backend ya filtró según el rol; solo descartamos reseñas con rating 0 (eliminadas).
    const visibleReviews = useMemo(() => {
        return reviews.filter(r => r.rating > 0);
    }, [reviews]);

    const visibleStats = useMemo(() => {
        if (visibleReviews.length === 0) return { promedio: 0, total: 0 };
        const sum = visibleReviews.reduce((acc, r) => acc + r.rating, 0);
        return { promedio: sum / visibleReviews.length, total: visibleReviews.length };
    }, [visibleReviews]);

    const createMutation = useMutation({
        mutationFn: () => createArtReview(artId, selectedRating, comentario || undefined),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['art-reviews', artId] });
            queryClient.invalidateQueries({ queryKey: ['art-reviews-stats', artId] });
            setSelectedRating(0);
            setComentario('');
            setEditingReviewId(null); // MODIFICADO — salir del modo edición
            alert('¡Gracias por tu reseña!');
        },
        onError: async (err: any) => {
            const msg = await err.response?.text().catch(() => 'Error');
            alert(msg || 'No se pudo guardar la reseña');
        }
    });

    // MODIFICADO por Diego Torrelles ( bd2-proyecto ) — buyer elimina SU propia reseña
    const deleteMyMutation = useMutation({
        mutationFn: () => deleteMyArtReview(artId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['art-reviews', artId] });
            queryClient.invalidateQueries({ queryKey: ['art-reviews-stats', artId] });
            setEditingReviewId(null);
            setSelectedRating(0);
            setComentario('');
        },
        onError: async (err: any) => {
            const msg = await err.response?.text().catch(() => 'Error');
            alert(msg || 'No se pudo eliminar tu reseña');
        }
    });

    const deleteAdminMutation = useMutation({
        mutationFn: (reviewId: string) => deleteArtReviewAdmin(reviewId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['art-reviews', artId] });
            queryClient.invalidateQueries({ queryKey: ['art-reviews-stats', artId] });
        },
        onError: async (err: any) => {
            const msg = await err.response?.text().catch(() => 'Error');
            alert(msg || 'No se pudo eliminar la reseña');
        }
    });

    const canReview = !!user && !isAdmin(user);
    const myReview = canReview ? reviews.find(r => r.buyerId === user!.id) : undefined;

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString('es-AR', {
            year: 'numeric', month: 'short', day: 'numeric'
        });

    return (
        <div className="mt-12 border-t border-stone-200 pt-10">
            {/* Título + promedio */}
            <div className="flex items-end justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-serif font-medium text-slate-900">
                        Reseñas de visitantes
                    </h2>
                    {visibleStats.total > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                            <StarRating rating={Math.round(visibleStats.promedio)} readOnly size="sm" />
                            <span className="text-sm text-stone-600">
                                {visibleStats.promedio.toFixed(1)} ({visibleStats.total} {visibleStats.total === 1 ? 'reseña' : 'reseñas'})
                            </span>
                        </div>
                    )}
                    {visibleStats.total === 0 && (
                        <p className="text-sm text-stone-400 mt-1">Aún no hay reseñas — sé el primero</p>
                    )}
                </div>
            </div>

            {/* Lista de reseñas */}
            {isLoading ? (
                <p className="text-stone-400 text-sm italic">Cargando reseñas…</p>
            ) : visibleReviews.length === 0 ? (
                <p className="text-stone-400 italic">No hay reseñas todavía.</p>
            ) : (
                <div className="space-y-6">
                    {visibleReviews.map((review) => {
                        const isDeactivated = deactivatedBuyers.has(review.buyerId);
                        const nameColor = isAdmin(user) && isDeactivated ? 'text-stone-400' : 'text-slate-800';

                        return (
                            <div key={review.id} className="border-b border-stone-100 pb-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold uppercase ${
                                            isDeactivated && isAdmin(user) ? 'bg-stone-300 text-stone-500' : 'bg-slate-800 text-white'
                                        }`}>
                                            {review.buyerNombre.charAt(0)}
                                        </div>
                                        <div>
                                            <p className={`text-sm font-semibold ${nameColor} flex items-center gap-2`}>
                                                <span>{review.buyerNombre}</span>
                                                {isAdmin(user) && isDeactivated && (
                                                    <span className="text-[10px] uppercase tracking-widest font-bold text-stone-500 border border-stone-300 px-1.5 py-0.5 rounded">
                                                        (Desactivado)
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-[11px] text-stone-400">{formatDate(review.fecha)}</p>
                                        </div>
                                    </div>
                                    <StarRating rating={review.rating} readOnly size="sm" />
                                </div>
                                {review.comentario && (
                                    <p className={`mt-2 text-sm italic pl-12 ${isDeactivated && isAdmin(user) ? 'text-stone-400' : 'text-stone-600'}`}>
                                        "{review.comentario}"
                                    </p>
                                )}

                                {/* MODIFICADO por Diego Torrelles ( bd2-proyecto ) — controles de
                                    moderación visibles solo para el admin */}
                                {isAdmin(user) && (
                                    <div className="mt-3 pl-12 flex items-center gap-3">
                                        <button
                                            onClick={() => setConfirmDelete({
                                                reviewId: review.id,
                                                buyerId: review.buyerId,
                                                buyerNombre: review.buyerNombre,
                                                scope: 'admin',
                                            })}
                                            className="text-[10px] font-bold uppercase tracking-widest text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                        >
                                            Eliminar comentario
                                        </button>

                                    </div>
                                )}

                                {/* MODIFICADO por Diego Torrelles ( bd2-proyecto ) — controles del
                                    DUENIO de la reseña: puede editar o eliminar su propio
                                    comentario. NO se muestran para admin. */}
                                {!isAdmin(user) && user && review.buyerId === user.id && (
                                    <div className="mt-3 pl-12 flex items-center gap-3">
                                        <button
                                            onClick={() => {
                                                setSelectedRating(review.rating);
                                                setComentario(review.comentario || '');
                                                setEditingReviewId(review.id);
                                                // scroll al form
                                                setTimeout(() => {
                                                    const form = document.getElementById('review-form');
                                                    if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }, 50);
                                            }}
                                            className="text-[10px] font-bold uppercase tracking-widest text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                        >
                                            Editar comentario
                                        </button>
                                        <button
                                            onClick={() => setConfirmDelete({
                                                reviewId: review.id,
                                                buyerId: review.buyerId,
                                                buyerNombre: review.buyerNombre,
                                                scope: 'self',
                                            })}
                                            className="text-[10px] font-bold uppercase tracking-widest text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                        >
                                            Eliminar comentario
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Formulario para calificar — buyer logueado, no admin */}
            {canReview && (
                <div id="review-form" className="mt-8 p-6 bg-white border-2 border-stone-200 rounded-2xl shadow-sm">
                    {/* MODIFICADO por Diego Torrelles ( bd2-proyecto ) — si el buyer esta
                        editando su propia resena, mostramos titulo + boton cancelar */}
                    {editingReviewId ? (
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-200">
                            <p className="text-sm font-bold uppercase tracking-widest text-amber-700">
                                ✎ Editando tu reseña
                            </p>
                            <button
                                onClick={() => {
                                    setEditingReviewId(null);
                                    setSelectedRating(myReview ? myReview.rating : 0);
                                    setComentario(myReview ? (myReview.comentario || '') : '');
                                }}
                                className="text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:text-slate-800"
                            >
                                Cancelar
                            </button>
                        </div>
                    ) : myReview ? (
                        <div>
                            <p className="text-sm font-semibold text-emerald-700 mb-2">
                                ✦ Ya calificaste esta obra
                            </p>
                            <div className="flex items-center gap-3">
                                <StarRating rating={myReview.rating} readOnly size="sm" />
                                <span className="text-sm text-stone-500">(podés actualizar tu calificación abajo)</span>
                            </div>
                            {myReview.comentario && (
                                <p className="mt-1 text-sm text-stone-500 italic">"{myReview.comentario}"</p>
                            )}
                        </div>
                    ) : null}

                    <p className="text-sm font-bold uppercase tracking-widest text-stone-700 mb-3">
                        Tu calificación
                    </p>
                    <div className="flex items-center gap-3 mb-4">
                        {[1, 2, 3, 4, 5].map((star) => {
                            const filled = star <= (hoverRating || selectedRating);
                            return (
                                <button
                                    key={star}
                                    type="button"
                                    className="w-8 h-8 cursor-pointer hover:scale-110 transition-transform"
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    onClick={() => setSelectedRating(star)}
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill={filled ? 'currentColor' : 'none'}
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        className={`w-full h-full ${filled ? 'text-amber-400' : 'text-stone-300'}`}
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.563 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
                                        />
                                    </svg>
                                </button>
                            );
                        })}
                        {selectedRating > 0 && (
                            <span className="text-sm font-semibold text-amber-600">
                                {selectedRating === 1 && 'Muy mala'}
                                {selectedRating === 2 && 'Mala'}
                                {selectedRating === 3 && 'Regular'}
                                {selectedRating === 4 && 'Muy buena'}
                                {selectedRating === 5 && '¡Excelente!'}
                            </span>
                        )}
                    </div>

                    <textarea
                        value={comentario}
                        onChange={(e) => setComentario(e.target.value)}
                        placeholder="Dejá tu comentario (opcional)"
                        maxLength={500}
                        rows={3}
                        className="w-full px-4 py-3 text-sm border border-stone-300 rounded-xl resize-none focus:ring-2 focus:ring-slate-800 outline-none text-slate-800 placeholder:text-stone-400"
                    />
                    <div className="flex justify-between items-center mt-3">
                        <span className="text-[11px] text-stone-400">{comentario.length}/500</span>
                        <button
                            onClick={() => createMutation.mutate()}
                            disabled={selectedRating === 0 || createMutation.isPending}
                            className="px-6 py-2.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all disabled:bg-stone-300 disabled:cursor-not-allowed"
                        >
                            {createMutation.isPending
                                ? 'Guardando…'
                                : editingReviewId
                                    ? 'Guardar cambios'
                                    : myReview
                                        ? 'Actualizar'
                                        : 'Publicar reseña'}
                        </button>
                    </div>
                </div>
            )}

            {/* MODIFICADO por Diego Torrelles ( bd2-proyecto ) — bloque para usuarios no logueados
                con dos links: registrarme / iniciar sesión */}
            {!user && (
                <div className="mt-8 p-6 bg-stone-100 border border-stone-200 rounded-2xl text-center space-y-3">
                    <p className="text-base font-serif text-slate-800">
                        ¿Querés dejar tu reseña?
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href="/register"
                            className="inline-block px-5 py-2.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all"
                        >
                            ¿Eres nuevo usuario? Haz click aquí para registrarte
                        </Link>
                        <Link
                            href="/login"
                            className="inline-block px-5 py-2.5 bg-white text-slate-900 text-xs font-bold uppercase tracking-widest rounded-xl border-2 border-slate-900 hover:bg-slate-900 hover:text-white transition-all"
                        >
                            ¿Eres usuario recurrente? Inicia sesión
                        </Link>
                    </div>
                </div>
            )}

            {/* Modal: ¿Eliminar comentario? */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-stone-100">
                        <h3 className="text-xl font-serif font-bold text-slate-900 mb-2">
                            ¿Estás seguro de eliminar el comentario?
                        </h3>
                        <p className="text-sm text-stone-500 mb-6">
                            {confirmDelete.scope === 'self'
                                ? 'Vas a eliminar tu propia reseña. Esta acción no se puede deshacer.'
                                : <>Vas a eliminar la reseña de <span className="font-semibold text-slate-700">{confirmDelete.buyerNombre}</span>. Esta acción no se puede deshacer.</>}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="flex-1 py-3 border-2 border-stone-200 text-stone-600 rounded-xl font-bold hover:border-stone-800 hover:text-stone-900 transition-all text-xs uppercase"
                            >
                                No
                            </button>
                            <button
                                onClick={() => {
                                    if (confirmDelete.scope === 'admin') {
                                        deleteAdminMutation.mutate(confirmDelete.reviewId);
                                    } else {
                                        deleteMyMutation.mutate();
                                    }
                                    setConfirmDelete(null);
                                }}
                                disabled={deleteAdminMutation.isPending || deleteMyMutation.isPending}
                                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all text-xs uppercase shadow-md active:scale-95 disabled:bg-red-300"
                            >
                                {(deleteAdminMutation.isPending || deleteMyMutation.isPending) ? 'Eliminando…' : 'Sí'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
