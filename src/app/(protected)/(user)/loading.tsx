import { Cargando, EsqueletoEncabezado, EsqueletoTabla } from '@/components/esqueletos';

// Respaldo para las pantallas del operador sin esqueleto propio: encabezado y una tabla. Las que
// se usan (Entradas y salidas, Inquilinos, Avisos) tienen el suyo, con su forma. La animación del
// auto queda para el arranque de la app (app/loading.tsx).
export default function Loading() {
  return (
    <Cargando texto="Cargando…" className="block space-y-5">
      <EsqueletoEncabezado acciones={1} />
      <EsqueletoTabla filas={6} />
    </Cargando>
  );
}
