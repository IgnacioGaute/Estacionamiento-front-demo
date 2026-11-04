import { DataLoading } from '@/components/ui/data-loading';

// Al pasar de una opción a otra sólo carga el contenido: el menú del layout queda en su lugar.
export default function Loading() {
  return <DataLoading label="Cargando…" />;
}
