import { esDeOtraVersion } from './version-app';

describe('esDeOtraVersion', () => {
  it('reconoce los errores de una página vieja después de un despliegue', () => {
    const chunk = new Error('Loading chunk 4521 failed. (error: https://app/_next/static/chunks/4521.js)');
    chunk.name = 'ChunkLoadError';
    expect(esDeOtraVersion(chunk)).toBe(true);
    expect(esDeOtraVersion(new Error('Failed to find Server Action "7f3a". This request might be from an older or newer deployment.'))).toBe(true);
    expect(esDeOtraVersion(new TypeError('Failed to fetch dynamically imported module: https://app/_next/x.js'))).toBe(true);
    expect(esDeOtraVersion(new TypeError('Importing a module script failed.'))).toBe(true);
  });

  it('no confunde un error de la aplicación con uno de versión', () => {
    expect(esDeOtraVersion(new TypeError("Cannot read properties of undefined (reading 'id')"))).toBe(false);
    expect(esDeOtraVersion(new Error('No se pudo cargar tu empresa.'))).toBe(false);
    expect(esDeOtraVersion(null)).toBe(false);
  });
});
