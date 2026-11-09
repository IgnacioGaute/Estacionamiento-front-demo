import { Cargando, EsqueletoEncabezado, EsqueletoTabla } from '@/components/esqueletos';

// Respaldo para las pantallas de administración sin esqueleto propio: encabezado y una tabla. Las
// que se usan tienen el suyo, con su forma. La animación del auto queda para el arranque de la app
// (app/loading.tsx).
export default function Loading() {
  return (
    <Cargando texto="Cargando…" className="container mx-auto block max-w-7xl space-y-5 px-4 py-6 sm:p-8">
      <EsqueletoEncabezado acciones={1} />
      <EsqueletoTabla filas={6} />
    </Cargando>
  );
}
