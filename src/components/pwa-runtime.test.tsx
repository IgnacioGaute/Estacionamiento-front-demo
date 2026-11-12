/** @jest-environment jsdom */
// Una pantalla de un despliegue anterior: con un cobro o un formulario abiertos no se recarga sola;
// se avisa y se deja actualizar. Una acción de servidor rechazada por versión no se repite. Nada
// de esto borra el almacenamiento local ni las operaciones sin conexión.
import { act, render } from '@testing-library/react';
import { PwaRuntime } from './pwa-runtime';
import { recargarUnaVez } from '@/lib/version-app';
import { toast } from '@/lib/toast';
import { _reiniciarAvisoVersion } from '@/lib/aviso-version';

jest.mock('@/lib/version-app', () => ({ ...jest.requireActual('@/lib/version-app'), recargarUnaVez: jest.fn(() => true) }));
jest.mock('@/lib/toast', () => ({ toast: { warning: jest.fn() } }));
jest.mock('@/lib/pwa-install', () => ({ setInstallPrompt: jest.fn() }));

const mockFetch = jest.fn();
// jsdom no trae Response ni Headers: alcanza con lo que lee PwaRuntime.
const respuesta = (status: number, datos: unknown = null, cabeceras: Record<string, string> = {}) => ({ ok: status < 400, status, json: async () => datos, headers: { get: (k: string) => cabeceras[k.toLowerCase()] ?? null } });
const versionNueva = () => respuesta(200, { version: 'otra-version' });
const volver = async () => { await act(async () => { document.dispatchEvent(new Event('visibilitychange')); }); };
const avisos = () => jest.mocked(toast.warning).mock.calls;

beforeEach(() => {
  jest.clearAllMocks();
  _reiniciarAvisoVersion();
  document.body.innerHTML = '';
  window.fetch = mockFetch;
  mockFetch.mockReset();
  mockFetch.mockImplementation(async (url: string) => (String(url).startsWith('/api/version') ? versionNueva() : respuesta(204)));
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  localStorage.setItem('operaciones-offline', '["entrada pendiente"]');
});

test('sin nada a medio hacer, una versión nueva recarga sola (una vez)', async () => {
  render(<PwaRuntime />);
  await volver();
  expect(recargarUnaVez).toHaveBeenCalledTimes(1);
  expect(avisos()).toHaveLength(0);
});

test('con un cobro abierto no recarga: avisa y deja actualizar con un toque', async () => {
  const dialogo = document.createElement('div');
  dialogo.setAttribute('role', 'dialog');
  document.body.appendChild(dialogo);
  render(<PwaRuntime />);
  await volver();
  expect(recargarUnaVez).not.toHaveBeenCalled();
  expect(avisos()[0][0]).toBe('Hay una versión nueva de la aplicación');
  expect(avisos()[0][1]).toMatchObject({ duration: Infinity, action: { label: 'Actualizar' } });
});

test('con un campo en uso tampoco recarga', async () => {
  render(<><PwaRuntime /><input aria-label="Patente" /></>);
  (document.querySelector('input') as HTMLInputElement).focus();
  await volver();
  expect(recargarUnaVez).not.toHaveBeenCalled();
  expect(avisos()).toHaveLength(1);
});

test('si ya recargó hace un momento no entra en bucle: avisa', async () => {
  jest.mocked(recargarUnaVez).mockReturnValueOnce(false);
  render(<PwaRuntime />);
  await volver();
  expect(avisos()[0][0]).toBe('Hay una versión nueva de la aplicación');
});

test('una acción de servidor de otra versión: avisa que no se realizó y no la repite ni recarga', async () => {
  mockFetch.mockImplementation(async () => respuesta(404, null, { 'x-nextjs-action-not-found': '1' }));
  render(<PwaRuntime />);
  // Así llama Next a una acción de servidor (cualquier formulario o selector).
  await act(async () => { await window.fetch('/tickets', { method: 'POST', headers: { 'Next-Action': 'abc123' }, body: '[]' }); });
  expect(avisos()[0][0]).toBe('Esta pantalla es de una versión anterior');
  expect(String(avisos()[0][1]?.description)).toMatch(/no se realizó/);
  expect(recargarUnaVez).not.toHaveBeenCalled();
  const acciones = mockFetch.mock.calls.filter(([url]) => url === '/tickets');
  expect(acciones).toHaveLength(1);
  // Se informa a los logs del front con la categoría version.
  const informe = mockFetch.mock.calls.find(([url]) => url === '/api/errores');
  expect(JSON.parse(informe![1].body)).toMatchObject({ categoria: 'version', ruta: '/' });
});

test('un módulo de la versión anterior pedido desde un manejador también avisa', async () => {
  render(<PwaRuntime />);
  const error = new Error('Loading chunk 77 failed.');
  error.name = 'ChunkLoadError';
  await act(async () => {
    const evento = new Event('unhandledrejection') as PromiseRejectionEvent;
    Object.defineProperty(evento, 'reason', { value: error });
    window.dispatchEvent(evento);
  });
  expect(avisos()[0][0]).toBe('Esta pantalla es de una versión anterior');
});

test('el aviso no se repite en cada consulta y nada borra las operaciones sin conexión', async () => {
  const dialogo = document.createElement('div');
  dialogo.setAttribute('role', 'alertdialog');
  document.body.appendChild(dialogo);
  render(<PwaRuntime />);
  await volver();
  await volver();
  expect(avisos()).toHaveLength(1);
  expect(localStorage.getItem('operaciones-offline')).toBe('["entrada pendiente"]');
});

test('al desmontarse devuelve el fetch original', () => {
  const original = window.fetch;
  const { unmount } = render(<PwaRuntime />);
  expect(window.fetch).not.toBe(original);
  unmount();
  expect(window.fetch).toBe(original);
});
