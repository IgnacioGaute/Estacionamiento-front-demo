'use client';

import { User } from '@/types/user.type';
import { DataTableShell } from '@/components/data-table-shell';
import { CreateUserDialog } from './create-user-dialog';
import { userColumns } from './user-columns';

interface UsersTableProps {
  assignments: Record<string, { id: string; nombre: string } | null> | null;
  data: User[];
}

export function UsersTable({ assignments, data }: UsersTableProps) {
  return (
    <DataTableShell
      data={data}
      columns={userColumns(assignments)}
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
