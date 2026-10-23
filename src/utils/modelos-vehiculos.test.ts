import { buscarModelos, ejemploModelo } from './modelos-vehiculos';

const nombres = (texto: string, tipo?: string) => buscarModelos(texto, tipo).modelos.map((m) => m.nombre);

test('busca sin importar acentos, guiones ni el orden de las palabras', () => {
  expect(nombres('citroen c elysee')).toContain('Citroën C-Elysée');
  expect(nombres('hrv')).toContain('Honda HR-V');
  expect(nombres('wave honda')[0]).toBe('Honda Wave 110');
  expect(nombres('vw amarok')[0]).toBe('Volkswagen Amarok');
});

test('ordena primero la clase del tipo elegido pero encuentra las demás', () => {
  expect(buscarModelos('honda', 'MOTO').modelos[0].clase).toBe('moto');
  expect(buscarModelos('honda', 'AUTO').modelos[0].clase).toBe('auto');
  expect(nombres('hilux', 'AUTO')).toEqual(['Toyota Hilux']);
});

test('si no hay coincidencia exacta ofrece los parecidos de la marca', () => {
  const { modelos, parecidos } = buscarModelos('benelli 189', 'MOTO');
  expect(parecidos).toBe(true);
  expect(modelos[0].nombre).toBe('Benelli 180S');
  expect(modelos.every((m) => m.marca === 'Benelli')).toBe(true);
});

test('sin texto no sugiere y el ejemplo sigue al tipo', () => {
  expect(buscarModelos('  ', 'AUTO').modelos).toEqual([]);
  expect(ejemploModelo('MOTO')).toBe('Honda Wave 110');
  expect(ejemploModelo('UTILITARIO')).toBe('Toyota Hilux');
  expect(ejemploModelo('OTRO')).toBe('Fiat Cronos');
});
