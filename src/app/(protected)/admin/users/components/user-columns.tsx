"use client";

import { AssignPlayaDialog } from "./assign-playa-dialog";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, User as UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User } from "@/types/user.type";
import { UpdateUserDailog } from "./update-user-dialog";
import { DeleteUserDialog } from "./delete-user-dialog";
import { RolAvatar } from "@/components/rol-avatar";

export const userColumns = (assignments: Record<string, { id: string; nombre: string } | null> | null): ColumnDef<User>[] => [
  {
    accessorKey: "username",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Usuario" />
    ),
    cell: ({ row }) => {
      const u = row.original;
      return (
        <div className="flex items-center gap-2.5 min-w-[180px]">
          <RolAvatar role={u.role} className="size-8 rounded-lg" />
          <div className="min-w-0">
            <div className="text-[13px] font-semibold truncate">
              {u.firstName} {u.lastName}
            </div>
            <div className="gm-mono text-[11px] text-muted-foreground truncate">
              @{u.username}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: ({ row }) => (
      <div className="gm-mono text-[12.5px] text-muted-foreground min-w-[200px]">
        {row.getValue("email")}
      </div>
    ),
  },
  {
    id: "role",
    accessorFn: (row) => (row as any).role,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Rol" />
    ),
    cell: ({ row }) => {
      const role = ((row.original as any).role ?? "USER") as string;
      return role === "ADMIN" ? (
        <Badge variant="yellow">Admin</Badge>
      ) : (
        <Badge variant="default">
          <UserIcon className="size-3" /> Operador
        </Badge>
      );
    },
  },
  {
    id: "playa",
    header: "Playa del operador",
    cell: ({ row }) =>
      row.original.role === "USER" && !assignments ? (
        <span className="text-xs text-muted-foreground">No disponible</span>
      ) : row.original.role === "USER" ? (
        <AssignPlayaDialog user={row.original} assigned={assignments?.[row.original.id] ?? null} />
      ) : (
        <span className="text-xs text-muted-foreground">
          Administra la empresa
        </span>
      ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original;
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
            className="w-56 border border-border bg-gm-surface p-1 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.7)]"
          >
            <DropdownMenuLabel className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Acciones
            </DropdownMenuLabel>
            <UpdateUserDailog user={user} />
            <DropdownMenuSeparator className="bg-border" />
            <DeleteUserDialog user={user} />
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
