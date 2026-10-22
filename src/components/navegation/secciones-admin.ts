// Las secciones de administración, una sola lista para la barra lateral y el menú de la cuenta.
// En una playa gratuita no hay tarifas ni caja: esas secciones no aparecen.
export type SeccionAdmin = { label: string; url: string };

export function seccionesAdmin(cobroHabilitado: boolean, superAdmin = false): SeccionAdmin[] {
  return [
    { label: 'Panel', url: '/admin/dashboard' },
    { label: 'Usuarios', url: '/admin/users' },
    ...(cobroHabilitado ? [{ label: 'Tarifas', url: '/admin/tarifas' }] : []),
    { label: 'Vehículos', url: '/admin/vehiculos' },
    { label: 'Frecuentes', url: '/admin/frecuentes' },
    // { label: 'Tipos de cochera', url: '/admin/parking-type' },
    ...(cobroHabilitado ? [{ label: 'Caja', url: '/admin/caja' }] : []),
    { label: 'Configuración', url: '/admin/configuracion' },
    ...(!superAdmin ? [{ label: 'Mi plan', url: '/admin/plan' }] : []),
  ];
}
