import { EsqueletoEncabezado } from '@/components/esqueletos';
import { TarifasPantallaCargando } from './cargando';

// Tarifas mientras carga, con el mismo contenedor que la página.
export default function Loading() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      <EsqueletoEncabezado />
      <TarifasPantallaCargando />
    </div>
  );
}
