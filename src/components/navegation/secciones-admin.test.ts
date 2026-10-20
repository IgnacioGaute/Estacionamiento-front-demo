import { seccionesAdmin } from './secciones-admin';

// Las secciones de administración cambian con la modalidad de la playa: en una gratuita no hay
// Tarifas y la Caja queda como historial de lo cobrado antes.
test('con cobro: Tarifas y Caja, más la planilla de vehículos', () => {
  const urls = seccionesAdmin(true).map((s) => [s.label, s.url]);
  expect(urls).toContainEqual(['Tarifas', '/admin/tarifas']);
  expect(urls).toContainEqual(['Caja', '/admin/caja']);
  expect(urls).toContainEqual(['Vehículos', '/vehiculos']);
});

test('gratuita: sin Tarifas, con el historial de cobros de solo lectura', () => {
  const secciones = seccionesAdmin(false);
  expect(secciones.some((s) => s.url === '/admin/tarifas')).toBe(false);
  expect(secciones).toContainEqual({ label: 'Historial de cobros', url: '/admin/caja' });
  expect(secciones).toContainEqual({ label: 'Vehículos', url: '/vehiculos' });
  // La facturación del sistema (Mi plan) no depende de la modalidad.
  expect(secciones).toContainEqual({ label: 'Mi plan', url: '/admin/plan' });
});
