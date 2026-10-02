'use client';
import LatticeLoader from '@/components/ui/lattice-loader';

import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Dispatch, SetStateAction } from 'react';

interface ConfirmDeleteDialogProps {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  title?: string;
  subject: string;
  description?: string;
  onConfirm: () => void | Promise<void>;
  isPending?: boolean;
  confirmLabel?: string;
}

export function ConfirmDeleteDialog({
  open,
  setOpen,
  title = 'Confirmar eliminación',
  subject,
  description,
  onConfirm,
  isPending,
  confirmLabel = 'Eliminar',
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md border border-destructive/40 bg-destructive/15 text-[#F08775]">
              <AlertTriangle className="size-4" />
            </span>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-0.5">
                Esta acción no se puede deshacer.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="text-[13.5px] leading-relaxed text-muted-foreground">
          ¿Estás seguro de que querés eliminar{' '}
          <span className="font-semibold text-foreground">{subject}</span>?
          {description && <p className="mt-2 text-[13px]">{description}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm()}
            disabled={isPending}
          >
            {isPending && <LatticeLoader compact label="Procesando…" showTimer={false} cellSize={4} gap={1} />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
