'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Question {
    id: number;
    pregunta: string;
}

export default function RecoverCodePage() {
    const [email, setEmail] = useState('');
    const [questions, setQuestions] = useState<Question[] | null>(null);
    const [answers, setAnswers] = useState<string[]>(['', '', '']);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [recoveredCode, setRecoveredCode] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleLoadQuestions = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setIsLoadingQuestions(true);
        setErrorMessage(null);
        setQuestions(null);
        setRecoveredCode(null);

        try {
            const res = await api.get(`api/security/questions/by-email?email=${encodeURIComponent(email)}`).json<Question[]>();
            if (res && res.length === 3) {
                setQuestions(res);
                setAnswers(['', '', '']);
            } else {
                setErrorMessage('No se encontraron 3 preguntas de seguridad configuradas para este correo.');
            }
        } catch (err: any) {
            console.error(err);
            setErrorMessage('No se pudo encontrar un usuario registrado con ese correo electrónico.');
        } finally {
            setIsLoadingQuestions(false);
        }
    };

    const handleVerifyAnswers = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !questions) return;

        if (answers.some(a => !a.trim())) {
            alert('Por favor, responde a todas las preguntas de seguridad.');
            return;
        }

        setIsVerifying(true);
        setErrorMessage(null);

        try {
            // El backend recibe: { email: string, respuestas: List<String> }
            const payload = {
                email,
                respuestas: answers
            };

            const resText = await api.post('api/buyers/recover-code', { json: payload }).text();
            
            // La respuesta exitosa es: "Validación exitosa. Su código es: XXXXXXXXXX"
            if (resText.includes('Su código es:')) {
                const parts = resText.split('Su código es:');
                const code = parts[1]?.trim();
                setRecoveredCode(code || resText);
            } else {
                setRecoveredCode(resText);
            }
        } catch (err: any) {
            console.error(err);
            try {
                const errText = await err.response.text();
                setErrorMessage(errText || 'Las respuestas proporcionadas no coinciden.');
            } catch {
                setErrorMessage('Error al validar las respuestas de seguridad. Inténtalo de nuevo.');
            }
        } finally {
            setIsVerifying(false);
        }
    };

    const handleAnswerChange = (index: number, val: string) => {
        const next = [...answers];
        next[index] = val;
        setAnswers(next);
    };

    return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-stone-100">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-serif font-bold text-slate-950">Recuperar Código</h1>
                    <p className="text-stone-500 mt-2">Valida tu identidad con tus preguntas de seguridad</p>
                </div>

                {errorMessage && (
                    <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-2xl font-medium">
                        {errorMessage}
                    </div>
                )}

                {recoveredCode ? (
                    <div className="space-y-6 text-center">
                        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl">
                            <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest block mb-2">Código de Seguridad Recuperado</span>
                            <div className="text-3xl font-mono font-bold tracking-widest text-slate-900 select-all my-2 px-4 py-2 bg-white rounded-xl border border-emerald-100 shadow-sm inline-block">
                                {recoveredCode}
                            </div>
                            <p className="text-xs text-stone-500 mt-3">Usa este código de 10 caracteres para autorizar tus compras y reservas.</p>
                        </div>
                        
                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(recoveredCode);
                                    alert('¡Código copiado al portapapeles!');
                                }}
                                className="flex-1 border-2 border-stone-800 text-slate-900 py-3 rounded-xl font-bold hover:bg-stone-50 transition-all text-sm"
                            >
                                Copiar código
                            </button>
                            <Link
                                href="/login"
                                className="flex-1 bg-slate-900 text-white text-center py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-all text-sm shadow-md"
                            >
                                Volver al Login
                            </Link>
                        </div>
                    </div>
                ) : !questions ? (
                    /* PASO 1: Ingresar Email */
                    <form onSubmit={handleLoadQuestions} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-black uppercase tracking-widest mb-2">Correo Electrónico</label>
                            <input
                                required
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-3 bg-white rounded-xl border border-stone-300 text-slate-950 font-medium focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                                placeholder="tu@email.com"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoadingQuestions}
                            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:bg-stone-300"
                        >
                            {isLoadingQuestions ? 'Cargando preguntas...' : 'Cargar Preguntas de Seguridad'}
                        </button>
                    </form>
                ) : (
                    /* PASO 2: Responder Preguntas */
                    <form onSubmit={handleVerifyAnswers} className="space-y-6">
                        <div className="p-3 bg-stone-100 rounded-xl text-xs text-stone-600 mb-2">
                            Validando usuario: <span className="font-bold text-slate-900">{email}</span>
                        </div>

                        {questions.map((q, idx) => (
                            <div key={q.id} className="space-y-2">
                                <label className="block text-xs font-bold text-black uppercase tracking-widest">
                                    Pregunta {idx + 1}
                                </label>
                                <div className="p-3 bg-stone-50 rounded-xl text-sm font-medium border border-stone-100 text-stone-800 italic">
                                    {q.pregunta}
                                </div>
                                <input
                                    required
                                    type="text"
                                    placeholder="Tu respuesta..."
                                    value={answers[idx]}
                                    onChange={(e) => handleAnswerChange(idx, e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 text-black focus:ring-slate-900 outline-none transition-all"
                                />
                            </div>
                        ))}

                        <div className="flex gap-4 pt-2">
                            <button
                                type="button"
                                onClick={() => setQuestions(null)}
                                className="w-1/3 border-2 border-stone-200 text-stone-500 py-3.5 rounded-xl font-bold hover:border-stone-800 hover:text-stone-900 transition-all text-xs uppercase"
                            >
                                Atrás
                            </button>
                            <button
                                type="submit"
                                disabled={isVerifying}
                                className="w-2/3 bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:bg-stone-300 text-sm"
                            >
                                {isVerifying ? 'Verificando...' : 'Obtener mi Código'}
                            </button>
                        </div>
                    </form>
                )}

                <div className="text-center mt-8 pt-6 border-t border-stone-100">
                    <Link href="/login" className="text-stone-500 hover:text-stone-800 text-xs uppercase tracking-widest font-bold">
                        Volver a Iniciar Sesión
                    </Link>
                </div>
            </div>
        </div>
    );
}
