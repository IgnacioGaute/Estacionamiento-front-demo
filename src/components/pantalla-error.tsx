'use client';

// Lo que se ve cuando algo se rompe en el navegador, en vez del «Application error: a client-side
// exception has occurred» de Next sobre fondo negro. Si el error es de una página vieja después de
// un despliegue, recarga sola una vez; si no, explica y ofrece volver a cargar.
//
// Estilos en línea a propósito: global-error reemplaza al layout raíz y no hay garantía de que la
// hoja de estilos de la app siga cargada.

import { useEffect, useState } from 'react';
import { esDeOtraVersion, recargarUnaVez } from '@/lib/version-app';

const AMARILLO = '#F5C219';

export function PantallaError({ error }: { error: Error & { digest?: string } }) {
  const [recargando, setRecargando] = useState(false);

  useEffect(() => {
    console.error(error);
    if (esDeOtraVersion(error) && recargarUnaVez()) setRecargando(true);
  }, [error]);

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
          {recargando ? 'ACTUALIZANDO' : 'ALGO FALLÓ'}
        </p>
        <h1 style={{ margin: '10px 0 0', fontSize: 24, lineHeight: 1.2 }}>
          {recargando ? 'Cargando la versión nueva…' : 'La aplicación tuvo un error'}
        </h1>
        {!recargando && (
          <>
            <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.5, color: '#A59B8D' }}>
              Volvé a cargar para seguir. Lo que ya guardaste no se pierde.
            </p>
            <div style={{ display: 'grid', gap: 10, marginTop: 22 }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
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
                Volver a cargar
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
            {error.digest && (
              <p style={{ margin: '16px 0 0', fontSize: 11, color: '#7D7365' }}>Código para soporte: {error.digest}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
