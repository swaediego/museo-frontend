'use client';
import Link from 'next/link';

const adminModules = [
    { title: "Gestionar compradores", path: "/admin/buyers", description: "Ver, editar y eliminar perfiles de clientes.", color: "bg-blue-50 text-blue-700" },
    { title: "Gestionar administradores", path: "/admin/admins", description: "Control de acceso para el personal administrativo.", color: "bg-red-50 text-red-700" },
    { title: "Gestionar catalogo de arte", path: "/admin/art", description: "Gestionar obras, precios y disponibilidad.", color: "bg-emerald-50 text-emerald-700" },
    { title: "Gestionar artistas", path: "/admin/artists", description: "Gestionar artistas existentes en el sistema.", color: "bg-purple-50 text-purple-700" },
    { title: "Gestionar generos", path: "/admin/generos", description: "Gestionar generos existentes en el sistema.", color: "bg-yellow-50 text-yellow-700" },
    { title: "Gestionar facturas", path: "/admin/facturacion", description: "Gestionar las facturas del sistema.", color: "bg-pink-50 text-pink-700" },
    { title: "Reportes administrativos", path: "/admin/reportes", description: "Ver informes de ventas y membresías con filtros de fechas.", color: "bg-amber-50 text-amber-700" },
    { title: "Historial Gerencial", path: "/admin/historial", description: "Consulta de ventas por obra desde Cassandra.", color: "bg-cyan-50 text-cyan-700" }

];

export default function AdminDashboard() {
    return (
        <div className="min-h-screen bg-stone-50 pt-32 pb-20 px-6">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-4xl font-serif font-bold text-slate-950 mb-2">Panel de Administración</h1>
                <p className="text-stone-500 mb-12">Selecciona un módulo para comenzar la gestión.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {adminModules.map((module) => (
                        <Link
                            key={module.title}
                            href={module.path}
                            className="group bg-white p-8 rounded-3xl border border-stone-200 shadow-sm hover:shadow-xl transition-all duration-300"
                        >
                            <div className={`w-12 h-12 ${module.color} rounded-2xl flex items-center justify-center mb-6 text-xl font-bold`}>
                                {module.title[0]}
                            </div>
                            <h2 className="text-xl font-bold text-slate-950 mb-2 group-hover:text-amber-700 transition-colors">
                                {module.title}
                            </h2>
                            <p className="text-stone-500 text-sm leading-relaxed">{module.description}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}