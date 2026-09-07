'use client';

import {
  ColumnDef,
  ColumnFiltersState,
  ExpandedState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Row,
  SortingState,
  Table as TanstackTable,
  useReactTable,
} from '@tanstack/react-table';
import { ReactNode, useState } from 'react';
import { Search, Inbox } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { DataTableViewOptions } from '@/components/ui/data-table-view-options';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface DataTableShellProps<TData, TValue> {
  data: TData[];
  columns: ColumnDef<TData, TValue>[];
  filterColumn?: string;
  filterPlaceholder?: string;
  initialFilter?: string;
  initialSort?: SortingState;
  toolbarRight?: ReactNode | ((table: TanstackTable<TData>) => ReactNode);
  pageSize?: number;
  emptyMessage?: string;
  className?: string;
  /** Contenido a mostrar en una fila extra debajo de la fila expandida. */
  renderSubComponent?: (row: Row<TData>) => ReactNode;
  /** data-tour opcionales, para que un PageTour pueda apuntar al filtro/tabla. */
  filterTour?: string;
  tableTour?: string;
}

export function DataTableShell<TData, TValue>({
  data,
  columns,
  filterColumn,
  filterPlaceholder = 'Filtrar...',
  initialFilter,
  initialSort = [],
  toolbarRight,
  pageSize = 10,
  emptyMessage = 'No hay resultados para mostrar.',
  className,
  renderSubComponent,
  filterTour,
  tableTour,
}: DataTableShellProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>(initialSort);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
    initialFilter && filterColumn
      ? [{ id: filterColumn, value: initialFilter }]
      : [],
  );
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onExpandedChange: setExpanded,
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => !!renderSubComponent,
    state: { columnFilters, sorting, expanded },
    initialState: { pagination: { pageSize }, sorting: initialSort },
    autoResetPageIndex: false,
  });

  return (
    <div className={cn('flex flex-col gap-3 pt-4', className)}>
      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {filterColumn && (
          <div className="relative w-full sm:max-w-xs" data-tour={filterTour}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder={filterPlaceholder}
              value={
                (table.getColumn(filterColumn)?.getFilterValue() as string) ?? ''
              }
              onChange={(e) =>
                table.getColumn(filterColumn)?.setFilterValue(e.target.value)
              }
              className="pl-9 h-8 text-[13px]"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 sm:ml-auto">
          <DataTableViewOptions table={table} />
          {typeof toolbarRight === 'function'
            ? toolbarRight(table)
            : toolbarRight}
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-lg border border-border" data-tour={tableTour}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="whitespace-nowrap">
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
                  <>
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="whitespace-nowrap">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                    {row.getIsExpanded() && renderSubComponent && (
                      <TableRow key={`${row.id}-expanded`} className="hover:bg-transparent">
                        <TableCell colSpan={row.getVisibleCells().length} className="p-0">
                          {renderSubComponent(row)}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={table.getVisibleFlatColumns().length}
                    className="h-28 text-center"
                  >
                    <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
                      <Inbox className="size-5 opacity-50" />
                      <span className="text-[12.5px]">{emptyMessage}</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <DataTablePagination table={table} />
    </div>
  );
}
