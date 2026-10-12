/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { ConexionMercadoPago } from './conexion-mercadopago';
import type { EstadoMercadoPago } from '@/types/mercadopago.type';
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn(), push: jest.fn(), replace: jest.fn() }), useSearchParams: () => new URLSearchParams() }));
jest.mock('@/actions/mercadopago/mercadopago.action', () => ({ aceptarCondicionesMercadoPagoAction: jest.fn(), conectarMercadoPagoAction: jest.fn(), desconectarMercadoPagoAction: jest.fn(), iniciarConexionMercadoPagoAction: jest.fn() }));
jest.mock('./cajas-qr', () => ({ CajasQrConfig: () => <p>Configuración del QR</p> }));
jest.mock('./verificacion-alias', () => ({ VerificacionAliasConfig: () => <p>Configuración del alias</p> }));
jest.mock('@/components/comisiones-caja-form', () => ({ ComisionesCajaForm: () => <p>Formulario de comisiones</p> }));
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const condiciones = { version: 'v1', titulo: 'Qué puede hacer el sistema', puntos: ['Crear cobros con QR.'] };
const conectada: EstadoMercadoPago = { conectada: true, mpUserId: '1', nickname: 'PLAYA', email: null, estado: 'ACTIVA', expiraEl: '2027-01-01T00:00:00Z', conectadaEl: '2026-10-01T00:00:00Z', ultimoError: null, condicionesVigentes: condiciones, condicionesAceptadas: { version: 'v1', el: '2026-10-01T00:00:00Z', alDia: true } };
const continuar = () => fireEvent.click(screen.getByRole('button', { name: /^Continuar/ }));

test('sin la cuenta vinculada no se puede pasar a los pasos siguientes', () => {
  render(<ConexionMercadoPago inicial={{ conectada: false, condicionesVigentes: condiciones }} verificacionAlias={null} />);
  expect(screen.getByText('Todavía no hay una cuenta conectada')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^Continuar/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /^Paso 2: QR/ })).toBeDisabled();
});

test('con la cuenta activa, QR, alias y comisiones son pasos opcionales', async () => {
  const alias = { habilitada: true, activa: false, alias: null } as unknown as Parameters<typeof ConexionMercadoPago>[0]['verificacionAlias'];
  render(<ConexionMercadoPago inicial={conectada} verificacionAlias={alias} comisiones={{ conectada: true, tasas: { qrSaldo: 0, qrDebito: 0, qrCredito: 0, aliasSaldo: 0, aliasDebito: 0, aliasCredito: 0 }, referencia: { qrSaldo: 0.968, qrDebito: 1.6335, qrCredito: 7.2479, aliasSaldo: 0, aliasDebito: 0, aliasCredito: null } }} />);
  expect(screen.getByText('Cuenta conectada')).toBeInTheDocument();
  continuar();
  expect(await screen.findByText('Configuración del QR')).toBeInTheDocument();
  continuar();
  expect(await screen.findByText('Configuración del alias')).toBeInTheDocument();
  continuar();
  expect(await screen.findByText('Formulario de comisiones')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^Listo/ })).toBeEnabled();
});

test('con todo configurado, ningún paso aparece como pendiente', () => {
  const alias = { adicionalHabilitado: true, activa: true, alias: 'playa.mitre', cambiadaEl: null };
  const qr = { cuentaConectada: true, playas: [{ playaId: 'p1', nombre: 'Mitre', direccion: null, caja: { creadaEl: '2026-10-01T00:00:00Z', direccion: null } }] };
  const tasas = { qrSaldo: 0.968, qrDebito: 1.6335, qrCredito: 7.2479, aliasSaldo: 0, aliasDebito: 0, aliasCredito: null };
  render(<ConexionMercadoPago inicial={conectada} verificacionAlias={alias} cajasQr={qr} comisiones={{ conectada: true, tasas, referencia: tasas }} />);
  expect(screen.getByRole('button', { name: 'Paso 2: QR · Listo' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Paso 3: Alias · Activa' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Paso 4: Comisiones · Configuradas' })).toBeInTheDocument();
  expect(screen.queryByText(/Pendiente/i)).not.toBeInTheDocument();
});

test('muestra lo que falta configurar sin llamarlo pendiente', () => {
  const qr = { cuentaConectada: true, playas: [{ playaId: 'p1', nombre: 'Mitre', direccion: null, caja: { creadaEl: '2026-10-01T00:00:00Z', direccion: null } }, { playaId: 'p2', nombre: 'Colón', direccion: null, caja: null }] };
  render(<ConexionMercadoPago inicial={conectada} verificacionAlias={{ adicionalHabilitado: false, activa: false, alias: null, cambiadaEl: null }} cajasQr={qr} />);
  expect(screen.getByRole('button', { name: 'Paso 2: QR · 1 de 2 playas' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Paso 3: Alias · No incluida' })).toBeInTheDocument();
});
