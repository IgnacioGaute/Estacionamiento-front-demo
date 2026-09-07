export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { getCustomers, getOwnersAvailableForRent, getRenterParkingTypes, findAllPendingReceipts } from '@/services/customers.service';
import { privateColumns } from './components/private-columns';
import { PrivatesTable } from './components/privates-table';
import { CUSTOMER_TYPE } from '@/types/cutomer.type';
import { PageHeader } from '@/components/page-header';
import { CustomerActionsBar } from '../components/customers/drop-menu-actions';

export default async function PrivatePage() {
  const customers = await getCustomers(CUSTOMER_TYPE[2]);
  const customersThirds = await getOwnersAvailableForRent();
  const renterParkingTypesData = await getRenterParkingTypes();
  const receiptsData = await findAllPendingReceipts(CUSTOMER_TYPE[2]);
  const receipts = Array.isArray(receiptsData) ? receiptsData : [];
  const count = customers?.length ?? 0;

  return (
    <div className="container mx-auto px-4 py-6 sm:p-8 max-w-7xl">
      <PageHeader
        breadcrumb={['Estacionamiento', 'Operación', 'Terceros']}
        title="Inquilinos de terceros"
        description={
          count > 0
            ? `${count} inquilinos de terceros registrados.`
            : 'Creá el primer inquilino de terceros para empezar a operar.'
        }
        actions={
          <CustomerActionsBar
            customers={customers || []}
            type={CUSTOMER_TYPE[2]}
            receipts={receipts}
          />
        }
      />

      <div className="mt-2">
        <PrivatesTable
          columns={privateColumns}
          data={customers || []}
          customersRenters={customersThirds || []}
          renterParkingTypes={renterParkingTypesData?.data || []}
        />
      </div>
    </div>
  );
}
