export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { getCustomerById } from '@/services/customers.service';
import { CuentaCorriente } from '../components/cuenta/cuenta-corriente';

// La cuenta corriente de un inquilino. El estado de cuenta lo pide el componente (y lo refresca
// después de cada cobro o ajuste); acá se carga el cliente, que necesita el diálogo de edición.
export default async function CuentaInquilinoPage({ params }: { params: Promise<{ id: string }> }) {
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
