/** @jest-environment jsdom */
import { configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { writeFileSync } from 'node:fs';
import { BarcodeTicketsSetting, OperationSettings } from './operation-settings';
import { updateTicketScheduleAction } from '@/actions/tickets/update-ticket-schedule.action';
import { getCashConfigurationAction, saveCajaAction } from '@/actions/turnos/cajas.action';
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }) }));
jest.mock('@/actions/tickets/update-ticket-schedule.action', () => ({ updateTicketScheduleAction: jest.fn() }));
jest.mock('@/actions/turnos/cajas.action', () => ({ getCashConfigurationAction: jest.fn(), saveCajaAction: jest.fn() }));
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
const cajas = [{ id: 'principal', nombre: 'Caja principal', principal: true, activa: true }, { id: 'lateral', nombre: 'Entrada lateral', principal: false, activa: true }];
const usuarios = [{ id: 'ana', firstName: 'Ana', lastName: 'Pérez', username: 'ana' }, { id: 'juan', firstName: 'Juan', lastName: 'Pérez', username: 'juan' }];
// Cada paso guarda antes de avanzar: con la suite completa corriendo en paralelo, 1 s no alcanza.
configure({ asyncUtilTimeout: 4000 });
// Después de guardar, el botón dice «Guardando…» hasta que termina: se espera a que vuelva a Continuar.
const continuar = async () => fireEvent.click(await screen.findByRole('button', { name: /^Continuar/ }));
beforeEach(() => { jest.clearAllMocks(); jest.mocked(getCashConfigurationAction).mockResolvedValue({ configuration: { cajas, usuarios, hayTurnosAbiertos: false } }); jest.mocked(updateTicketScheduleAction).mockResolvedValue({ success: 'ok' }); });

