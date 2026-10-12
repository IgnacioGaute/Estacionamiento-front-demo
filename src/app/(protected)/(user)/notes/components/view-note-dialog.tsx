'use client';

import { useState } from 'react';
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
import { Eye, StickyNote, User } from 'lucide-react';
import { Note } from '@/types/note.type';

export function ViewNoteDialog({ note }: { note: Note }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <Eye className="size-4" />
          Ver detalles
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md border border-gm-yellow/40 bg-gm-yellow/15 text-gm-yellow">
              <StickyNote className="size-4" />
            </span>
            <div>
              <DialogTitle>Aviso</DialogTitle>
              <DialogDescription className="mt-0.5">
                Detalle del aviso interno.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <article className="rounded-md border border-border bg-gm-surface-2 p-4">
          <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-foreground">
            {note.description}
          </p>
        </article>

        <dl className="grid grid-cols-2 gap-3 text-[12.5px]">
          <div className="rounded-md border border-border bg-gm-surface-2 p-3">
            <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Fecha
            </dt>
            <dd className="gm-mono mt-0.5 font-semibold text-foreground">
              {note.date}
            </dd>
          </div>
          <div className="rounded-md border border-border bg-gm-surface-2 p-3">
            <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Creado por
            </dt>
            <dd className="mt-0.5 flex items-center gap-1.5 text-foreground">
              <User className="size-3.5 text-muted-foreground" />
              {note.user?.email ?? 'Autor no registrado'}
            </dd>
          </div>
        </dl>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
