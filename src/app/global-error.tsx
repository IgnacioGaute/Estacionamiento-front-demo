'use client';

import { PantallaError } from '@/components/pantalla-error';

// Si se rompe el propio layout raíz, Next lo reemplaza por esto: por eso trae su html y body.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="es">
      <body style={{ margin: 0 }}>
        <PantallaError error={error} />
      </body>
    </html>
  );
}
