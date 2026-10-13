'use client';

import { PantallaError } from '@/components/pantalla-error';

// Cualquier error de una página o de su layout cae acá, dentro del layout raíz.
export default function ErrorDePagina({ error }: { error: Error & { digest?: string } }) {
  return <PantallaError error={error} />;
}
