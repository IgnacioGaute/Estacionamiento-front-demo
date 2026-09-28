'use client';

import type { ReactNode } from 'react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function TariffConfirmDialog({ open, onOpenChange, title, description, children, cancelLabel = 'Seguir editando', confirmLabel, onConfirm }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; children?: ReactNode;
  cancelLabel?: string; confirmLabel: string; onConfirm: () => void;
}) {
  const cancel = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="rounded-2xl sm:max-w-md" onOpenAutoFocus={event => { event.preventDefault(); previousFocus.current = document.activeElement as HTMLElement | null; cancel.current?.focus(); }} onCloseAutoFocus={event => { event.preventDefault(); previousFocus.current?.focus(); }}>
      <DialogHeader className="space-y-3 pr-14">
        <DialogTitle className="leading-snug">{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {children}
      <DialogFooter className="sm:flex-col sm:space-x-0">
        <Button ref={cancel} type="button" variant="outline" className="h-auto min-h-11 whitespace-normal" onClick={() => onOpenChange(false)}>{cancelLabel}</Button>
        <Button type="button" className="h-auto min-h-11 whitespace-normal" onClick={() => { onOpenChange(false); onConfirm(); }}>{confirmLabel}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
