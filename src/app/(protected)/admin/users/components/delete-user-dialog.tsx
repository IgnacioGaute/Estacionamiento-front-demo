'use client';

import { useState } from 'react';
import { toast } from '@/lib/toast';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BotonMantener } from '@/components/ui/boton-mantener';
import { AlertTriangle, Trash } from 'lucide-react';

import { User } from '@/types/user.type';
import { deleteUserAction } from '@/actions/users/delete-user.action';

// Una baja importante: diálogo de confirmación y, para confirmar, mantener apretado el botón
// (BotonMantener), en vez de escribir el email y un texto.
export function DeleteUserDialog({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const eliminar = async () => {
    setIsPending(true);
    try {
      const data = await deleteUserAction(user.id);
      if (!data || data.error) {
        toast.error(data?.error);
      } else {
        toast.success(data.success);
        setOpen(false);
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isPending) setOpen(o); }}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={`Eliminar a ${user.firstName} ${user.lastName}`}
          title="Eliminar usuario"
          className="size-9 shrink-0 border-gm-line-strong text-[#F08775] hover:border-destructive/50 hover:bg-destructive/15 hover:text-[#F08775]"
        >
          <Trash className="size-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md border border-destructive/40 bg-destructive/15 text-[#F08775]">
              <AlertTriangle className="size-4" />
            </span>
            <div>
              <DialogTitle>Eliminar usuario</DialogTitle>
              <DialogDescription className="mt-0.5">
                Esta acción no se puede deshacer.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="text-[13.5px] leading-relaxed text-muted-foreground">
          Se eliminará la cuenta de{' '}
          <span className="font-semibold text-foreground">
            {user.firstName} {user.lastName}
          </span>{' '}
          (<span className="gm-mono">{user.email}</span>). Los movimientos firmados por este usuario se conservan.
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <BotonMantener onHold={() => void eliminar()} disabled={isPending} hecho={isPending ? 'Eliminando…' : 'Eliminado'}>
            Mantené para eliminar
          </BotonMantener>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
