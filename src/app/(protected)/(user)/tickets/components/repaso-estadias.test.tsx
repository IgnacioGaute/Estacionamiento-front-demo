/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { RepasoEstadias } from './repaso-estadias';
import type { EstadiaAbiertaTurno } from '@/types/turno.type';

const ahora = new Date('2026-10-15T03:26:00-03:00').getTime();
const props = { ahora, confirmado: false, onConfirmar: jest.fn() };

test('calcula el tiempo adentro con la fecha como texto', () => {
  render(<RepasoEstadias {...props} estadias={[{ id: 'a', patente: 'AF876EB', vehicleType: 'AUTO', entryDay: '2026-10-14', entryTime: '07:11:00', anticipo: 0 }]} />);
  expect(screen.getByText(/20 h 15 min adentro/)).toBeInTheDocument();
});

test('no rompe la pantalla si la fecha llega como fecha ISO completa (lo que mandaba producción)', () => {
  const estadias = [{ id: 'a', patente: 'AF876EB', vehicleType: 'AUTO', entryDay: '2026-10-14T00:00:00.000Z', entryTime: '07:11:00', anticipo: 0 }] as EstadiaAbiertaTurno[];
  render(<RepasoEstadias {...props} estadias={estadias} />);
  expect(screen.getByText('Entró 07:11')).toBeInTheDocument();
  expect(screen.getByText(/20 h 15 min adentro/)).toBeInTheDocument();
});

test('al cerrar la caja muestra todas con quién las registró y explica el sobrante', () => {
  render(<RepasoEstadias {...props} todas sobrante={84500} estadias={[
    { id: 'b', patente: 'NBO468', vehicleType: 'AUTO', entryDay: '2026-10-14', entryTime: '12:44:00', anticipo: 0, operador: 'Franco Pizarro' },
    { id: 'a', patente: 'AF876EB', vehicleType: 'AUTO', entryDay: '2026-10-14', entryTime: '07:11:00', anticipo: 0, operador: 'Franco Pizarro' },
  ]} />);
  expect(screen.getByText(/Vehículos que siguen adentro · 2/)).toBeInTheDocument();
  expect(screen.getByText('Entró 07:11 · Franco Pizarro')).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Contaste $ 84.500 de más');
  // El que lleva más horas, primero.
  expect(screen.getAllByText(/adentro$/)[0]).toHaveTextContent('20 h 15 min adentro');
});
