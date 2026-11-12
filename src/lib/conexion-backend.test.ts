import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

// La consulta del contexto de playas quedó afuera de tenantFetch y en producción siguió saliendo
// por la URL pública aunque API_INTERNAL_URL estaba configurada. Esto revisa el código: todo
// archivo del servidor que arma una URL con NEXT_PUBLIC_API_URL y hace fetch tiene que usar
// tenantFetch (red privada, no-store, X-Request-Id, diagnóstico). El navegador y los sockets
// conservan la URL pública y nunca leen API_INTERNAL_URL.

const SRC = join(__dirname, '..');
const archivos = (dir: string): string[] =>
  readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return /\.(ts|tsx)$/.test(nombre) && !/\.test\.tsx?$/.test(nombre) ? [ruta] : [];
  });
const fuentes = archivos(SRC).map((ruta) => ({ ruta: relative(SRC, ruta).replace(/\\/g, '/'), texto: readFileSync(ruta, 'utf8') }));

// Los únicos que pueden tocar la URL de la API sin tenantFetch.
const PERMITIDOS = new Set([
  'lib/tenant-fetch.ts', // es el mecanismo
  'lib/tenant-socket-client.ts', // el socket del navegador usa la URL pública a propósito
]);

const usaApi = (texto: string) => /NEXT_PUBLIC_API_URL/.test(texto);
const haceFetch = (texto: string) => /\bfetch\s*\(/.test(texto);
const usaTenantFetch = (texto: string) => /import\s*\{\s*tenantFetch(\s+as\s+fetch)?\s*\}\s*from\s*['"]@\/lib\/tenant-fetch['"]/.test(texto);
const esDelCliente = (texto: string) => /^\s*['"]use client['"]/.test(texto);

test('hay archivos para revisar (la búsqueda no quedó vacía)', () => {
  expect(fuentes.length).toBeGreaterThan(100);
  expect(fuentes.filter((f) => usaApi(f.texto) && haceFetch(f.texto)).length).toBeGreaterThan(20);
});

test('toda consulta del servidor a la API pasa por tenantFetch', () => {
  const omitidas = fuentes
    .filter((f) => !PERMITIDOS.has(f.ruta) && usaApi(f.texto) && haceFetch(f.texto) && !esDelCliente(f.texto))
    .filter((f) => !usaTenantFetch(f.texto))
    .map((f) => f.ruta);
  expect(omitidas).toEqual([]);
});

test('quien importa tenantFetch como fetch no usa además el fetch global para la API', () => {
  const mezclados = fuentes
    .filter((f) => usaTenantFetch(f.texto) && /globalThis\.fetch\s*\(|window\.fetch\s*\(/.test(f.texto))
    .map((f) => f.ruta);
  expect(mezclados).toEqual([]);
});

test('el código del navegador no conoce la URL privada', () => {
  const filtrados = fuentes.filter((f) => esDelCliente(f.texto) && /API_INTERNAL_URL/.test(f.texto)).map((f) => f.ruta);
  expect(filtrados).toEqual([]);
});

test('el socket sigue usando la URL pública', () => {
  const socket = fuentes.find((f) => f.ruta === 'lib/tenant-socket-client.ts');
  expect(socket?.texto).toMatch(/NEXT_PUBLIC_API_URL/);
  expect(socket?.texto).not.toMatch(/API_INTERNAL_URL/);
});

test('tenantFetch solo cambia de destino del lado del servidor', () => {
  const tf = fuentes.find((f) => f.ruta === 'lib/tenant-fetch.ts')!.texto;
  expect(tf).toMatch(/typeof window === 'undefined'/);
  expect(tf).toMatch(/servidor && process\.env\.API_INTERNAL_URL/);
});
