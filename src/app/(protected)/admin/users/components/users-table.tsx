'use client';

import { ColumnDef } from '@tanstack/react-table';
import { User } from '@/types/user.type';
import { DataTableShell } from '@/components/data-table-shell';
import { CreateUserDialog } from './create-user-dialog';

interface UsersTableProps {
  columns: ColumnDef<User>[];
  data: User[];
}

export function UsersTable({ columns, data }: UsersTableProps) {
  return (
    <DataTableShell
      data={data}
      columns={columns}
      filterColumn="email"
      filterPlaceholder="Filtrar por email..."
      pageSize={20}
      toolbarRight={<CreateUserDialog />}
      emptyMessage="No hay usuarios cargados."
      filterTour="users-filter"
      tableTour="users-table"
    />
  );
}
