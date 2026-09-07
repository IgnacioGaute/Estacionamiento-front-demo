'use client';

import { useState } from 'react';
import { ColumnDef, SortingFn } from '@tanstack/react-table';
import { useSession } from 'next-auth/react';
import { Ban, MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import { Customer } from '@/types/cutomer.type';
import { ParkingOwner } from '@/types/parking-owner.type';
import { RenterParkingType } from '@/types/renter-parking-type';

import { UpdatePrivateDialog } from './update-private-dialog';
import { DeletePrivateDialog } from './delete-private-dialog';
import { SoftDeletePrivateDialog } from './soft-delete-private-dialog';
import { RestoredPrivateDialog } from './restored-private-dialog';
import { ViewCustomerRenterDialog } from '../../components/customers/view-customer-renter-dialog';
import { ExpandSummaryButton } from '../../components/receipts/expand-summary-button';

const customSort: SortingFn<Customer> = (rowA, rowB, columnId) => {
  if (rowA.original.deletedAt && !rowB.original.deletedAt) return 1;
  if (!rowA.original.deletedAt && rowB.original.deletedAt) return -1;
  const valueA = rowA.getValue(columnId) as string;
  const valueB = rowB.getValue(columnId) as string;
  return valueA.toLowerCase().localeCompare(valueB.toLowerCase());
};

const dimmed = (deleted: boolean | Date | null | undefined) =>
  deleted ? 'text-muted-foreground line-through opacity-60' : '';

export const privateColumns = (
  customerRenters: ParkingOwner[],
  renterParkingTypes: RenterParkingType[],
): ColumnDef<Customer>[] => [
  {
    accessorKey: 'lastName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Apellido" />
    ),
    cell: ({ row }) => (
      <div
        className={cn(
          'gm-display font-semibold text-[13px] tracking-[0.01em] text-foreground max-w-[220px] truncate',
          dimmed(row.original.deletedAt),
        )}
      >
        {row.original.lastName}
        {row.original.deletedAt && (
          <Badge variant="default" className="ml-2 align-middle">
            <Ban className="size-3" /> Baja
          </Badge>
        )}
      </div>
    ),
    sortingFn: customSort,
  },
  {
    accessorKey: 'firstName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nombre" />
    ),
    cell: ({ row }) => (
      <div className={cn('text-[13px] truncate', dimmed(row.original.deletedAt))}>
        {row.original.firstName}
      </div>
    ),
    sortingFn: customSort,
  },
  {
    accessorKey: 'numberOfVehicles',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Cocheras" />
    ),
    cell: ({ row }) => (
      <span
        className={cn(
          'gm-display gm-tnum inline-flex h-7 items-center justify-center rounded-md border border-border bg-gm-surface-2 px-2 text-[12px] font-bold text-foreground',
          dimmed(row.original.deletedAt),
        )}
      >
        {row.original.numberOfVehicles}
      </span>
    ),
    sortingFn: customSort,
  },
  {
    id: 'expand',
    header: () => (
      <div className="w-full text-right text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        Resumen
      </div>
    ),
    cell: ({ row }) => {
      if (row.original.deletedAt) return null;
      return (
        <div className="flex justify-end">
          <span data-tour="customer-expand" className="inline-flex">
            <ExpandSummaryButton
              isOpen={row.getIsExpanded()}
              onToggle={() => row.toggleExpanded()}
            />
          </span>
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: () => (
      <div className="w-full text-right text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        Acciones
      </div>
    ),
    cell: ({ row }) => {
      const customer = row.original;
      const [openDropdown, setOpenDropdown] = useState(false);
      const session = useSession();
      const isAdmin = session.data?.user.role === 'ADMIN';

      return (
        <div className="flex justify-end">
          <DropdownMenu open={openDropdown} onOpenChange={setOpenDropdown}>
            <DropdownMenuTrigger asChild>
              <Button data-tour="customer-actions" variant="ghost" size="icon" className="size-8">
                <span className="sr-only">Abrir acciones</span>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 border border-border bg-gm-surface p-1 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.7)]"
            >
              <DropdownMenuLabel className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Acciones
              </DropdownMenuLabel>
              <ViewCustomerRenterDialog customer={customer} />
              {isAdmin && (
                <>
                  <DropdownMenuSeparator className="bg-border" />
                  {customer.deletedAt === null ? (
                    <>
                      <UpdatePrivateDialog
                        customer={customer}
                        customersRenters={customerRenters}
                        renterParkingTypes={renterParkingTypes}
                      />
                      <SoftDeletePrivateDialog customer={customer} />
                    </>
                  ) : (
                    <>
                      <DeletePrivateDialog customer={customer} />
                      <RestoredPrivateDialog customer={customer} />
                    </>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
