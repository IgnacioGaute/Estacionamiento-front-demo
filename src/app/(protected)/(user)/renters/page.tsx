export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { getCustomers, getOwnersAvailableForRent, getRenterParkingTypes, findAllPendingReceipts } from '@/services/customers.service';
import { RentersTable } from './components/renters-table';
import { renterColumns } from './components/renter-columns';
import { CUSTOMER_TYPE } from '@/types/cutomer.type';
import { PageHeader } from '@/components/page-header';
import { CustomerActionsBar } from '../components/customers/drop-menu-actions';

export default async function RenterPage() {
  const customers = await getCustomers(CUSTOMER_TYPE[1]);
  const customersRenters = await getOwnersAvailableForRent();
  const renterParkingTypesData = await getRenterParkingTypes();
  const receiptsData = await findAllPendingReceipts(CUSTOMER_TYPE[1]);
  const receipts = Array.isArray(receiptsData) ? receiptsData : [];
  const count = customers?.length ?? 0;

  return (
    <div className="container mx-auto px-4 py-6 sm:p-8 max-w-7xl">
      <PageHeader
        breadcrumb={['Estacionamiento', 'Operación', 'Inquilinos']}
        title="Inquilinos"
        description={
          count > 0
            ? `${count} inquilinos registrados.`
            : 'Creá el primer inquilino para empezar a operar.'
        }
        actions={
          <CustomerActionsBar
            customers={customers || []}
            type={CUSTOMER_TYPE[1]}
            receipts={receipts}
          />
        }
      />

      <div className="mt-2">
        <RentersTable
          columns={renterColumns}
          data={customers || []}
          customersRenters={customersRenters || []}
          renterParkingTypes={renterParkingTypesData?.data || []}
        />
      </div>
    </div>
  );
}
