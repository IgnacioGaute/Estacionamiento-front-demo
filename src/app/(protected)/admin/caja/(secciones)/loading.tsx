import { Cargando, EsqueletoFilas, EsqueletoSeccion } from '@/components/esqueletos';

// Al pasar de una opción a otra sólo carga el contenido: el título y la fila de páginas del layout
// quedan en su lugar. Turnos e Ingresos y gastos tienen su propio esqueleto; este es el de respaldo.
export default function Loading() {
  return <Cargando texto="Cargando…" className="block space-y-5"><EsqueletoSeccion /><EsqueletoFilas filas={5} /></Cargando>;
}
