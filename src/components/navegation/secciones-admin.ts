// Las secciones de administración, una sola lista para la barra lateral y el menú de la cuenta.
// En una playa gratuita no hay tarifas ni caja: esas secciones no aparecen.
export type SeccionAdmin = { label: string; url: string; items?: { label: string; url: string }[] };

// Configuración y Caja tienen varias páginas: la barra lateral las despliega debajo de la sección.
// Con una sola opción (Caja sin turnos) queda un enlace simple.
const conItems = (seccion: SeccionAdmin, items: { label: string; url: string }[]): SeccionAdmin =>
  items.length > 1 ? { ...seccion, items } : seccion;

export function seccionesAdmin(cobroHabilitado: boolean, superAdmin = false, shiftsEnabled = false): SeccionAdmin[] {
  return [
    { label: 'Panel', url: '/admin/dashboard' },
    { label: 'Usuarios', url: '/admin/users' },
    ...(cobroHabilitado ? [{ label: 'Tarifas', url: '/admin/tarifas' }] : []),
    { label: 'Vehículos', url: '/admin/vehiculos' },
    { label: 'Frecuentes', url: '/admin/frecuentes' },
    // { label: 'Tipos de cochera', url: '/admin/parking-type' },
    ...(cobroHabilitado ? [conItems({ label: 'Caja', url: '/admin/caja' }, [
      ...(shiftsEnabled ? [{ label: 'Turnos', url: '/admin/caja/turnos' }] : []),
      { label: 'Ingresos y gastos', url: '/admin/caja/movimientos' },
    ])] : []),
    // Tipos de vehículo no es la planilla de Vehículos: son los que recibe la playa. La cuenta de
    // MercadoPago es de una empresa: el super admin no tiene una.
    conItems({ label: 'Configuración', url: '/admin/configuracion' }, [
      ...(cobroHabilitado ? [{ label: 'Turnos de caja', url: '/admin/configuracion/turnos' }] : []),
      { label: 'Tipos de vehículo', url: '/admin/configuracion/vehiculos' },
      ...(cobroHabilitado ? [{ label: 'Comprobantes', url: '/admin/configuracion/comprobantes' }] : []),
      ...(cobroHabilitado && !superAdmin ? [{ label: 'Mercado Pago', url: '/admin/configuracion/mercadopago' }] : []),
    ]),
    ...(!superAdmin ? [{ label: 'Mi plan', url: '/admin/plan' }] : []),
  ];
}
