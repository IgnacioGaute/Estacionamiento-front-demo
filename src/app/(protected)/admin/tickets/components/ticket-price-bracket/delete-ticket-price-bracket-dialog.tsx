'use client';

import { Button } from '@/components/ui/button';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { toast } from '@/lib/toast';
import { TicketPriceBracket } from '@/types/ticket-price-bracket.type';
import { deleteTicketPriceBracketAction } from '@/actions/tickets/delete-ticket-price-bracket.action';

// Baja importante: diálogo de confirmación y, para confirmar, mantener apretado el botón.
export function DeleteTicketPriceBracketDialog({ bracket }: { bracket: TicketPriceBracket }) {
  const eliminar = async () => {
    const data = await deleteTicketPriceBracketAction(bracket.id);
    if (!data || data.error) { toast.error(data?.error); return false; }
    toast.success(data.success);
  };

  return (
    <ConfirmActionDialog
      trigger={<Button variant="ghost" className="w-full justify-start" size="sm">Eliminar</Button>}
      title="Eliminar franja de precio"
      description="Esta acción no se puede deshacer."
      actionLabel="Eliminar la franja"
      tone="danger"
      onConfirm={eliminar}
    >
      Se eliminará la franja <span className="font-semibold text-foreground">{bracket.label}</span>.
    </ConfirmActionDialog>
  );
}
