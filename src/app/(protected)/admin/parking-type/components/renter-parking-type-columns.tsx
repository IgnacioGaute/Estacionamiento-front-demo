'use client';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { RenterParkingType } from '@/types/renter-parking-type';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { UpdateRenterParkingTypeDialog } from './update-renter-parking-type-dialog';
import { DeleteRenterParkingTypeDialog } from './delete-renter-parking-type-dialog';

export const renterParkingTypeColumns: ColumnDef<RenterParkingType>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => <div className="min-w-[160px] text-sm">{row.getValue('name')}</div>,
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Precio" />,
    cell: ({ row }) => <div className="min-w-[100px] text-sm">{row.getValue('amount')}</div>,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const parkingType = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuLabel className="text-sm">Acciones</DropdownMenuLabel>
            <UpdateRenterParkingTypeDialog parkingType={parkingType} />
            <DeleteRenterParkingTypeDialog parkingType={parkingType} />
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
];
