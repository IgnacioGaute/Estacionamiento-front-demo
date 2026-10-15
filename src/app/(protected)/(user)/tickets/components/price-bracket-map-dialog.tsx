'use client';

import { useState } from 'react';
import { Map } from 'lucide-react';
import { ActionDialog, ActionDialogContent, ActionDialogHeader, ActionDialogBody } from '@/components/ui/action-dialog';
import { TarifasEscalera } from './tarifas-escalera';
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
          <ActionDialogHeader title="Ver tarifas" description="Cuánto se cobra según el tiempo de estadía" />
          <ActionDialogBody className="pb-5">
            <TarifasEscalera brackets={brackets} schedule={schedule} />
          </ActionDialogBody>
        </ActionDialogContent>
      </ActionDialog>
    </>
  );
}
