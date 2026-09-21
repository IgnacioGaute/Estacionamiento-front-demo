import {
  ArrowLeftFromLineIcon,
  ArrowRightFromLineIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { Table } from '@tanstack/react-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { Button } from './button';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

export function DataTablePagination<TData>({
  table,
}: DataTablePaginationProps<TData>) {
  return (
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-medium text-muted-foreground">Filas</span>
        <Select
          value={`${table.getState().pagination.pageSize}`}
          onValueChange={(value) => table.setPageSize(Number(value))}
        >
          <SelectTrigger className="h-7 w-[58px] rounded-md border-border bg-gm-surface-2 text-[12px] gm-mono">
            {/* El valor va como hijo, no como placeholder. Con <SelectValue> sin hijos, Radix
                portea el texto del ítem elegido hacia el trigger, y cuando la tabla se desmonta
                (cambiar de pestaña, navegar) React intenta remover ese nodo de un padre que ya
                no existe: «removeChild: The node to be removed is not a child of this node».
                Pasarle hijos activa valueNodeHasChildren y Radix no crea el portal. */}
            <SelectValue>{table.getState().pagination.pageSize}</SelectValue>
          </SelectTrigger>
          <SelectContent side="top" className="min-w-[58px]">
            {[5, 10, 20, 30, 50].map((pageSize) => (
              <SelectItem key={pageSize} value={`${pageSize}`} className="text-[12px]">
                {pageSize}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-[11px] gm-mono gm-tnum text-muted-foreground mr-1">
          {table.getState().pagination.pageIndex + 1}/{table.getPageCount()}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 hidden lg:inline-flex"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
        >
          <span className="sr-only">Ir a la primera página</span>
          <ArrowLeftFromLineIcon className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <span className="sr-only">Ir a la página anterior</span>
          <ChevronLeftIcon className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          <span className="sr-only">Ir a la página siguiente</span>
          <ChevronRightIcon className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 hidden lg:inline-flex"
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
        >
          <span className="sr-only">Ir a la última página</span>
          <ArrowRightFromLineIcon className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
