import { EncabezadoSeccion } from '@/components/encabezado-seccion';
import { VehicleTypesCard } from '../../tickets/components/vehicle-types-card';

// Los tipos de vehículo que recibe la playa. No confundir con Vehículos del menú lateral, que es la
// planilla de entradas y salidas.
export default function TiposVehiculoPage() {
  return <>
    <EncabezadoSeccion title="Tipos de vehículo" description="Los activos aparecen al registrar una entrada. Pausar uno no afecta a los que ya están adentro." />
    <VehicleTypesCard sinEncabezado />
  </>;
}
