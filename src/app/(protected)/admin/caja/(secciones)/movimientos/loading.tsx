import { Cargando, EsqueletoSeccion, EsqueletoTabla, Hueso } from '@/components/esqueletos';

// Ingresos y gastos mientras carga: el título, el botón de nuevo movimiento y la tabla (fecha,
// descripción, medio y monto).
export default function Loading() {
  return (
    <Cargando texto="Cargando ingresos y gastos…" className="block space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3"><EsqueletoSeccion /><Hueso className="h-11 w-44 rounded-md sm:h-9" /></div>
      <EsqueletoTabla filas={6} columnas={[2, 4, 2, 2]} titulo={false} />
    </Cargando>
  );
}
