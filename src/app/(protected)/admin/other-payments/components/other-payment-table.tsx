'use client';

import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { DataTableViewOptions } from '@/components/ui/data-table-view-options';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { CreateOtherPaymentDialog } from './create-other-payment-dialog';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function ExpenseTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]); // 👈 si el usuario cambia el orden, se actualiza
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      columnFilters,
      sorting,
    },
    initialState: {
      sorting: [
        {
          id: 'dateNow', // 👈 el nombre de la columna que representa la fecha
          desc: true,    // 👈 orden descendente (últimos primero)
        },
      ],
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="flex flex-col space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Input
          data-tour="varios-filter"
          placeholder="Filtrar por descripcion..."
          value={(table.getColumn('description')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('description')?.setFilterValue(event.target.value)
          }
          className="w-full sm:max-w-sm rounded-xl bg-secondary border-white"
        />

        <div className="flex items-center gap-2">
          <CreateOtherPaymentDialog />
          <DataTableViewOptions table={table} />
        </div>
      </div>
      <ScrollArea className="rounded-xl border bg-background" data-tour="varios-table">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="first:pl-4 last:pr-4">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="first:pl-4 last:pr-4">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No hay resultados para mostrar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <DataTablePagination table={table} />
    </div>
  );
}
