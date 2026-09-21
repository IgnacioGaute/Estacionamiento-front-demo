'use client';

import { useState } from 'react';
import { Map } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { TicketPriceBracketMap } from '@/app/(protected)/admin/tickets/components/ticket-price-bracket/ticket-price-bracket-map';
import { TicketPriceBracket } from '@/types/ticket-price-bracket.type';
import { TicketSchedule } from '@/services/tickets.service';

export function PriceBracketMapDialog({
  brackets,
  schedule,
}: {
  brackets: TicketPriceBracket[];
  schedule: TicketSchedule | null;
}) {
  const [open, setOpen] = useState(false);

  if (!schedule) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-gm-yellow"
      >
        <Map className="size-3.5" />
        Consultar precios
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto overflow-x-hidden">
          <DialogTitle className="sr-only">Consultar precios</DialogTitle>
          <DialogDescription className="sr-only">
            Escalera de precios por franja horaria, con la tolerancia entre saltos y la diferencia
            entre día y noche.
          </DialogDescription>
          <TicketPriceBracketMap brackets={brackets} schedule={schedule} embedded />
        </DialogContent>
      </Dialog>
    </>
  );
}
