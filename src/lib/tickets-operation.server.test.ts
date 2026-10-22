import { getOperationUpdatesAction } from '@/actions/tickets/operation-updates.action';
import { readTicketsOperation } from './tickets-operation.server';
import { modalidadActual } from './modalidad.server';
import { getTicketRegistrations, getTickets, getTicketPriceBrackets, getTicketSchedule, getTicketsRegistrationForDay } from '@/services/tickets.service';
jest.mock('./modalidad.server', () => ({ modalidadActual: jest.fn() }));
jest.mock('@/auth', () => ({ auth: jest.fn(async () => ({ user: { id: 'user' }, token: 'token' })) }));
jest.mock('@/services/tickets.service', () => ({ getTicketRegistrations: jest.fn(), getTickets: jest.fn(), getTicketPriceBrackets: jest.fn(), getTicketSchedule: jest.fn(), getTicketsRegistrationForDay: jest.fn() }));
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(modalidadActual).mockResolvedValue('CON_COBRO');
  jest.mocked(getTicketRegistrations).mockResolvedValue([]);
  jest.mocked(getTickets).mockResolvedValue({ data: [] } as never);
  jest.mocked(getTicketPriceBrackets).mockResolvedValue([]);
  jest.mocked(getTicketSchedule).mockResolvedValue({ shiftsEnabled: false } as never);
  jest.mocked(getTicketsRegistrationForDay).mockResolvedValue([]);
});
test('el control sin cambios devuelve solo huellas; un cambio remoto de configuración trae solo esa parte', async () => {
  const initial = await readTicketsOperation();
  const unchanged = await getOperationUpdatesAction(initial.revisions);
  expect(unchanged.changes).toEqual({});
  jest.mocked(getTicketSchedule).mockResolvedValue({ shiftsEnabled: true } as never);
  const updated = await getOperationUpdatesAction(initial.revisions);
  expect(updated.changes).toEqual({ schedule: { shiftsEnabled: true } });
  expect(getTicketRegistrations).toHaveBeenCalledTimes(3);
  expect(updated.revisions?.initialRegistrations).toBe(initial.revisions.initialRegistrations);
});
test('un fallo de red conserva los datos del cliente y no devuelve una colección vacía', async () => {
  jest.mocked(getTicketRegistrations).mockRejectedValue(new Error('Sin conexión'));
  expect(await getOperationUpdatesAction()).toEqual({ error: 'No se pudo actualizar la operación.' });
});
test('una revocación obliga a volver a validar la pantalla protegida', async () => {
  jest.mocked(getTicketRegistrations).mockRejectedValue(Object.assign(new Error('Acceso revocado'), { status: 403 }));
  expect(await getOperationUpdatesAction()).toEqual({ refreshAccess: true });
});
test('en gratuito conserva vehículos sin consultar tarifas ni estadías con cobro', async () => {
  jest.mocked(modalidadActual).mockResolvedValue('GRATUITO');
  expect((await readTicketsOperation()).data.priceBrackets).toEqual([]);
  expect(getTicketPriceBrackets).not.toHaveBeenCalled(); expect(getTicketsRegistrationForDay).not.toHaveBeenCalled();
});
