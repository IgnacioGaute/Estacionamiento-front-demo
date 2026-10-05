/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { writeFileSync } from 'node:fs';
import { OperationSettings } from './operation-settings';
import { updateTicketScheduleAction } from '@/actions/tickets/update-ticket-schedule.action';
import { getCashConfigurationAction, saveCajaAction } from '@/actions/turnos/cajas.action';
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
jest.mock('@/actions/tickets/update-ticket-schedule.action', () => ({ updateTicketScheduleAction: jest.fn() }));
jest.mock('@/actions/turnos/cajas.action', () => ({ getCashConfigurationAction: jest.fn(), saveCajaAction: jest.fn() }));
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
const cajas = [{ id: 'principal', nombre: 'Caja principal', principal: true, activa: true }, { id: 'lateral', nombre: 'Entrada lateral', principal: false, activa: true }];
beforeAll(() => { global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver; });
beforeEach(() => { jest.clearAllMocks(); jest.mocked(getCashConfigurationAction).mockResolvedValue({ configuration: { cajas, hayTurnosAbiertos: false } }); jest.mocked(updateTicketScheduleAction).mockResolvedValue({ error: { message: 'Prueba', code: 'TEST' } }); });
test('el switch adicional requiere activar turnos y guardar ambas opciones', async () => {
  render(<OperationSettings shiftsEnabled={false} barcodeTicketsEnabled={false} />);
  expect(screen.getByRole('switch', { name: 'Permitir turnos múltiples' })).toBeDisabled();
  fireEvent.click(screen.getByRole('switch', { name: 'Activar turnos de caja' }));
  fireEvent.click(screen.getByRole('switch', { name: 'Permitir turnos múltiples' }));
  expect(await screen.findByLabelText('Agregar otra caja')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar configuración' }));
  await waitFor(() => expect(updateTicketScheduleAction).toHaveBeenCalledWith({ shiftsEnabled: true, multipleShiftsEnabled: true, barcodeTicketsEnabled: false }));
});
test('el modo simple explica los relevos y no ofrece varias cajas', async () => {
  render(<OperationSettings shiftsEnabled barcodeTicketsEnabled={false} />);
  expect(screen.getByText(/Modo simple: una sola caja/)).toBeInTheDocument();
  expect(await screen.findByDisplayValue('Caja principal')).toBeInTheDocument();
  expect(screen.queryByDisplayValue('Entrada lateral')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Agregar otra caja')).not.toBeInTheDocument();
});
test('explica entradas separadas y cajón compartido, y permite agregar una caja con nombre', async () => {
  const view = render(<OperationSettings shiftsEnabled multipleShiftsEnabled barcodeTicketsEnabled={false} />);
  expect(screen.getByText('Dos personas, un mismo cajón')).toBeInTheDocument();
  expect(await screen.findByDisplayValue('Entrada lateral')).toBeInTheDocument();
  if (process.env.TURNOS_VISUAL_QA) writeFileSync('../estacionamiento-back-demo/.tmp/turnos-config.html', view.container.innerHTML);
  jest.mocked(saveCajaAction).mockResolvedValue({ error: 'Prueba' });
  fireEvent.change(screen.getByLabelText('Agregar otra caja'), { target: { value: 'Salida norte' } }); fireEvent.click(screen.getByRole('button', { name: 'Agregar caja' }));
  await waitFor(() => expect(saveCajaAction).toHaveBeenCalledWith({ nombre: 'Salida norte' }));
});
