/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { activarCuentaAction, darDiasDeGraciaAction } from '@/actions/suscripciones/suscripciones.action';
import type { DetalleSuscripcion } from '@/types/suscripcion.type';
import type { EmpresaConDetalle } from '@/types/tenancy.type';
import { AccionDialog } from './plan-empresa';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
// Lo que no participa del diálogo y arrastra la autenticación del servidor.
jest.mock('./adicionales-empresa', () => ({ AdicionalesEmpresa: () => null }));
jest.mock('@/actions/suscripciones/suscripciones.action', () => ({
  activarCuentaAction: jest.fn(),
  anularPagoAction: jest.fn(),
  darDiasDeGraciaAction: jest.fn(),
  darDiasExtraAction: jest.fn(),
  editarSuscripcionAction: jest.fn(),
  getPeriodosAction: jest.fn(),
  getPlanesAction: jest.fn(),
  getSuscripcionAction: jest.fn(),
  registrarPagoAction: jest.fn(),
}));

// La cuenta de la captura: alta el 13/10, prueba de 18 días hasta el 30/10, sin pagos.
const detalle = {
  cuenta: {
    estado: 'EN_PRUEBA',
    alta: '2026-10-13',
    pruebaHasta: '2026-10-30',
    pagadoHasta: null,
    suspendeEl: null,
    proximoVencimiento: '2026-10-31',
    motivoSuspension: null,
    facturaPendiente: null,
    periodo: { codigo: 'MENSUAL', nombre: 'Mensual', meses: 1, descuento: 0 },
    importePeriodo: 70000,
    mensual: 70000,
  },
} as unknown as DetalleSuscripcion;
const empresa = { id: 'empresa', nombre: 'Playa Nuclear Estacionamiento' } as EmpresaConDetalle;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now: new Date('2026-10-20T15:00:00-03:00'), doNotFake: ['setTimeout', 'setInterval', 'queueMicrotask'] });
});
afterEach(() => jest.useRealTimers());

test('la prueba se puede cortar en un día exacto y se guardan los días que corresponden', async () => {
  jest.mocked(activarCuentaAction).mockResolvedValue({ data: detalle });
  render(<AccionDialog accion={{ tipo: 'alta' }} empresa={empresa} detalle={detalle} cerrar={jest.fn()} hecho={jest.fn()} />);

  // Arranca con la prueba que tiene hoy: 18 días, hasta el 30/10.
  expect(screen.getByLabelText('Días de prueba')).toHaveValue('18');
  fireEvent.click(screen.getByRole('button', { name: /30\/10\/2026/ }));
  const calendario = await screen.findByRole('dialog', { name: 'Prueba gratis hasta el' });
  fireEvent.click(within(calendario).getByRole('gridcell', { name: '24' }).querySelector('button') ?? within(calendario).getByText('24'));

  // Del 13 al 24 inclusive son 12 días: el resumen y el selector lo reflejan.
  await waitFor(() => expect(screen.getByLabelText('Días de prueba')).toHaveValue('12'));
  expect(screen.getByText(/Prueba gratis del/).textContent).toContain('24/10/2026');

  fireEvent.click(screen.getByRole('button', { name: /confirmar|guardar|dar de alta|cambiar/i }));
  await waitFor(() => expect(activarCuentaAction).toHaveBeenCalledWith('empresa', '2026-10-13', 12));
});

test('los días de gracia se suman al corte y avisan que lo que debe no cambia', async () => {
  jest.mocked(darDiasDeGraciaAction).mockResolvedValue({ data: detalle });
  const vencida = {
    cuenta: {
      ...detalle.cuenta,
      estado: 'VENCIDA',
      proximoVencimiento: '2026-10-15',
      suspendeEl: '2026-10-21',
      facturaPendiente: { importe: 40000 },
    },
  } as unknown as DetalleSuscripcion;
  render(<AccionDialog accion={{ tipo: 'diasGracia' }} empresa={empresa} detalle={vencida} cerrar={jest.fn()} hecho={jest.fn()} />);

  // Hoy es 20/10 y tenía acceso hasta hoy: con 5 días más llega al 25.
  fireEvent.click(screen.getByRole('button', { name: '+5' }));
  expect(screen.getByText(/No se suspende hasta el/).textContent).toContain('25/10/2026');
  expect(screen.getByText(/No se suspende hasta el/).textContent).toMatch(/\$\s?40\.000.*el importe no cambia/);

  // Sin motivo no se puede confirmar.
  const confirmar = screen.getByRole('button', { name: 'Confirmar' });
  expect(confirmar).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Paga el viernes' } });
  fireEvent.click(confirmar);
  await waitFor(() => expect(darDiasDeGraciaAction).toHaveBeenCalledWith('empresa', 5, 'Paga el viernes'));
});
