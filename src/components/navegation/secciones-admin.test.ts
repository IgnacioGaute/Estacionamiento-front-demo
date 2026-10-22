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

test('el superadministrador ve la administración de la playa sin el plan de una empresa propia', () => {
  expect(seccionesAdmin(true, true)).not.toContainEqual({ label: 'Mi plan', url: '/admin/plan' });
  expect(seccionesAdmin(true, true)).toContainEqual({ label: 'Caja', url: '/admin/caja' });
});
