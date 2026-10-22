'use client';

import { Button } from '@/components/ui/button';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { toast } from '@/lib/toast';
import { Ticket } from '@/types/ticket.type';
import { deleteTicketAction } from '@/actions/tickets/delete-ticket.action';

// Baja importante: diálogo de confirmación y, para confirmar, mantener apretado el botón.
export function DeleteTicketDialog({ ticket }: { ticket: Ticket }) {
  const eliminar = async () => {
    const data = await deleteTicketAction(ticket.id);
    if (!data || data.error) { toast.error(data?.error); return false; }
    toast.success(data.success);
  };

  return (
    <ConfirmActionDialog
      trigger={<Button variant="ghost" className="w-full justify-start" size="sm">Eliminar Ticket</Button>}
      title="Eliminar ticket"
      description="Esta acción no se puede deshacer."
      actionLabel="Eliminar el ticket"
      tone="danger"
      onConfirm={eliminar}
    >
      Se eliminará la tarjeta <span className="gm-mono font-semibold text-foreground">{ticket.codeBar}</span>.
    </ConfirmActionDialog>
  );
}
