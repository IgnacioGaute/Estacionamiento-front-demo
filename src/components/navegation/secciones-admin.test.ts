import { seccionesAdmin } from './secciones-admin';

// Las secciones de administración cambian con la modalidad de la playa: en una gratuita no hay
// Tarifas ni Caja.
test('con cobro: Tarifas y Caja, más la planilla de vehículos', () => {
  const urls = seccionesAdmin(true).map((s) => [s.label, s.url]);
  expect(urls).toContainEqual(['Tarifas', '/admin/tarifas']);
  expect(urls).toContainEqual(['Caja', '/admin/caja']);
  expect(urls).toContainEqual(['Vehículos', '/admin/vehiculos']);
});

test('gratuita: sin Tarifas ni Caja, con la planilla de vehículos', () => {
  const secciones = seccionesAdmin(false);
  expect(secciones.some((s) => s.url === '/admin/tarifas' || s.url === '/admin/caja')).toBe(false);
  expect(secciones).toContainEqual({ label: 'Vehículos', url: '/admin/vehiculos' });
  // La facturación del sistema (Mi plan) no depende de la modalidad.
  expect(secciones).toContainEqual({ label: 'Mi plan', url: '/admin/plan' });
});

test('Configuración y Caja despliegan sus páginas en la barra lateral', () => {
  const secciones = seccionesAdmin(true, false, true);
  expect(secciones.find((s) => s.label === 'Configuración')?.items?.map((i) => i.url)).toEqual([
    '/admin/configuracion/turnos', '/admin/configuracion/vehiculos', '/admin/configuracion/comprobantes', '/admin/configuracion/mercadopago',
  ]);
  expect(secciones.find((s) => s.label === 'Caja')?.items?.map((i) => i.label)).toEqual(['Turnos', 'Ingresos y gastos']);
  // Sin turnos, Caja tiene una sola página: queda un enlace simple.
  expect(seccionesAdmin(true).find((s) => s.label === 'Caja')?.items).toBeUndefined();
  // Gratuita: sólo los tipos de vehículo, sin desplegable.
  expect(seccionesAdmin(false).find((s) => s.label === 'Configuración')?.items).toBeUndefined();
  // El super admin no tiene cuenta de MercadoPago propia.
  expect(seccionesAdmin(true, true).find((s) => s.label === 'Configuración')?.items?.some((i) => i.label === 'Mercado Pago')).toBe(false);
});

test('el superadministrador ve la administración de la playa sin el plan de una empresa propia', () => {
  expect(seccionesAdmin(true, true)).not.toContainEqual({ label: 'Mi plan', url: '/admin/plan' });
  expect(seccionesAdmin(true, true)).toContainEqual({ label: 'Caja', url: '/admin/caja' });
});
