/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { SalidaSinEntradaDialog } from './salida-sin-entrada-dialog';
import { createRegistrationByPlateAction } from '@/actions/tickets/create-registration-by-plate.action';
import { corregirEntradaAction } from '@/actions/tickets/corregir-entrada.action';
import { eliminarEstadiaAction } from '@/actions/tickets/eliminar-estadia.action';
import { tarifasSinEntradaAction } from '@/actions/tickets/salida-anterior.action';
import { getVehicleTypesAction } from '@/actions/tickets/vehicle-types.action';
import { useCurrentRole } from '@/hooks/auth/use-current-role';
import { searchActiveRegistrationsAction } from '@/actions/tickets/search-active-registrations.action';
jest.mock('next/navigation', () => ({ usePathname: () => '/tickets' }));
jest.mock('@/actions/tickets/create-registration-by-plate.action', () => ({ createRegistrationByPlateAction: jest.fn() }));
jest.mock('@/actions/tickets/corregir-entrada.action', () => ({ corregirEntradaAction: jest.fn() }));
jest.mock('@/actions/tickets/eliminar-estadia.action', () => ({ eliminarEstadiaAction: jest.fn() }));
jest.mock('@/actions/tickets/salida-anterior.action', () => ({ tarifasSinEntradaAction: jest.fn() }));
jest.mock('@/actions/tickets/vehicle-types.action', () => ({ getVehicleTypesAction: jest.fn() }));
jest.mock('@/hooks/auth/use-current-role', () => ({ useCurrentRole: jest.fn() }));
jest.mock('@/actions/tickets/search-active-registrations.action', () => ({ searchActiveRegistrationsAction: jest.fn() }));
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useCurrentRole).mockReturnValue('USER' as never);
  jest.mocked(searchActiveRegistrationsAction).mockResolvedValue([]);
  jest.mocked(getVehicleTypesAction).mockResolvedValue([{ code: 'AUTO', name: 'Auto', enabled: true }]);
  jest.mocked(tarifasSinEntradaAction).mockResolvedValue({
    opciones: [{ etiqueta: 'Hasta 1 hora', minutos: 60, precio: 3500 }, { etiqueta: 'Hasta 4 horas', minutos: 240, precio: 12000 }],
    repeticion: { etiqueta: 'Hora extra', unidadMinutos: 60, base: 240, precios: [15000, 18000, 21000] },
  });
  jest.mocked(createRegistrationByPlateAction).mockResolvedValue({ success: 'ok', registrationId: 'nueva' } as never);
  jest.mocked(corregirEntradaAction).mockResolvedValue({ summary: {} as never });
});

const minutosAtras = () => Math.round((Date.now() - new Date(jest.mocked(corregirEntradaAction).mock.calls[0][1]).getTime()) / 60000);

test('se elige la tarifa, sin hora exacta: la entrada queda adentro de esa tarifa y se abre el cobro', async () => {
  const onCobrar = jest.fn();
  render(<SalidaSinEntradaDialog plate="AB123CD" onClose={jest.fn()} onCobrar={onCobrar} />);
  fireEvent.click(await screen.findByRole('radio', { name: /Hasta 1 hora/ }));
  const confirmar = screen.getByRole('button', { name: /Registrar y cobrar/ });
  await waitFor(() => expect(confirmar).toBeEnabled());
  fireEvent.click(confirmar);
  await waitFor(() => expect(onCobrar).toHaveBeenCalledWith('nueva'));
  expect(createRegistrationByPlateAction).toHaveBeenCalledWith(expect.objectContaining({ licensePlate: 'AB123CD', vehicleType: 'AUTO' }));
  // Un par de minutos antes del borde, para que el cobro no salte a la tarifa siguiente.
  expect(minutosAtras()).toBe(58);
});

