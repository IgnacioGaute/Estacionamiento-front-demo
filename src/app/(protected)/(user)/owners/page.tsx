export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { getCustomers, getOwnerParkingTypes, findAllPendingReceipts } from '@/services/customers.service';
import { OwnersTable } from './components/owners-table';
import { OwnerColumns } from './components/owner-columns';
import { CUSTOMER_TYPE } from '@/types/cutomer.type';
import { PageHeader } from '@/components/page-header';
import { CustomerActionsBar } from '../components/customers/drop-menu-actions';

export default async function OwnerPage() {
  const customers = await getCustomers(CUSTOMER_TYPE[0]);
  const ownerParkingTypes = await getOwnerParkingTypes();
  const receiptsData = await findAllPendingReceipts(CUSTOMER_TYPE[0]);
  const receipts = Array.isArray(receiptsData) ? receiptsData : [];
  const count = customers?.length ?? 0;

  return (
    <div className="container mx-auto px-4 py-6 sm:p-8 max-w-7xl">
      <PageHeader
        breadcrumb={['Estacionamiento', 'Operación', 'Propietarios']}
        title="Propietarios"
        description={
          count > 0
            ? `${count} propietarios registrados.`
            : 'Creá el primer propietario para empezar a operar.'
        }
        actions={
          <CustomerActionsBar
            customers={customers || []}
            type={CUSTOMER_TYPE[0]}
            receipts={receipts}
          />
        }
      />

      <div className="mt-2">
        <OwnersTable
          columns={OwnerColumns}
          data={customers || []}
          ownerParkingTypes={ownerParkingTypes?.data || []}
        />
      </div>
    </div>
  );
}
