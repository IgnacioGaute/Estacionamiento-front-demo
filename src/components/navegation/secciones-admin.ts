// Las secciones de administración, una sola lista para la barra lateral y el menú de la cuenta.
// En una playa gratuita no hay tarifas ni caja: Tarifas desaparece y Caja queda como «Historial de
// cobros», de solo lectura, para consultar lo que se cobró antes del cambio de modalidad.
export type SeccionAdmin = { label: string; url: string };

export function seccionesAdmin(cobroHabilitado: boolean): SeccionAdmin[] {
  return [
    { label: 'Panel', url: '/admin/dashboard' },
    { label: 'Usuarios', url: '/admin/users' },
    ...(cobroHabilitado ? [{ label: 'Tarifas', url: '/admin/tarifas' }] : []),
    { label: 'Vehículos', url: '/vehiculos' },
    { label: 'Frecuentes', url: '/admin/frecuentes' },
    // { label: 'Tipos de cochera', url: '/admin/parking-type' },
    { label: cobroHabilitado ? 'Caja' : 'Historial de cobros', url: '/admin/caja' },
    { label: 'Configuración', url: '/admin/configuracion' },
    { label: 'Mi plan', url: '/admin/plan' },
  ];
}
