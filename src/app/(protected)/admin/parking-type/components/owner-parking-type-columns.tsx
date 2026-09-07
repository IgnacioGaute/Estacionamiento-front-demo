'use client';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { OwnerParkingType } from '@/types/owner-parking-type';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { UpdateOwnerParkingTypeDialog } from './update-owner-parking-type-dialog';
import { DeleteOwnerParkingTypeDialog } from './delete-owner-parking-type-dialog';

export const ownerParkingTypeColumns: ColumnDef<OwnerParkingType>[] = [
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
            <UpdateOwnerParkingTypeDialog parkingType={parkingType} />
            <DeleteOwnerParkingTypeDialog parkingType={parkingType} />
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
];
