'use client';

import { useState } from 'react';
import { Map } from 'lucide-react';
import { ActionDialog, ActionDialogContent, ActionDialogHeader, ActionDialogBody } from '@/components/ui/action-dialog';
import { TicketPriceBracketMap } from '@/app/(protected)/admin/tickets/components/ticket-price-bracket/ticket-price-bracket-map';
import { TicketPriceBracket } from '@/types/ticket-price-bracket.type';
import { TicketSchedule } from '@/services/tickets.service';

export function PriceBracketMapDialog({
  brackets,
  schedule,
  renderTrigger,
}: {
  brackets: TicketPriceBracket[];
  schedule: TicketSchedule | null;
  // Para dibujar el acceso con el estilo de donde se lo usa (los atajos del inicio).
  renderTrigger?: (abrir: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!schedule) return null;

  return (
    <>
      {renderTrigger ? renderTrigger(() => setOpen(true)) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-gm-yellow"
        >
          <Map className="size-3.5" />
          Consultar precios
        </button>
      )}

      <ActionDialog open={open} onOpenChange={setOpen}>
        <ActionDialogContent className="sm:max-w-3xl">
          <ActionDialogHeader title="Ver tarifas" description="Precios por vehículo y horario" />
          <ActionDialogBody>
            <TicketPriceBracketMap brackets={brackets} schedule={schedule} embedded />
          </ActionDialogBody>
        </ActionDialogContent>
      </ActionDialog>
    </>
  );
}
