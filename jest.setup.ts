// Matchers de DOM para los tests de componentes: toBeInTheDocument, toHaveTextContent, etc.
import '@testing-library/jest-dom';

// jsdom no trae matchMedia ni ResizeObserver; el Stepper de React Bits (asistentes de
// configuración) los usa para animar y medir.
if (typeof window !== 'undefined') {
  window.matchMedia ??= ((query: string) => ({ matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false })) as typeof window.matchMedia;
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
}
