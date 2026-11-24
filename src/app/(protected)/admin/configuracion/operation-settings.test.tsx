/** @jest-environment jsdom */
import { configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
const opcion = (nombre: string) => screen.getByRole('radio', { name: new RegExp('^' + nombre) });
const guardar = () => fireEvent.click(screen.getByRole('button', { name: /^Guardar cambios/ }));
beforeEach(() => { jest.clearAllMocks(); jest.mocked(getCashConfigurationAction).mockResolvedValue({ configuration: { cajas, usuarios, hayTurnosAbiertos: false } }); jest.mocked(updateTicketScheduleAction).mockResolvedValue({ success: 'ok' }); jest.mocked(saveCajaAction).mockResolvedValue({ caja: cajas[0] }); });

test('activar es obligatorio; cada paso guarda lo suyo al continuar', async () => {
  render(<OperationSettings shiftsEnabled={false} />);
  expect(screen.getByRole('button', { name: /^Continuar/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /^Paso 2: Modo/ })).toBeDisabled();
  expect(opcion('No, sin turnos')).toHaveAttribute('aria-checked', 'true');
  fireEvent.click(opcion('Sí, con turnos'));
  await continuar();
  await waitFor(() => expect(updateTicketScheduleAction).toHaveBeenCalledWith({ shiftsEnabled: true }));
  const varias = await screen.findByRole('radio', { name: /^Varias personas a la vez/ });
  await waitFor(() => expect(varias).toBeEnabled());
  fireEvent.click(varias);
  await continuar();
  await waitFor(() => expect(updateTicketScheduleAction).toHaveBeenCalledWith({ multipleShiftsEnabled: true }));
  expect(await screen.findByLabelText('Agregar otra caja')).toBeInTheDocument();
});

test('al activarlos recién, cada paso queda listo cuando se lo pasa, no antes', async () => {
  render(<OperationSettings shiftsEnabled={false} />);
  fireEvent.click(opcion('Sí, con turnos'));
  await continuar();
  await screen.findByRole('radio', { name: /^Varias personas a la vez/ });
  expect(screen.getByRole('button', { name: 'Paso 1: Activar · Activos' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Paso 3: Cajas · Pendiente' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Paso 4: Sueldo · Pendiente' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Paso 1: Activar · Activos' }));
  expect(await screen.findByRole('button', { name: 'Paso 2: Modo · Una persona' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Paso 3: Cajas · Pendiente' })).toBeInTheDocument();
});

test('en el recorrido, los cambios de una caja se guardan al continuar', async () => {
  render(<OperationSettings shiftsEnabled={false} multipleShiftsEnabled />);
  fireEvent.click(opcion('Sí, con turnos'));
  await continuar();
  await screen.findByRole('radio', { name: /^Varias personas a la vez/ });
  await continuar();
  const fondo = await screen.findByRole('radiogroup', { name: 'Fondo de Entrada lateral' });
  fireEvent.click(within(fondo).getByRole('radio', { name: 'Sin fondo' }));
  await continuar();
  await waitFor(() => expect(saveCajaAction).toHaveBeenCalledWith({ nombre: 'Entrada lateral', activa: true, fondoObjetivo: 0 }, 'lateral'));
  expect(saveCajaAction).toHaveBeenCalledTimes(1);
  expect(await screen.findByRole('radio', { name: /^Sí, al terminar la jornada/ })).toBeInTheDocument();
});

test('un refresco con los mismos datos no apaga lo que se está activando', () => {
  const { rerender } = render(<OperationSettings shiftsEnabled={false} sueldosPorUsuario={[]} />);
  fireEvent.click(opcion('Sí, con turnos'));
  rerender(<OperationSettings shiftsEnabled={false} sueldosPorUsuario={[]} />);
  expect(opcion('Sí, con turnos')).toHaveAttribute('aria-checked', 'true');
});

test('si falla el guardado no avanza de paso', async () => {
  jest.mocked(updateTicketScheduleAction).mockResolvedValue({ error: { message: 'Prueba', code: 'TEST' } });
  render(<OperationSettings shiftsEnabled={false} />);
  fireEvent.click(opcion('Sí, con turnos'));
  await continuar();
  await waitFor(() => expect(updateTicketScheduleAction).toHaveBeenCalled());
  expect(screen.queryByRole('radio', { name: /^Varias personas a la vez/ })).not.toBeInTheDocument();
});

test('apagar turnos activos los desactiva y oculta el resto', async () => {
  render(<OperationSettings shiftsEnabled />);
  fireEvent.click(opcion('No, sin turnos'));
  expect(screen.getByText('Para desactivarlos, primero cerrá todos los turnos abiertos.')).toBeInTheDocument();
  expect(screen.queryByRole('radio', { name: /^Varias personas a la vez/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Desactivar turnos/ }));
  await waitFor(() => expect(updateTicketScheduleAction).toHaveBeenCalledWith({ shiftsEnabled: false, multipleShiftsEnabled: false }));
});

test('con una persona a la vez explica los relevos y no ofrece varias cajas', async () => {
  render(<OperationSettings shiftsEnabled />);
  expect(opcion('Una persona a la vez')).toHaveAttribute('aria-checked', 'true');
  expect(opcion('Una persona a la vez')).toHaveTextContent('Cuando uno cierra, el siguiente recibe el fondo que dejó.');
  expect(await screen.findByDisplayValue('Caja principal')).toBeInTheDocument();
  expect(screen.queryByDisplayValue('Entrada lateral')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Agregar otra caja')).not.toBeInTheDocument();
  expect(updateTicketScheduleAction).not.toHaveBeenCalled();
});

test('explica entradas separadas y cajón compartido, y permite agregar una caja con nombre', async () => {
  const view = render(<OperationSettings shiftsEnabled multipleShiftsEnabled />);
  expect(await screen.findByText('Dos personas, un mismo cajón')).toBeInTheDocument();
  expect(await screen.findByDisplayValue('Entrada lateral')).toBeInTheDocument();
  if (process.env.TURNOS_VISUAL_QA) writeFileSync('../estacionamiento-back-demo/.tmp/turnos-config.html', view.container.innerHTML);
  jest.mocked(saveCajaAction).mockResolvedValue({ error: 'Prueba' });
  fireEvent.change(screen.getByLabelText('Agregar otra caja'), { target: { value: 'Salida norte' } }); fireEvent.click(screen.getByRole('button', { name: 'Agregar caja' }));
  await waitFor(() => expect(saveCajaAction).toHaveBeenCalledWith({ nombre: 'Salida norte' }));
});

test('una caja puede quedar sin fondo: se guarda en $0', async () => {
  render(<OperationSettings shiftsEnabled />);
  const fondo = await screen.findByRole('radiogroup', { name: 'Fondo de Caja principal' });
  expect(within(fondo).getByRole('radio', { name: 'Dejar fondo' })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByLabelText('Importe del fondo de Caja principal')).toHaveValue('15.000');
  fireEvent.click(within(fondo).getByRole('radio', { name: 'Sin fondo' }));
  expect(screen.queryByLabelText('Importe del fondo de Caja principal')).not.toBeInTheDocument();
  expect(screen.getByText(/No se reserva efectivo/)).toBeInTheDocument();
  guardar();
  await waitFor(() => expect(saveCajaAction).toHaveBeenCalledWith({ nombre: 'Caja principal', activa: true, fondoObjetivo: 0 }, 'principal'));
  expect(updateTicketScheduleAction).not.toHaveBeenCalled();
});

test('una caja sin fondo aparece así y al dejar fondo propone $15.000', async () => {
  jest.mocked(getCashConfigurationAction).mockResolvedValue({ configuration: { cajas: [{ ...cajas[0], fondoObjetivo: 0 }], usuarios, hayTurnosAbiertos: false } });
  render(<OperationSettings shiftsEnabled />);
  const fondo = await screen.findByRole('radiogroup', { name: 'Fondo de Caja principal' });
  expect(within(fondo).getByRole('radio', { name: 'Sin fondo' })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByRole('status')).toHaveTextContent('Todo guardado');
  expect(screen.getByRole('button', { name: /^Guardar cambios/ })).toBeDisabled();
  fireEvent.click(within(fondo).getByRole('radio', { name: 'Dejar fondo' }));
  expect(screen.getByLabelText('Importe del fondo de Caja principal')).toHaveValue('15.000');
  expect(screen.getByRole('button', { name: /^Guardar cambios/ })).toBeEnabled();
  // Un fondo de $0 no vale: para eso está «Sin fondo».
  fireEvent.change(screen.getByLabelText('Importe del fondo de Caja principal'), { target: { value: '0' } });
  expect(screen.getByRole('button', { name: /^Guardar cambios/ })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('Revisá el nombre y el fondo de las cajas.');
});

test('el sueldo se carga por persona: vacío no retira', async () => {
  render(<OperationSettings shiftsEnabled />);
  expect(opcion('No se retira')).toHaveAttribute('aria-checked', 'true');
  fireEvent.click(opcion('Sí, al terminar la jornada'));
  const ana = await screen.findByLabelText('Sueldo por jornada: Ana Pérez');
  fireEvent.change(ana, { target: { value: '$ 25.000' } });
  expect(ana).toHaveValue('25.000');
  expect(screen.getByText(/Retira \$25\.000 por jornada/)).toBeInTheDocument();
  expect(screen.getByLabelText('Sueldo por jornada: Juan Pérez')).toHaveValue('');
  guardar();
  await waitFor(() => expect(updateTicketScheduleAction).toHaveBeenCalledWith({ sueldoAutomatico: true, sueldosPorUsuario: [{ usuarioId: 'ana', importe: 25000 }] }));
});

test('permite dejar sin sueldo a un usuario que lo tenía configurado', async () => {
  render(<OperationSettings shiftsEnabled sueldoAutomatico sueldosPorUsuario={[{ usuarioId: 'ana', importe: 25000 }]} />);
  const ana = await screen.findByLabelText('Sueldo por jornada: Ana Pérez');
  expect(ana).toHaveValue('25.000');
  fireEvent.change(ana, { target: { value: '' } });
  guardar();
  await waitFor(() => expect(updateTicketScheduleAction).toHaveBeenCalledWith({ sueldoAutomatico: true, sueldosPorUsuario: [] }));
});

test('si falla la carga de usuarios impide guardar el sueldo y permite reintentar', async () => {
  jest.mocked(getCashConfigurationAction).mockResolvedValue({ error: 'Sin conexión' });
  render(<OperationSettings shiftsEnabled sueldoAutomatico />);
  // Cajas y Sueldo están a la vista y las dos avisan que no se pudo cargar.
  expect((await screen.findAllByText('Sin conexión')).length).toBe(2);
  fireEvent.click(opcion('No se retira'));
  expect(screen.getByRole('button', { name: /^Guardar cambios/ })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('Reintentá cargar los usuarios');
  fireEvent.click(opcion('Sí, al terminar la jornada'));
  jest.mocked(getCashConfigurationAction).mockResolvedValue({ configuration: { cajas, usuarios, hayTurnosAbiertos: false } });
  fireEvent.click(screen.getAllByRole('button', { name: 'Reintentar' }).at(-1)!);
  expect(await screen.findByLabelText('Sueldo por jornada: Ana Pérez')).toBeInTheDocument();
});

test('los tickets por código de barras se guardan aparte', async () => {
  render(<BarcodeTicketsSetting enabled={false} />);
  fireEvent.click(screen.getByRole('switch', { name: 'Tickets por código de barras' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  await waitFor(() => expect(updateTicketScheduleAction).toHaveBeenCalledWith({ barcodeTicketsEnabled: true }));
});

test('con turnos activos se editan sin recorrido: las cuatro partes a la vista y un resumen arriba', async () => {
  render(<OperationSettings shiftsEnabled sueldoAutomatico={false} />);
  expect(screen.queryByRole('button', { name: /^Continuar/ })).not.toBeInTheDocument();
  expect(screen.queryByText(/Paso \d de 4/)).not.toBeInTheDocument();
  expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  const resumen = screen.getByLabelText('Así trabaja tu playa');
  for (const valor of ['Activos', 'Una persona a la vez', 'Sigue trabajando', 'Sin retiro']) expect(resumen).toHaveTextContent(valor);
  await waitFor(() => expect(resumen).toHaveTextContent('1 caja'));
  for (const pregunta of ['¿Trabajan con turnos?', '¿Cuántas personas cobran a la vez?', '¿Qué pasa a las 00:00 con un turno abierto?', '¿Se retira sueldo de la caja?']) expect(screen.getByRole('radiogroup', { name: pregunta })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Todo guardado');
  expect(screen.queryByText(/Pendiente/i)).not.toBeInTheDocument();
});

test('editando, todo se guarda junto con un solo botón', async () => {
  render(<OperationSettings shiftsEnabled />);
  fireEvent.click(opcion('Varias personas a la vez'));
  fireEvent.click(opcion('Se cierra todo'));
  fireEvent.click(opcion('Sí, al terminar la jornada'));
  fireEvent.change(await screen.findByLabelText('Sueldo por jornada: Juan Pérez'), { target: { value: '18000' } });
  const fondo = await screen.findByRole('radiogroup', { name: 'Fondo de Entrada lateral' });
  fireEvent.click(within(fondo).getByRole('radio', { name: 'Sin fondo' }));
  expect(screen.getByRole('status')).toHaveTextContent('Tenés cambios sin guardar');
  guardar();
  await waitFor(() => expect(saveCajaAction).toHaveBeenCalledWith({ nombre: 'Entrada lateral', activa: true, fondoObjetivo: 0 }, 'lateral'));
  expect(updateTicketScheduleAction).toHaveBeenCalledTimes(1);
  expect(updateTicketScheduleAction).toHaveBeenCalledWith({ multipleShiftsEnabled: true, continuarTurnoMedianoche: false, sueldoAutomatico: true, sueldosPorUsuario: [{ usuarioId: 'juan', importe: 18000 }] });
  expect(saveCajaAction).toHaveBeenCalledTimes(1);
});

test('«Descartar» vuelve a lo guardado', async () => {
  render(<OperationSettings shiftsEnabled />);
  await screen.findByDisplayValue('Caja principal');
  fireEvent.click(opcion('Se cierra todo'));
  fireEvent.click(screen.getByRole('button', { name: 'Descartar' }));
  expect(opcion('Sigue trabajando')).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByRole('status')).toHaveTextContent('Todo guardado');
  expect(screen.queryByRole('button', { name: 'Descartar' })).not.toBeInTheDocument();
});

test('con turnos abiertos no se puede cambiar cuántas personas cobran, pero sí la medianoche', async () => {
  jest.mocked(getCashConfigurationAction).mockResolvedValue({ configuration: { cajas, usuarios, hayTurnosAbiertos: true } });
  render(<OperationSettings shiftsEnabled />);
  expect(await screen.findByText('Para cambiar esto, primero cerrá todos los turnos abiertos.')).toBeInTheDocument();
  expect(opcion('Varias personas a la vez')).toBeDisabled();
  fireEvent.click(opcion('Se cierra todo'));
  guardar();
  // No manda el modo (cambiarlo exige no tener turnos abiertos): solo la medianoche.
  await waitFor(() => expect(updateTicketScheduleAction).toHaveBeenCalledWith({ continuarTurnoMedianoche: false }));
});

test('con la medianoche en «Se cierra todo», la muestra así y al continuar en el recorrido guarda el cambio', async () => {
  render(<OperationSettings shiftsEnabled={false} continuarTurnoMedianoche={false} />);
  fireEvent.click(opcion('Sí, con turnos'));
  await continuar();
  const cierra = await screen.findByRole('radio', { name: /^Se cierra todo/ });
  expect(cierra).toHaveAttribute('aria-checked', 'true');
  await waitFor(() => expect(cierra).toBeEnabled());
  fireEvent.click(opcion('Sigue trabajando'));
  await continuar();
  await waitFor(() => expect(updateTicketScheduleAction).toHaveBeenCalledWith({ continuarTurnoMedianoche: true }));
});

test('sin turnos, los pasos siguientes explican qué falta', () => {
  render(<OperationSettings shiftsEnabled={false} />);
  expect(screen.getByRole('button', { name: 'Paso 2: Modo · Requiere turnos' })).toBeDisabled();
});
