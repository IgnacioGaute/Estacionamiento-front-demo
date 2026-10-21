export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { PlanillaVehiculosBody } from './planilla-vehiculos-body';

// Planilla operativa de vehículos: entradas, salidas y vehículos adentro, con permanencia y
// operador. Sin importes: sirve igual en playas con cobro y gratuitas. Es de administración
// (el middleware deja /admin solo al administrador).
export default function PlanillaVehiculosPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <PlanillaVehiculosBody />
    </div>
  );
}
