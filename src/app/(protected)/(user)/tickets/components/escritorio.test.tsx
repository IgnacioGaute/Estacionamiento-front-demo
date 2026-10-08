/** @jest-environment jsdom */
import { createRef } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import type { TicketRegistration } from '@/types/ticket-registration.type';
import { BuscadorRapido, TableroPlaya } from './escritorio';

// La lista con desplazamiento usa IntersectionObserver, que jsdom no tiene: acá alcanza con sus hijos.
jest.mock('@/components/animated-scroll-list', () => ({
  AnimatedScrollList: ({ children, label }: { children: React.ReactNode; label: string }) => <div role="region" aria-label={label}>{children}</div>,
}));
jest.mock('./day-registrations-panel', () => ({ DayRegistrationsPanel: () => null }));

dayjs.extend(utc);
dayjs.extend(timezone);
const ahora = dayjs.tz('2026-10-07 14:47:00', 'America/Argentina/Buenos_Aires').valueOf();

const registro = (id: string, entryTime: string, extra: Partial<TicketRegistration> = {}) => ({
  id,
  entryMode: 'PLATE',
  entryDay: '2026-10-07',
  entryTime,
  departureDay: null,
  departureTime: null,
  updatedAt: new Date('2026-10-07T17:00:00Z'),
  price: 0,
  ...extra,
}) as unknown as TicketRegistration;

const activos = [
  registro('ab123', '13:58:00', { licensePlateOriginal: 'AB123CD' }),
  registro('aa874', '12:15:00', { licensePlateOriginal: 'AA874HB', expectedUptoMinutes: 120 }),
  registro('gomez', '14:05:00', { noPlate: true, lastNameCustomer: 'Gómez' }),
  registro('ab990', '10:41:00', { licensePlateOriginal: 'AB990KC' }),
];

function buscador(props: Partial<React.ComponentProps<typeof BuscadorRapido>> = {}) {
  const onCobrar = jest.fn();
  const onEntrada = jest.fn();
  render(
    <BuscadorRapido
      inputRef={createRef<HTMLInputElement>()}
      activos={activos}
      diaActivos={[]}
      esDiaVencido={() => false}
      registros={activos}
      ahora={ahora}
      ticketsHabilitados={false}
      comprobantes={false}
      atajo
      onCobrar={onCobrar}
      onAbrirDia={jest.fn()}
      onComprobante={jest.fn()}
      onEntrada={onEntrada}
      {...props}
    />,
  );
  const campo = screen.getByRole('combobox', { name: 'Buscar un vehículo' });
  fireEvent.focus(campo);
  return { campo, onCobrar, onEntrada };
}

test('Enter cobra al primero que coincide y deja el buscador vacío', () => {
  const { campo, onCobrar } = buscador();
  fireEvent.change(campo, { target: { value: 'ab1' } });
  const opciones = screen.getAllByRole('option');
  expect(opciones[0]).toHaveAttribute('aria-selected', 'true');
  expect(opciones[0]).toHaveTextContent('AB123CD');
  fireEvent.keyDown(campo, { key: 'Enter' });
  expect(onCobrar).toHaveBeenCalledWith('ab123');
  expect(campo).toHaveValue('');
});

test('con las flechas se llega a registrar la entrada con lo escrito', () => {
  const { campo, onEntrada, onCobrar } = buscador();
  fireEvent.change(campo, { target: { value: 'zz9' } });
  expect(screen.getByText(/No hay ningún vehículo adentro/)).toBeInTheDocument();
  fireEvent.keyDown(campo, { key: 'ArrowDown' });
  fireEvent.keyDown(campo, { key: 'Enter' });
  expect(onEntrada).toHaveBeenCalledWith('zz9');
  expect(onCobrar).not.toHaveBeenCalled();
});

test('encuentra el apellido aunque se escriba sin tilde', () => {
  const { campo } = buscador();
  fireEvent.change(campo, { target: { value: 'gomez' } });
  expect(screen.getAllByRole('option')[0]).toHaveTextContent('Sin patente');
});

test('el tablero reparte por hace cuánto entraron y el filtro deja solo a los que se pasaron', () => {
  const onFiltro = jest.fn();
  const { rerender } = render(
    <TableroPlaya activos={activos} ahora={ahora} diaActivos={[]} esDiaVencido={() => false} filtro="todos" onFiltro={onFiltro} onCobrar={jest.fn()} onAbrirDia={jest.fn()} />,
  );
  const columna = (nombre: string) => screen.getByRole('region', { name: nombre });
  expect(within(columna('Menos de 1 h')).getAllByRole('button')).toHaveLength(2);
  expect(within(columna('De 1 a 4 h')).getByRole('button')).toHaveTextContent('AA874HB');
  expect(within(columna('Más de 4 h')).getByRole('button')).toHaveTextContent('AB990KC');
  // Debajo de cada título, cuánto lleva el más antiguo de ese tramo.
  expect(within(columna('Menos de 1 h')).getByText('El más antiguo: 49 min')).toBeInTheDocument();
  expect(within(columna('Más de 4 h')).getByText('El más antiguo: 4 h 06 min')).toBeInTheDocument();
  // El que se pasó del tiempo avisado lo dice con cuánto avisó y cuánto se pasó.
  expect(within(columna('De 1 a 4 h')).getByText('Avisó 2 h · se pasó 32 min')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Tiempo superado · 1/ }));
  expect(onFiltro).toHaveBeenCalledWith('excedidos');
  rerender(
    <TableroPlaya activos={activos} ahora={ahora} diaActivos={[]} esDiaVencido={() => false} filtro="excedidos" onFiltro={onFiltro} onCobrar={jest.fn()} onAbrirDia={jest.fn()} />,
  );
  expect(within(columna('Menos de 1 h')).queryAllByRole('button')).toHaveLength(0);
  expect(within(columna('De 1 a 4 h')).getAllByRole('button')).toHaveLength(1);
});
