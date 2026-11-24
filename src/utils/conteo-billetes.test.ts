import { conteoConErrores, DENOMINACIONES, desgloseDe, totalDesglose } from './conteo-billetes';

describe('conteo por billetes', () => {
  test('las mismas denominaciones que el servidor, de mayor a menor y hasta $ 1', () => {
    expect([...DENOMINACIONES]).toEqual([20000, 10000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1]);
  });

  test('el desglose va ordenado, sin ceros ni filas vacías, y suma el total', () => {
    const desglose = desgloseDe({ 1000: '3', 20000: '2', 500: '', 100: '0', 5: '1' });
    expect(desglose).toEqual([{ denominacion: 20000, cantidad: 2 }, { denominacion: 1000, cantidad: 3 }, { denominacion: 5, cantidad: 1 }]);
    expect(totalDesglose(desglose)).toBe(43005);
  });

  test('nada escrito no es un conteo de $ 0 (para eso está «No hay efectivo»)', () => {
    expect(desgloseDe({})).toEqual([]);
    expect(desgloseDe({ 1000: '0' })).toEqual([]);
  });

  test('cantidades no enteras o absurdas se marcan como error', () => {
    expect(conteoConErrores({ 1000: '2' })).toBe(false);
    expect(conteoConErrores({ 1000: '1.5' })).toBe(true);
    expect(conteoConErrores({ 1000: '-1' })).toBe(true);
    expect(conteoConErrores({ 1000: '100001' })).toBe(true);
  });
});
