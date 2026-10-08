import { calcularVuelto, pagosSugeridos } from './vuelto';

describe('pagosSugeridos', () => {
  test('propone los primeros importes redondos mayores al saldo', () => {
    expect(pagosSugeridos(38000)).toEqual([40000, 50000]);
    expect(pagosSugeridos(2500)).toEqual([3000, 5000]);
    expect(pagosSugeridos(12300)).toEqual([13000, 15000]);
  });

  test('no repite el saldo exacto: para eso está «Justo»', () => {
    expect(pagosSugeridos(5000)).toEqual([10000, 20000]);
  });

  test('con montos altos redondea a billetes grandes y sin saldo no ofrece nada', () => {
    expect(pagosSugeridos(250000)).toEqual([260000, 300000]);
    expect(pagosSugeridos(0)).toEqual([]);
  });
});

describe('calcularVuelto', () => {
  test('devuelve el vuelto o, en negativo, lo que falta', () => {
    expect(calcularVuelto(38000, 40000)).toBe(2000);
    expect(calcularVuelto(38000, 38000)).toBe(0);
    expect(calcularVuelto(38000, 30000)).toBe(-8000);
  });

  test('no arrastra errores de coma flotante', () => {
    expect(calcularVuelto(1000.1, 1000.3)).toBe(0.2);
  });
});
