'use client';
import { useState } from 'react';

interface StarRatingProps {
    rating: number;           // rating actual (1-5)
    onRate?: (rating: number) => void;  // callback cuando el usuario califica
    readOnly?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

/**
 * Componente de calificación por estrellas.
 * MODIFICADO por Diego Torrelles ( bd2-proyecto )
 */
export function StarRating({ rating, onRate, readOnly = false, size = 'md' }: StarRatingProps) {
    const [hover, setHover] = useState(0);

    const sizeClasses = {
        sm: 'w-3 h-3',
        md: 'w-5 h-5',
        lg: 'w-7 h-7',
    };

    const gapClasses = {
        sm: 'gap-0.5',
        md: 'gap-1',
        lg: 'gap-1.5',
    };

    return (
        <div className={`flex items-center ${gapClasses[size]}`}>
            {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= (hover || rating);
                return (
                    <button
                        key={star}
                        type="button"
                        disabled={readOnly}
                        className={`${sizeClasses[size]} transition-transform ${
                            readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
                        }`}
                        onMouseEnter={() => !readOnly && setHover(star)}
                        onMouseLeave={() => !readOnly && setHover(0)}
                        onClick={() => onRate?.(star)}
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill={filled ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className={`w-full h-full ${
                                filled ? 'text-amber-400' : 'text-stone-300'
                            }`}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
                            />
                        </svg>
                    </button>
                );
            })}
        </div>
    );
}
