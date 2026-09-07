'use client';

import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ColumnDef } from '@tanstack/react-table';

import { OwnerParkingType } from '@/types/owner-parking-type';
import { Customer } from '@/types/cutomer.type';
import { DataTableShell } from '@/components/data-table-shell';
import { CreateOwnerDialog } from './create-owner-dialog';
import { CustomerInlineDetail } from '../../components/receipts/customer-inline-detail';
import { CustomerPageTour } from '../../components/customer-page-tour';

interface OwnersTableProps {
  columns: (ownerParkingTypes: OwnerParkingType[]) => ColumnDef<Customer>[];
  data: Customer[];
  ownerParkingTypes: OwnerParkingType[];
}

export function OwnersTable({ columns, data, ownerParkingTypes }: OwnersTableProps) {
  const searchParams = useSearchParams();
  const lastNameQuery = searchParams.get('lastName') || '';
  const session = useSession();
  const isAdmin = session.data?.user.role === 'ADMIN';

  return (
    <DataTableShell
      data={data}
      columns={columns(ownerParkingTypes)}
      filterColumn="lastName"
      filterPlaceholder="Filtrar por apellido..."
      initialFilter={lastNameQuery}
      initialSort={[{ id: 'lastName', desc: false }]}
      toolbarRight={
        <div className="flex items-center gap-2">
          <CustomerPageTour entityLabel="propietario" />
          {isAdmin && (
            <div data-tour="customer-create">
              <CreateOwnerDialog ownerParkingTypes={ownerParkingTypes} />
            </div>
          )}
        </div>
      }
      renderSubComponent={(row) => <CustomerInlineDetail customer={row.original} />}
    />
  );
}
