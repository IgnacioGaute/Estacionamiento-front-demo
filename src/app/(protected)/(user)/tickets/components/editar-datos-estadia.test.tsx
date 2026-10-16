/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EditarDatosEstadia } from './editar-datos-estadia';
import { corregirDatosEstadiaAction } from '@/actions/tickets/corregir-datos.action';
import { getVehicleTypesAction } from '@/actions/tickets/vehicle-types.action';
import type { CloseSummary } from '@/services/tickets.service';

jest.mock('next/navigation', () => ({ usePathname: () => '/tickets' }));
jest.mock('@/actions/tickets/corregir-datos.action', () => ({ corregirDatosEstadiaAction: jest.fn() }));
jest.mock('@/actions/tickets/vehicle-types.action', () => ({ getVehicleTypesAction: jest.fn() }));
const summary = (vehicleType = 'AUTO', price = 1000) => ({ registration: { id: 'reg', vehicleType, entryMode: 'PLATE', licensePlateOriginal: 'AB123CD' }, previewBracket: { price } } as unknown as CloseSummary);
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getVehicleTypesAction).mockResolvedValue([{ code: 'AUTO', name: 'Auto', enabled: true }, { code: 'CAMIONETA', name: 'Camioneta', enabled: true }]);
});

test('cambiar el tipo devuelve el cobro con la tarifa nueva', async () => {
  jest.mocked(corregirDatosEstadiaAction).mockResolvedValue({ summary: summary('CAMIONETA', 2500) });
  const onCorregido = jest.fn();
  render(<EditarDatosEstadia summary={summary()} onCorregido={onCorregido} />);
  fireEvent.click(screen.getByRole('button', { name: /Corregir patente o tipo/}));
  fireEvent.click(await screen.findByRole('radio', { name: 'Camioneta' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  await waitFor(() => expect(corregirDatosEstadiaAction).toHaveBeenCalledWith('reg', { vehicleType: 'CAMIONETA' }));
  expect(onCorregido).toHaveBeenCalledWith(expect.objectContaining({ previewBracket: { price: 2500 } }));
});

test('corregir la patente manda solo la patente y muestra el error si ya está adentro', async () => {
  jest.mocked(corregirDatosEstadiaAction).mockResolvedValue({ code: 'DUPLICATE_ACTIVE_PLATE', error: 'Esa patente ya está adentro en otra estadía.' });
  render(<EditarDatosEstadia summary={summary()} onCorregido={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /Corregir patente o tipo/}));
  fireEvent.change(screen.getByLabelText('Patente'), { target: { value: 'ab128cd' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  await waitFor(() => expect(corregirDatosEstadiaAction).toHaveBeenCalledWith('reg', { licensePlate: 'AB128CD' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('ya está adentro');
});

test('sin cambios no se puede guardar', async () => {
  render(<EditarDatosEstadia summary={summary()} onCorregido={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /Corregir patente o tipo/}));
  await screen.findByRole('radio', { name: 'Auto' });
  expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
});
