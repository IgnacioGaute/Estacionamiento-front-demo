'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { ticketPrice } from '@/types/ticket-price';
import { UpdateTicketPriceDialog } from './update-ticket-price-dialog';
import { DeleteTicketPriceDialog } from './delete-ticket-price-dialog';

const timeTypeLabel: Record<string, string> = { DIA: 'Día', SEMANA: 'Semana', MES: 'Mes' };

const ars = (n: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n);

export const ticketPriceColumns: ColumnDef<ticketPrice>[] = [
  {
    accessorKey: 'vehicleType',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Vehículo" />,
    cell: ({ row }) => <Badge variant="default">{row.getValue('vehicleType')}</Badge>,
  },
  {
    accessorKey: 'ticketTimeType',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Duración" />,
    cell: ({ row }) => {
      const value = row.getValue('ticketTimeType') as string | null;
      return <span className="text-[13px] font-medium text-foreground">{value ? timeTypeLabel[value] ?? value : '—'}</span>;
    },
  },
  {
    accessorKey: 'ticketTimePrice',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Precio por unidad" />,
    cell: ({ row }) => (
      <span className="gm-display gm-tnum text-[13.5px] font-bold text-foreground">
        {ars(row.getValue('ticketTimePrice'))}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const item = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <span className="sr-only">Abrir acciones</span>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 border border-border bg-gm-surface p-1 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.7)]"
          >
            <DropdownMenuLabel className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Acciones
            </DropdownMenuLabel>
            <UpdateTicketPriceDialog ticketPrice={item} />
            <DeleteTicketPriceDialog ticketPrice={item} />
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