test('activar es obligatorio; cada paso guarda lo suyo al continuar', async () => {
  render(<OperationSettings shiftsEnabled={false} />);
  expect(screen.getByRole('button', { name: /^Continuar/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /^Paso 2: Modo/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('switch', { name: 'Activar turnos de caja' }));
  await continuar();
  await waitFor(() => expect(updateTicketScheduleAction).toHaveBeenCalledWith({ shiftsEnabled: true }));
  const multiple = await screen.findByRole('switch', { name: 'Permitir turnos múltiples' });
  await waitFor(() => expect(multiple).toBeEnabled());
  fireEvent.click(multiple);
  await continuar();
  await waitFor(() => expect(updateTicketScheduleAction).toHaveBeenCalledWith({ multipleShiftsEnabled: true }));
  expect(await screen.findByLabelText('Agregar otra caja')).toBeInTheDocument();
});

test('si falla el guardado no avanza de paso', async () => {
  jest.mocked(updateTicketScheduleAction).mockResolvedValue({ error: { message: 'Prueba', code: 'TEST' } });
  render(<OperationSettings shiftsEnabled={false} />);
  fireEvent.click(screen.getByRole('switch', { name: 'Activar turnos de caja' }));
  await continuar();
  await waitFor(() => expect(updateTicketScheduleAction).toHaveBeenCalled());
  expect(screen.queryByRole('switch', { name: 'Permitir turnos múltiples' })).not.toBeInTheDocument();
});

test('apagar turnos activos los desactiva sin pasar a los pasos siguientes', async () => {
  render(<OperationSettings shiftsEnabled />);
  fireEvent.click(screen.getByRole('switch', { name: 'Activar turnos de caja' }));
  fireEvent.click(screen.getByRole('button', { name: /^Desactivar turnos/ }));
  await waitFor(() => expect(updateTicketScheduleAction).toHaveBeenCalledWith({ shiftsEnabled: false, multipleShiftsEnabled: false }));
});

test('el modo simple explica los relevos y no ofrece varias cajas', async () => {
  render(<OperationSettings shiftsEnabled />);
  await continuar();
  expect(await screen.findByText(/Modo simple: una sola caja/)).toBeInTheDocument();
  await continuar();
  expect(await screen.findByDisplayValue('Caja principal')).toBeInTheDocument();
  expect(screen.queryByDisplayValue('Entrada lateral')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Agregar otra caja')).not.toBeInTheDocument();
  expect(updateTicketScheduleAction).not.toHaveBeenCalled();
});

test('explica entradas separadas y cajón compartido, y permite agregar una caja con nombre', async () => {
  const view = render(<OperationSettings shiftsEnabled multipleShiftsEnabled />);
  await continuar();
  expect(await screen.findByText('Dos personas, un mismo cajón')).toBeInTheDocument();
  await continuar();
  expect(await screen.findByDisplayValue('Entrada lateral')).toBeInTheDocument();
  if (process.env.TURNOS_VISUAL_QA) writeFileSync('../estacionamiento-back-demo/.tmp/turnos-config.html', view.container.innerHTML);
  jest.mocked(saveCajaAction).mockResolvedValue({ error: 'Prueba' });
  fireEvent.change(screen.getByLabelText('Agregar otra caja'), { target: { value: 'Salida norte' } }); fireEvent.click(screen.getByRole('button', { name: 'Agregar caja' }));
  await waitFor(() => expect(saveCajaAction).toHaveBeenCalledWith({ nombre: 'Salida norte' }));
});

test('el sueldo se guarda en el último paso', async () => {
  render(<OperationSettings shiftsEnabled />);
  fireEvent.click(screen.getByRole('button', { name: /^Paso 4: Sueldo/ }));
  fireEvent.click(await screen.findByRole('switch', { name: 'Retirar sueldo de la caja automáticamente' }));
  fireEvent.click(await screen.findByRole('switch', { name: 'Retira sueldo: Ana Pérez' }));
  expect(screen.getByRole('button', { name: /^Guardar/ })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Importe por jornada: Ana Pérez'), { target: { value: '25000' } });
  expect(screen.getByRole('switch', { name: 'Retira sueldo: Juan Pérez' })).not.toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: /^Guardar/ }));
  await waitFor(() => expect(updateTicketScheduleAction).toHaveBeenCalledWith({ sueldoAutomatico: true, sueldosPorUsuario: [{ usuarioId: 'ana', importe: 25000 }] }));
});

test('permite dejar sin sueldo a un usuario que lo tenía configurado', async () => {
  render(<OperationSettings shiftsEnabled sueldoAutomatico sueldosPorUsuario={[{ usuarioId: 'ana', importe: 25000 }]} />);
  fireEvent.click(screen.getByRole('button', { name: /^Paso 4: Sueldo/ }));
  fireEvent.click(await screen.findByRole('switch', { name: 'Retira sueldo: Ana Pérez' }));
  fireEvent.click(screen.getByRole('button', { name: /^Guardar/ }));
  await waitFor(() => expect(updateTicketScheduleAction).toHaveBeenCalledWith({ sueldoAutomatico: true, sueldosPorUsuario: [] }));
});

test('si falla la carga de usuarios impide guardar y permite reintentar', async () => {
  jest.mocked(getCashConfigurationAction).mockResolvedValue({ error: 'Sin conexión' });
  render(<OperationSettings shiftsEnabled sueldoAutomatico />);
  fireEvent.click(screen.getByRole('button', { name: /^Paso 4: Sueldo/ }));
  expect(await screen.findByText('Sin conexión')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^Listo/ })).toBeDisabled();
  jest.mocked(getCashConfigurationAction).mockResolvedValue({ configuration: { cajas, usuarios, hayTurnosAbiertos: false } });
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByRole('switch', { name: 'Retira sueldo: Ana Pérez' })).toBeInTheDocument();
});

test('los tickets por código de barras se guardan aparte', async () => {
  render(<BarcodeTicketsSetting enabled={false} />);
  fireEvent.click(screen.getByRole('switch', { name: 'Tickets por código de barras' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  await waitFor(() => expect(updateTicketScheduleAction).toHaveBeenCalledWith({ barcodeTicketsEnabled: true }));
});

test('con turnos activos, las opciones apagadas no aparecen como pendientes', () => {
  render(<OperationSettings shiftsEnabled sueldoAutomatico={false} />);
  expect(screen.getByRole('button', { name: 'Paso 2: Modo · Simple' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Paso 3: Cajas · Caja principal' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Paso 4: Sueldo · Sin retiro' })).toBeInTheDocument();
  expect(screen.queryByText(/Pendiente/i)).not.toBeInTheDocument();
});

test('sin turnos, los pasos siguientes explican qué falta', () => {
  render(<OperationSettings shiftsEnabled={false} />);
  expect(screen.getByRole('button', { name: 'Paso 2: Modo · Requiere turnos' })).toBeDisabled();
});
