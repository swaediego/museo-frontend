'use client';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        email: '',
        password: '',
        login: '',
        telefono: '',
        activo: true,
        direccionEnvio: '',
        datosTarjetaMask: '',
        membresiaPaga: false,
    });

    const [q1, setQ1] = useState('');
    const [a1, setA1] = useState('');
    const [q2, setQ2] = useState('');
    const [a2, setA2] = useState('');
    const [q3, setQ3] = useState('');
    const [a3, setA3] = useState('');

    // Obtener preguntas de seguridad disponibles
    const { data: questions } = useQuery({
        queryKey: ['security-questions'],
        queryFn: () => api.get('api/security/questions').json<any[]>(),
    });

    const mutation = useMutation({
        mutationFn: async (newBuyer: any) => {
            // 1. Registrar al comprador
            const buyer = await api.post('api/buyers/register', { json: newBuyer }).json<any>();

            // 2. Preparar respuestas ordenadas por id de pregunta
            const answersPayload = [
                { usuario: { id: buyer.id }, pregunta: { id: Number(q1) }, respuesta: a1 },
                { usuario: { id: buyer.id }, pregunta: { id: Number(q2) }, respuesta: a2 },
                { usuario: { id: buyer.id }, pregunta: { id: Number(q3) }, respuesta: a3 }
            ].sort((a, b) => a.pregunta.id - b.pregunta.id);

            // 3. Guardar las respuestas
            await api.post('api/security/answers', { json: answersPayload });

            return buyer;
        },
        onSuccess: () => {
            alert('¡Cuenta creada con éxito! Tus preguntas de seguridad han sido configuradas. Procede a iniciar sesión.');
            router.push('/login');
        },
        onError: (error) => {
            console.error(error);
            alert('Hubo un error en el registro o configuración de preguntas. Verifica si el email/usuario ya existe.');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!q1 || !q2 || !q3 || !a1 || !a2 || !a3) {
            alert('Por favor, selecciona las 3 preguntas de seguridad y proporciona tus respuestas.');
            return;
        }

        if (q1 === q2 || q2 === q3 || q1 === q3) {
            alert('Por favor, selecciona 3 preguntas de seguridad distintas.');
            return;
        }

        mutation.mutate(formData);
    };

    return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-stone-200 p-10 my-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-serif font-bold text-slate-950">Únete a la Galería</h1>
                    <p className="text-stone-500 mt-2">Crea tu perfil de coleccionista</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-widest mb-2">Nombre</label>
                        <input
                            required
                            type="text"
                            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 text-black focus:ring-slate-900 outline-none transition-all"
                            placeholder="Ej. Juan Pablo"
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-widest mb-2">Apellido</label>
                        <input
                            required
                            type="text"
                            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 text-black focus:ring-slate-900 outline-none transition-all"
                            placeholder="Ej. Buonarroti"
                            onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-widest mb-2">Correo Electrónico</label>
                        <input
                            required
                            type="email"
                            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 text-black focus:ring-slate-900 outline-none transition-all"
                            placeholder="tu@email.com"
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-widest mb-2">Contraseña</label>
                        <input
                            required
                            type="password"
                            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 text-black focus:ring-slate-900 outline-none transition-all"
                            placeholder="••••••••"
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-widest mb-2">usuario</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 text-black focus:ring-slate-900 outline-none transition-all"
                            placeholder="tunombre123"
                            onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-widest mb-2">telefono</label>
                        <input
                            type="tel"
                            required
                            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 text-black focus:ring-slate-900 outline-none transition-all"
                            placeholder="04267435641"
                            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-widest mb-2">Dirección de Envío</label>
                        <textarea
                            required
                            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 text-black focus:ring-slate-900 outline-none transition-all"
                            placeholder="Ej. Av. Principal, Edificio Sol, Apto 5, Caracas"
                            rows={3}
                            onChange={(e) => setFormData({ ...formData, direccionEnvio: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-widest mb-2">Número de Tarjeta (últimos 4 dígitos)</label>
                        <input
                            required
                            type="text"
                            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 text-black focus:ring-slate-900 outline-none transition-all"
                            placeholder="**** **** **** 1234"
                            onChange={(e) => setFormData({ ...formData, datosTarjetaMask: e.target.value })}
                        />
                    </div>

                    {/* PREGUNTAS DE SEGURIDAD */}
                    <div className="border-t border-stone-200 pt-6 space-y-6">
                        <div>
                            <h3 className="text-lg font-serif font-bold text-slate-900 mb-1">Preguntas de Seguridad</h3>
                            <p className="text-xs text-stone-500 mb-4">Estas preguntas se utilizarán para recuperar tu código de seguridad en el futuro. Selecciona 3 preguntas distintas.</p>
                        </div>

                        {/* Pregunta 1 */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-black uppercase tracking-widest">Pregunta 1</label>
                            <select
                                required
                                value={q1}
                                onChange={(e) => setQ1(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-black focus:ring-2 focus:ring-slate-900 outline-none transition-all cursor-pointer"
                            >
                                <option value="">Selecciona una pregunta...</option>
                                {questions?.filter(q => q.id !== Number(q2) && q.id !== Number(q3)).map((q) => (
                                    <option key={q.id} value={q.id}>{q.pregunta}</option>
                                ))}
                            </select>
                            <input
                                required
                                type="text"
                                placeholder="Tu respuesta..."
                                value={a1}
                                onChange={(e) => setA1(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 text-black focus:ring-slate-900 outline-none transition-all"
                            />
                        </div>

                        {/* Pregunta 2 */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-black uppercase tracking-widest">Pregunta 2</label>
                            <select
                                required
                                value={q2}
                                onChange={(e) => setQ2(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-black focus:ring-2 focus:ring-slate-900 outline-none transition-all cursor-pointer"
                            >
                                <option value="">Selecciona una pregunta...</option>
                                {questions?.filter(q => q.id !== Number(q1) && q.id !== Number(q3)).map((q) => (
                                    <option key={q.id} value={q.id}>{q.pregunta}</option>
                                ))}
                            </select>
                            <input
                                required
                                type="text"
                                placeholder="Tu respuesta..."
                                value={a2}
                                onChange={(e) => setA2(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 text-black focus:ring-slate-900 outline-none transition-all"
                            />
                        </div>

                        {/* Pregunta 3 */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-black uppercase tracking-widest">Pregunta 3</label>
                            <select
                                required
                                value={q3}
                                onChange={(e) => setQ3(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-black focus:ring-2 focus:ring-slate-900 outline-none transition-all cursor-pointer"
                            >
                                <option value="">Selecciona una pregunta...</option>
                                {questions?.filter(q => q.id !== Number(q1) && q.id !== Number(q2)).map((q) => (
                                    <option key={q.id} value={q.id}>{q.pregunta}</option>
                                ))}
                            </select>
                            <input
                                required
                                type="text"
                                placeholder="Tu respuesta..."
                                value={a3}
                                onChange={(e) => setA3(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 text-black focus:ring-slate-900 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={mutation.isPending}
                        className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:bg-stone-300"
                    >
                        {mutation.isPending ? 'Creando cuenta...' : 'Registrarme'}
                    </button>
                </form>
            </div>
        </div>
    );
}