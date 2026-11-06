import { Column } from '@tanstack/react-table';

import { cn } from '@/lib/utils';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDown,
  EyeOffIcon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
} from './dropdown-menu';
import { Button } from './button';

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <div className={cn('flex items-center', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-7 gap-1 px-2 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground hover:text-foreground data-[state=open]:text-foreground"
          >
            {title}
            {column.getIsSorted() === 'desc' ? (
              <ArrowDownIcon className="size-3" />
            ) : column.getIsSorted() === 'asc' ? (
              <ArrowUpIcon className="size-3" />
            ) : (
              <ChevronsUpDown className="size-3 opacity-50" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[120px]">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)} className="gap-2 text-[13px]">
            <ArrowUpIcon className="size-3.5 text-muted-foreground" />
            Ascendente
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)} className="gap-2 text-[13px]">
            <ArrowDownIcon className="size-3.5 text-muted-foreground" />
            Descendente
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => column.toggleVisibility(false)} className="gap-2 text-[13px]">
            <EyeOffIcon className="size-3.5 text-muted-foreground" />
            Ocultar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
