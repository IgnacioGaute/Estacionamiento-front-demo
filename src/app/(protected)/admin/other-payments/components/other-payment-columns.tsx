'use client';

import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User } from '@/types/user.type';
import { ColumnDef } from '@tanstack/react-table';
import { BadgeCheckIcon, BadgeXIcon, MoreHorizontal } from 'lucide-react';
import { UpdateExpenseDailog } from './update-other-payment-dialog';
import { DeleteExpenseDialog } from './delete-other-payment-dialog';
import { OtherPayment } from '@/types/other-payment.type';

export const expenseColumns: ColumnDef<OtherPayment>[] = [
  {
    accessorKey: 'description',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Descipcion" />
    ),
    cell: ({ row }) => (
      <div className="min-w-[100px] text-sm">{row.getValue('description')}</div>
    ),
  },
    {
    accessorKey: 'price',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Monto" />
    ),
    cell: ({ row }) => (
      <div className="min-w-[100px] text-sm">{row.getValue('price')}</div>
    ),
  },

  {
    accessorKey: 'type',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tipo" />
    ),
    cell: ({ row }) => {
      const type = row.getValue('type');
      const displayType = type === 'EGRESOS' ? 'Egreso' : 'Ingreso';
      return <div className="min-w-[100px] text-sm">{displayType}</div>;
    },
  },  
  {
    accessorKey: 'paymentMethod',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Forma de pago" />
    ),
    cell: ({ row }) => {
      const method = row.getValue('paymentMethod');
      const displayMethod = method === 'TRANSFER' ? 'Transferencia' : 'Efectivo';
      return <div className="min-w-[100px] text-sm">{displayMethod}</div>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const expense = row.original;

      return  (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuLabel className="text-sm">Acciones</DropdownMenuLabel>
            <UpdateExpenseDailog expense={expense} />
            <DeleteExpenseDialog expense={expense} />
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
];
