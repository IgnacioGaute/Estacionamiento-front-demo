'use client';

import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { TicketPriceBracket } from '@/types/ticket-price-bracket.type';
import { UpdateTicketPriceBracketDialog } from './update-ticket-price-bracket-dialog';
import { DeleteTicketPriceBracketDialog } from './delete-ticket-price-bracket-dialog';
import { formatMinutesLabel, formatRecurringUnitLabel } from '@/utils/ticket-price-bracket.utils';

export const ticketPriceBracketColumns: ColumnDef<TicketPriceBracket>[] = [
  {
    accessorKey: 'label',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Franja" />,
    cell: ({ row }) => <div className="min-w-[120px] text-sm font-medium">{row.getValue('label')}</div>,
  },
  {
    accessorKey: 'uptoMinutes',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Duración" />,
    cell: ({ row }) => (
      <div className="min-w-[120px] text-sm">{formatMinutesLabel(row.getValue('uptoMinutes'))}</div>
    ),
  },
  {
    accessorKey: 'vehicleType',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de Vehículo" />,
    cell: ({ row }) => <div className="min-w-[100px] text-sm">{row.getValue('vehicleType')}</div>,
  },
  {
    accessorKey: 'ticketDayType',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Horario" />,
    cell: ({ row }) => {
      const value = row.getValue('ticketDayType') as string | null;
      return (
        <div className="min-w-[80px] text-sm">
          {value === 'DAY' ? 'Día' : value === 'NIGHT' ? 'Noche' : 'Cualquiera'}
        </div>
      );
    },
  },
  {
    accessorKey: 'price',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Precio" />,
    cell: ({ row }) => {
      const recurringUnitMinutes = row.original.recurringUnitMinutes;
      return (
        <div className="min-w-[80px] text-sm">
          $ {row.getValue('price')}
          {recurringUnitMinutes && (
            <span className="text-muted-foreground"> {formatRecurringUnitLabel(recurringUnitMinutes)}</span>
          )}
        </div>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const bracket = row.original;

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
            <UpdateTicketPriceBracketDialog bracket={bracket} />
            <DeleteTicketPriceBracketDialog bracket={bracket} />
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
