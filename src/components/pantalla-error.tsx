'use client';

// Lo que se ve cuando algo se rompe en el navegador, en vez del «Application error: a client-side
// exception has occurred» de Next sobre fondo negro. Si el error es de una página vieja después de
// un despliegue, recarga sola una vez; si no, explica y ofrece volver a cargar.
//
// Estilos en línea a propósito: global-error reemplaza al layout raíz y no hay garantía de que la
// hoja de estilos de la app siga cargada.

import { useEffect, useState } from 'react';
import { VERSION_APP, esDeOtraVersion, esDeRed, recargarUnaVez } from '@/lib/version-app';

// Manda el error al servidor del front (queda en sus logs como [error-cliente], ver
// app/api/errores). keepalive: si la pantalla recarga enseguida, el aviso igual sale. Si falla, no
// hay nada que hacer: la pantalla sigue mostrando el detalle para sacarle una foto.
function informar(error: Error & { digest?: string }) {
  try {
    void fetch('/api/errores', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: error.name,
        mensaje: error.message,
        digest: error.digest,
        pila: error.stack?.slice(0, 2500),
        ruta: window.location.pathname,
        version: VERSION_APP,
      }),
    }).catch(() => undefined);
  } catch {
    // Sin fetch o sin red: queda el detalle en pantalla.
  }
}

const AMARILLO = '#F5C219';

export function PantallaError({ error, reset }: { error: Error & { digest?: string }; reset?: () => void }) {
  const [recargando, setRecargando] = useState(false);
  const deRed = esDeRed(error);

  useEffect(() => {
    console.error(error);
    informar(error);
    if (esDeOtraVersion(error) && recargarUnaVez()) setRecargando(true);
  }, [error]);

  // Sin red no hay nada roto: se vuelve a dibujar la pantalla sola apenas hay conexión (un momento
  // después, para que la red termine de levantar), sin recargar ni perder lo que estaba abierto.
  useEffect(() => {
    if (!deRed || !reset) return;
    let espera: number | undefined;
    const reintentar = () => { espera = window.setTimeout(reset, 1500); };
    if (navigator.onLine) reintentar();
    else window.addEventListener('online', reintentar, { once: true });
    return () => { window.clearTimeout(espera); window.removeEventListener('online', reintentar); };
  }, [deRed, reset]);

  return (
    <div
      role="alert"
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        background: '#12100D',
        color: '#F2EDE3',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          padding: '28px 24px',
          borderRadius: 24,
          background: '#0B0A08',
          border: '1px solid rgba(255,255,255,0.07)',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', color: '#A59B8D' }}>
          {recargando ? 'ACTUALIZANDO' : deRed ? 'SIN CONEXIÓN' : 'ALGO FALLÓ'}
        </p>
        <h1 style={{ margin: '10px 0 0', fontSize: 24, lineHeight: 1.2 }}>
          {recargando ? 'Cargando la versión nueva…' : deRed ? 'Se cortó la conexión' : 'La aplicación tuvo un error'}
        </h1>
        {!recargando && (
          <>
            <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.5, color: '#A59B8D' }}>
              {deRed
                ? 'Vuelve sola apenas haya internet. Lo que ya guardaste no se pierde.'
                : 'Volvé a cargar para seguir. Lo que ya guardaste no se pierde.'}
            </p>
            <div style={{ display: 'grid', gap: 10, marginTop: 22 }}>
              <button
                type="button"
                onClick={() => (deRed && reset ? reset() : window.location.reload())}
                style={{
                  height: 50,
                  border: 0,
                  borderRadius: 14,
                  background: AMARILLO,
                  color: '#201204',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {deRed ? 'Reintentar' : 'Volver a cargar'}
              </button>
              <a
                href="/tickets"
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  height: 46,
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#F2EDE3',
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Ir a Entradas y salidas
              </a>
            </div>
            {/* Lo que el celular no deja ver de otra forma: con una foto de esto se sabe qué falló. */}
            <details style={{ marginTop: 18, textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', fontSize: 12.5, color: '#A59B8D', textAlign: 'center' }}>
                Ver detalle del error
              </summary>
              <pre
                style={{
                  margin: '10px 0 0',
                  padding: 12,
                  borderRadius: 12,
                  background: '#16130F',
                  border: '1px solid rgba(255,255,255,0.07)',
                  color: '#D9D1C3',
                  fontSize: 11.5,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: 220,
                  overflow: 'auto',
                }}
              >
                {[
                  `${error.name || 'Error'}: ${error.message || '(sin mensaje)'}`,
                  error.digest ? `Código: ${error.digest}` : null,
                  typeof window !== 'undefined' ? `Pantalla: ${window.location.pathname}` : null,
                  `Versión: ${VERSION_APP.slice(0, 7)}`,
                  `Hora: ${new Date().toLocaleString('es-AR')}`,
                ]
                  .filter(Boolean)
                  .join('\n')}
              </pre>
            </details>
          </>
        )}
      </div>
    </div>
  );
}
