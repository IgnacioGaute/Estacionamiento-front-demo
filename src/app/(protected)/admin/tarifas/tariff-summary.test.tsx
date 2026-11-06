/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import type { TariffBracket, TariffPlan } from '@/types/tariff-plan.type';
import { TariffSummary } from './tariff-summary';

const fila = (id: string, uptoMinutes: number | null, price: number, extra: Partial<TariffBracket> = {}): TariffBracket =>
  ({ id, vehicleType: 'AUTO', ticketDayType: null, label: '', uptoMinutes, price, recurringUnitMinutes: null, recurringPriceMode: 'FIXED', ...extra });
const plan = (brackets: TariffBracket[]): TariffPlan => ({
  revision: 'r1',
  schedule: { dayStartHour: 8, dayEndHour: 20, graceMinutes: 10, pricingDayTypeBasis: 'ENTRY',
    pricingOptions: {
      charging: { enabled: false, mode: 'STARTED', unitMinutes: 60, rates: [] },
      crossing: { enabled: false, mode: 'ENTRY' },
      stay: { enabled: false, freeMinutes: 0, minimumMinutes: 0, capEnabled: false, capMinutes: 1440, caps: [] },
    } },
  brackets,
} as TariffPlan);
const autos = [{ code: 'AUTO', name: 'Auto', enabled: true }];
const ultimaFila = () => screen.getAllByRole('row').at(-1)!;

beforeAll(() => {
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
});

test('un adicional DERIVED muestra el precio que sale de la lista y deja el respaldo como dato', () => {
  render(<TariffSummary plan={plan([fila('min', 1, 50), fila('hora', 60, 2000), fila('extra', null, 1000, { recurringUnitMinutes: 1, recurringPriceMode: 'DERIVED' })])} vehicles={autos} />);
  // Antes: «cada 1 min adicional $ 1.000,00», mientras «Ver tarifas» del operador decía «+ $ 50».
  expect(ultimaFila()).toHaveTextContent(/\+\s\$\s?50,00/);
  expect(ultimaFila()).toHaveTextContent(/respaldo de \$\s?1\.000,00/);
});

test('un adicional FIXED muestra su propio precio con «+»', () => {
  render(<TariffSummary plan={plan([fila('hora', 60, 2000), fila('extra', null, 500, { recurringUnitMinutes: 60 })])} vehicles={autos} />);
  expect(ultimaFila()).toHaveTextContent(/\+\s\$\s?500,00/);
  expect(ultimaFila()).not.toHaveTextContent(/respaldo/);
});

test('DERIVED sin la duración exacta se calcula proporcional a una escala mayor de la lista', () => {
  // 15 min de una hora de $ 2.000: $ 500, el mismo criterio que «Ver tarifas» y el backend.
  render(<TariffSummary plan={plan([fila('hora', 60, 2000), fila('extra', null, 1000, { recurringUnitMinutes: 15, recurringPriceMode: 'DERIVED' })])} vehicles={autos} />);
  expect(ultimaFila()).toHaveTextContent(/\+\s\$\s?500,00/);
});

test('sin ninguna referencia en la lista, DERIVED cobra el respaldo y lo dice', () => {
  render(<TariffSummary plan={plan([fila('cinco', 5, 300), fila('extra', null, 1000, { recurringUnitMinutes: 15, recurringPriceMode: 'DERIVED' })])} vehicles={autos} />);
  expect(ultimaFila()).toHaveTextContent(/\+\s\$\s?1\.000,00/);
  expect(ultimaFila()).toHaveTextContent('No hay una duración de referencia en la lista');
});