test('en la última tarifa se suman las horas extra', async () => {
  render(<SalidaSinEntradaDialog plate="AB123CD" onClose={jest.fn()} onCobrar={jest.fn()} />);
  fireEvent.click(await screen.findByRole('radio', { name: /Hasta 4 horas/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Una vez más Hora extra' }));
  fireEvent.click(screen.getByRole('button', { name: 'Una vez más Hora extra' }));
  expect(screen.getByRole('radio', { name: /\+ 2 × Hora extra/ })).toHaveTextContent(/18\.000/);
  fireEvent.click(screen.getByRole('button', { name: /Registrar y cobrar/ }));
  await waitFor(() => expect(corregirEntradaAction).toHaveBeenCalled());
  expect(minutosAtras()).toBe(240 + 120 - 2);
});

const adentro = (id: string, plate: string) => ({ id, licensePlateOriginal: plate, parecida: true }) as never;

test('por cada parecida se contesta si sigue en la playa; sin contestar todas no se registra y no se cobra ninguna', async () => {
  jest.mocked(useCurrentRole).mockReturnValue('ADMIN' as never);
  jest.mocked(searchActiveRegistrationsAction).mockResolvedValue([adentro('hc', 'AD920HC'), adentro('hv', 'AD920HV')]);
  jest.mocked(eliminarEstadiaAction).mockResolvedValue({ ok: true });
  const onCobrar = jest.fn();
  render(<SalidaSinEntradaDialog plate="AD920HB" onClose={jest.fn()} onCobrar={onCobrar} />);
  expect(await screen.findByText('Hay 2 patentes parecidas en la playa')).toBeInTheDocument();
  fireEvent.click(await screen.findByRole('radio', { name: /Hasta 1 hora/ }));
  const registrar = screen.getByRole('button', { name: /Registrar y cobrar/ });
  // Una sigue y la otra no: hasta contestar las dos no se habilita.
  fireEvent.click(within(screen.getByRole('radiogroup', { name: '¿AD920HC sigue en la playa?' })).getByRole('radio', { name: 'Sigue en la playa' }));
  expect(registrar).toBeDisabled();
  fireEvent.click(within(screen.getByRole('radiogroup', { name: '¿AD920HV sigue en la playa?' })).getByRole('radio', { name: 'No está' }));
  // El borrado aparece solo para la que no está.
  expect(screen.getAllByRole('checkbox', { name: /Eliminar la entrada/ })).toHaveLength(1);
  fireEvent.click(screen.getByRole('checkbox', { name: /Eliminar la entrada de AD920HV/ }));
  await waitFor(() => expect(registrar).toBeEnabled());
  fireEvent.click(registrar);
  await waitFor(() => expect(createRegistrationByPlateAction).toHaveBeenCalled());
  expect(eliminarEstadiaAction).toHaveBeenCalledTimes(1);
  expect(eliminarEstadiaAction).toHaveBeenCalledWith('hv');
  // Las parecidas no se cobran desde acá: el cobro que se abre es el de la entrada nueva.
  await waitFor(() => expect(onCobrar).toHaveBeenCalledWith('nueva'));
  expect(onCobrar).not.toHaveBeenCalledWith('hc');
});

test('el operador no ve la opción de eliminar; si ya estaba adentro, cobra esa estadía', async () => {
  jest.mocked(createRegistrationByPlateAction).mockResolvedValue({ error: { code: 'DUPLICATE_ACTIVE_PLATE', message: 'Ya está', existingRegistrationId: 'existente' } } as never);
  const onCobrar = jest.fn();
  render(<SalidaSinEntradaDialog plate="AB123CD" parecida={{ id: 'mal', patente: 'AB123CB' }} onClose={jest.fn()} onCobrar={onCobrar} />);
  fireEvent.click(await screen.findByRole('radio', { name: /Hasta 1 hora/ }));
  fireEvent.click(await screen.findByRole('radio', { name: 'No está' }));
  expect(screen.queryByRole('checkbox', { name: /Eliminar/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Registrar y cobrar/ }));
  await waitFor(() => expect(onCobrar).toHaveBeenCalledWith('existente'));
  expect(corregirEntradaAction).not.toHaveBeenCalled();
});
