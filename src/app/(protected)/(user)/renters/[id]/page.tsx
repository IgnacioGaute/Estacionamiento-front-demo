export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { getCustomerById } from '@/services/customers.service';
import { CuentaCorriente } from '../components/cuenta/cuenta-corriente';

// La cuenta corriente de un inquilino. El estado de cuenta lo pide el componente (y lo refresca
// después de cada cobro o ajuste); acá se carga el cliente, que necesita el diálogo de edición.
// El operador no entra acá: desde la lista ve lo que debe y lo que pagó, y cobra (el backend
// tampoco le da el estado de cuenta).
export default async function CuentaInquilinoPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (user?.role?.toUpperCase() === 'USER') redirect('/renters');

  const { id } = await params;
  const customer = await getCustomerById(id);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 sm:p-8">
      <CuentaCorriente
        customerId={id}
        customer={customer}
      />
    </div>
  );
}
