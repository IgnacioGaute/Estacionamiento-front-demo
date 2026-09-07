'use client';

import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ColumnDef } from '@tanstack/react-table';

import { Customer } from '@/types/cutomer.type';
import { ParkingOwner } from '@/types/parking-owner.type';
import { RenterParkingType } from '@/types/renter-parking-type';
import { DataTableShell } from '@/components/data-table-shell';
import { CreatePrivateDialog } from './create-private-dialog';
import { CustomerInlineDetail } from '../../components/receipts/customer-inline-detail';
import { CustomerPageTour } from '../../components/customer-page-tour';

interface PrivatesTableProps {
  columns: (customersRenters: ParkingOwner[], renterParkingTypes: RenterParkingType[]) => ColumnDef<Customer>[];
  data: Customer[];
  customersRenters: ParkingOwner[];
  renterParkingTypes: RenterParkingType[];
}

export function PrivatesTable({ columns, data, customersRenters, renterParkingTypes }: PrivatesTableProps) {
  const searchParams = useSearchParams();
  const lastNameQuery = searchParams.get('lastName') || '';
  const session = useSession();
  const isAdmin = session.data?.user.role === 'ADMIN';

  return (
    <DataTableShell
      data={data}
      columns={columns(customersRenters, renterParkingTypes)}
      filterColumn="lastName"
      filterPlaceholder="Filtrar por apellido..."
      initialFilter={lastNameQuery}
      initialSort={[{ id: 'lastName', desc: false }]}
      toolbarRight={
        <div className="flex items-center gap-2">
          <CustomerPageTour entityLabel="inquilino de terceros" />
          {isAdmin && (
            <div data-tour="customer-create">
              <CreatePrivateDialog customersRenters={customersRenters} />
            </div>
          )}
        </div>
      }
      renderSubComponent={(row) => <CustomerInlineDetail customer={row.original} />}
    />
  );
}
