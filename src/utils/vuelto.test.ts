import { calcularVuelto, estadoEfectivo, pagosSugeridos } from './vuelto';

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

describe('estadoEfectivo', () => {
  test('sin indicar con cuánto paga no se puede confirmar', () => {
    expect(estadoEfectivo(3500, null)).toEqual({ estado: 'SIN_INDICAR' });
  });

  test('justo, con vuelto o lo que le falta', () => {
    expect(estadoEfectivo(3500, 3500)).toEqual({ estado: 'LISTO', vuelto: 0 });
    expect(estadoEfectivo(3500, 10000)).toEqual({ estado: 'LISTO', vuelto: 6500 });
    expect(estadoEfectivo(3500, 3000)).toEqual({ estado: 'FALTA', falta: 500 });
  });

  test('en un pago mixto el vuelto es contra la parte en efectivo', () => {
    // Total $ 5.000: $ 2.000 en efectivo y $ 3.000 por transferencia, entrega $ 5.000.
    expect(estadoEfectivo(2000, 5000)).toEqual({ estado: 'LISTO', vuelto: 3000 });
  });
});
