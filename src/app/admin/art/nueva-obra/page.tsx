'use client';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Artist, Genre, Art, CreateArtDTO } from '@/types/art';
import { useSearchParams } from 'next/navigation';

const FormInput = ({ label, value, onChange, type = "text" }: any) => (
    <div>
        <label className="block text-xs font-bold text-stone-500 uppercase mb-2">{label}</label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-3 bg-white rounded-xl border border-stone-300 text-slate-950 font-medium focus:ring-2 focus:ring-amber-600 outline-none"
        />
    </div>
);


//COMPONENTE PRINCIPAL
export default function NuevaObraPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();


    const id = searchParams.get('id');

    // 1. Estados para el formulario
    const [formData, setFormData] = useState<{
        nombre: string;
        precioBase: number;
        estatus: 'Disponible' | 'Reservada' | 'Vendida';
        imagenUrl: string;
        artistaId: number;
        fechaCreacion: number;
        generoId: number;
        tecnica?: string;
        estilo?: string;
        material?: string;
        peso?: number;
        largo?: number;
        ancho?: number;
        profundidad?: number;
        purezaMetal?: string;
        metalBase?: string;
        tipoImpresion?: string;
        papel?: string;
        edicion?: string;
        tipoArcilla?: string;
        temperaturaCoccion?: number;
    }>({
        nombre: '',
        precioBase: 0,
        fechaCreacion: new Date().getFullYear(),
        estatus: 'Disponible',
        imagenUrl: '',
        artistaId: 0,
        generoId: 0
    });

    const { data: obraEdicion } = useQuery({
        queryKey: ['art', id],
        queryFn: () => api.get(`api/arts/${id}`).json<Art>(),
        enabled: !!id,
    });

    useEffect(() => {
        if (obraEdicion) {
            const data = obraEdicion as any;
            const anioExtraido = typeof data.fechaCreacion === 'string'
                ? parseInt(data.fechaCreacion.substring(0, 4))
                : data.fechaCreacion;

            setFormData(prev => ({
                ...prev,
                nombre: data.nombre || '',
                precioBase: data.precioBase || 0,
                estatus: data.estatus || 'Disponible',
                imagenUrl: data.imagenUrl || '',
                fechaCreacion: anioExtraido || new Date().getFullYear() || 0,
                artistaId: data.artista?.id || 0,
                generoId: data.genero?.id || 0,
                // Campos específicos 
                tecnica: data.tecnica || '',
                estilo: data.estilo || '',
                material: data.material || '',
                peso: data.peso || 0,
                largo: data.largo || 0,
                ancho: data.ancho || 0,
                profundidad: data.profundidad || 0,
                purezaMetal: data.purezaMetal || '',
                metalBase: data.metalBase || '',
                tipoImpresion: data.tipoImpresion || '',
                papel: data.papel || '',
                edicion: data.edicion || '',
                tipoArcilla: data.tipoArcilla || '',
                temperaturaCoccion: data.temperaturaCoccion || 0
            }));
        }
    }, [obraEdicion]);

    // 2. Cargar datos necesarios para los Selects
    const { data: artistas } = useQuery({
        queryKey: ['artistas'],
        queryFn: () => api.get('api/artists').json<Artist[]>()
    });

    const { data: generos } = useQuery({
        queryKey: ['generos'],
        queryFn: () => api.get('api/genres').json<Genre[]>()
    });

    //discriminacion de tipo de dato por genero

    const renderCamposExtra = () => {
        const gen = generos?.find(g => g.id === formData.generoId)?.nombre;

        switch (gen) {
            case 'Pintura':
                return (
                    <>
                        <FormInput label="Técnica" value={formData.tecnica} onChange={(v: string) => setFormData({ ...formData, tecnica: v })} />
                        <FormInput label="Estilo" value={formData.estilo} onChange={(v: string) => setFormData({ ...formData, estilo: v })} />
                    </>
                );
            case 'Escultura':
                return (
                    <>
                        <FormInput label="Material" value={formData.material} onChange={(v: string) => setFormData({ ...formData, material: v })} />
                        <FormInput label="Peso (kg)" type="number" value={formData.peso} onChange={(v: number) => setFormData({ ...formData, peso: v })} />
                        <FormInput label="altura (cm)" type="number" value={formData.largo} onChange={(v: number) => setFormData({ ...formData, largo: v })} />
                    </>
                );
            case 'Orfebreria':
                return (
                    <>
                        <FormInput label="Pureza del Metal" value={formData.purezaMetal} onChange={(v: string) => setFormData({ ...formData, purezaMetal: v })} />
                        <FormInput label="Metal Base" value={formData.metalBase} onChange={(v: string) => setFormData({ ...formData, metalBase: v })} />
                        <FormInput label="Peso (kg)" type="number" value={formData.peso} onChange={(v: number) => setFormData({ ...formData, peso: v })} />
                    </>
                );

            case 'Fotografia':
                return (
                    <>
                        <FormInput label="Tipo de impresion" value={formData.tipoImpresion} onChange={(v: string) => setFormData({ ...formData, tipoImpresion: v })} />
                        <FormInput label="papel" value={formData.papel} onChange={(v: string) => setFormData({ ...formData, papel: v })} />
                        <FormInput label="edicion" value={formData.edicion} onChange={(v: string) => setFormData({ ...formData, edicion: v })} />
                    </>
                );

            case 'Ceramica':
                return (
                    <>
                        <FormInput label="Tipo de Arcilla" value={formData.tipoArcilla} onChange={(v: string) => setFormData({ ...formData, tipoArcilla: v })} />
                        <FormInput label="temperatura de Coccion" value={formData.temperaturaCoccion} onChange={(v: number) => setFormData({ ...formData, temperaturaCoccion: v })} />
                    </>
                );
            default:
                return null;
        }
    };





    // 3. Mutación para enviar los datos (POST)
    const mutation = useMutation<Art, Error, CreateArtDTO>({
        mutationFn: (nuevaObra: CreateArtDTO) => {
            return api.post('api/arts', { json: nuevaObra }).json<Art>();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['arts'] });
            alert('¡Obra guardada con éxito!');
            router.push('/admin/dashboard');
        },
        onError: () => {
            alert('Error al guardar la obra. Revisa la consola o los logs de Docker.');
        }
    });

    //manejo de cambio de Genero
    const handleGeneroChange = (id: number) => {
        setFormData(prev => ({
            ...prev,
            generoId: id,
            tecnica: '', estilo: '', material: '', peso: 0,
            largo: 0, ancho: 0, profundidad: 0, purezaMetal: '',
            metalBase: '', tipoImpresion: '', papel: '',
            edicion: '', tipoArcilla: '', temperaturaCoccion: 0
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const anio = Number(formData.fechaCreacion);
        const anioActual = new Date().getFullYear();

        //Validacion de que en  el campo de input año, se haya puesto un number
        if (isNaN(anio) || anio > anioActual) {
            alert(`Por favor, ingresa un año válido antes de ${anioActual}.`);
            return;
        }

        const basePayload = {
            nombre: formData.nombre,
            precioBase: Number(formData.precioBase),
            estatus: formData.estatus,
            fechaCreacion: Number(formData.fechaCreacion),
            imagenUrl: formData.imagenUrl,
            artista: { id: formData.artistaId },
            genero: { id: formData.generoId }
        };

        const gen = generos?.find(g => g.id === formData.generoId)?.nombre;
        let finalPayload: any = { ...basePayload };

        switch (gen) {
            case 'Pintura':
                finalPayload = { ...finalPayload, tecnica: formData.tecnica, estilo: formData.estilo };
                break;
            case 'Escultura':
                finalPayload = { ...finalPayload, material: formData.material, peso: formData.peso, largo: formData.largo, ancho: formData.ancho, profundidad: formData.profundidad };
                break;
            case 'Orfebreria':
                finalPayload = { ...finalPayload, purezaMetal: formData.purezaMetal, metalBase: formData.metalBase, peso: formData.peso };
                break;
            case 'Fotografia':
                finalPayload = { ...finalPayload, tipoImpresion: formData.tipoImpresion, papel: formData.papel, edicion: formData.edicion };
                break;
            case 'Ceramica':
                finalPayload = { ...finalPayload, tipoArcilla: formData.tipoArcilla, temperaturaCoccion: formData.temperaturaCoccion };
                break;
        }

        if (id) {
            // modo editar
            try {
                await api.put(`api/arts/${id}`, { json: finalPayload }).json();
                queryClient.invalidateQueries({ queryKey: ['arts'] });
                alert('¡Obra actualizada con éxito!');
                router.push('/admin/dashboard');
            } catch (err) {
                alert('Error al actualizar la obra.');
                console.error(err);
            }
        } else {
            // modo crear
            mutation.mutate(finalPayload);
        }
    };

    return (
        <div className="min-h-screen bg-stone-50 p-8">
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-stone-100 p-8">
                <h1 className="text-2xl font-serif font-bold text-gray-950 mb-6">Registrar Nueva Obra</h1>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Nombre de la Obra */}
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Nombre de la Obra</label>
                        <input
                            required
                            type="text"
                            className="w-full p-3 bg-white rounded-xl border border-stone-300 text-slate-950 font-medium focus:ring-2 focus:ring-amber-600 outline-none transition-all disabled:bg-stone-50 disabled:border-stone-200"
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        />
                    </div>

                    {/* Artista (Select) */}
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Artista</label>
                        <select
                            required
                            className="w-full p-3 bg-white rounded-xl border border-stone-300 text-slate-950 font-medium focus:ring-2 focus:ring-amber-600 outline-none transition-all disabled:bg-stone-50 disabled:border-stone-200"
                            value={formData.artistaId}
                            onChange={(e) => setFormData({ ...formData, artistaId: Number(e.target.value) })}
                        >
                            <option value="">Seleccionar...</option>
                            {artistas?.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                        </select>
                    </div>

                    {/* Género (Select) */}
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Género</label>
                        <select
                            required
                            className="w-full p-3 bg-white rounded-xl border border-stone-300 text-slate-950 font-medium focus:ring-2 focus:ring-amber-600 outline-none transition-all disabled:bg-stone-50 disabled:border-stone-200"
                            value={formData.generoId}
                            onChange={(e) => handleGeneroChange(Number(e.target.value))}
                        >
                            <option value="">Seleccionar...</option>
                            {generos?.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                        </select>
                    </div>

                    {/* Precio Base */}
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Precio Base ($)</label>
                        <input
                            required
                            type="number"
                            className="w-full p-3 bg-white rounded-xl border border-stone-300 text-slate-950 font-medium focus:ring-2 focus:ring-amber-600 outline-none transition-all disabled:bg-stone-50 disabled:border-stone-200"
                            value={formData.precioBase}
                            onChange={(e) => setFormData({ ...formData, precioBase: Number(e.target.value) })}
                        />
                    </div>
                    {/*año de creacion */}
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-2">
                            Año (Negativo para A.C.)
                        </label>
                        <input
                            required
                            type="number"
                            className="w-full p-3 bg-white rounded-xl border border-stone-300 text-slate-950 font-medium focus:ring-2 focus:ring-amber-600 outline-none"
                            value={formData.fechaCreacion}
                            onChange={(e) => setFormData({ ...formData, fechaCreacion: parseInt(e.target.value) || 0 })}
                        />
                        <p className="text-[13px] text-stone-400 mt-1">
                            Ej: -500 (para 500 A.C.), 2026 (para 2026 D.C.)
                        </p>
                    </div>

                    {renderCamposExtra()}

                    {/* URL de la Imagen */}
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-2">URL de la Imagen</label>
                        <input
                            required
                            type="url"
                            placeholder="https://..."
                            className="w-full p-3 bg-white rounded-xl border border-stone-300 text-slate-950 font-medium focus:ring-2 focus:ring-amber-600 outline-none transition-all disabled:bg-stone-50 disabled:border-stone-200"
                            value={formData.imagenUrl}
                            onChange={(e) => setFormData({ ...formData, imagenUrl: e.target.value })}
                        />
                    </div>

                    {/* Botones */}
                    <div className="md:col-span-2 flex gap-4 mt-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="flex-1 px-6 py-3 rounded-xl border border-stone-200 font-bold text-stone-600 hover:bg-stone-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="flex-1 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 disabled:bg-stone-400"
                        >
                            {mutation.isPending ? 'Guardando...' : 'Guardar Obra'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}