'use client';

import { Button } from '@/components/ui/button';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { toast } from '@/lib/toast';
import { Trash2 } from 'lucide-react';
import { ticketPrice } from '@/types/ticket-price';
import { deleteTicketPriceAction } from '@/actions/tickets/delete-ticket-precio.action';

// Baja importante: diálogo de confirmación y, para confirmar, mantener apretado el botón.
export function DeleteTicketPriceDialog({ ticketPrice }: { ticketPrice: ticketPrice }) {
  const eliminar = async () => {
    const data = await deleteTicketPriceAction(ticketPrice.id);
    if (!data || data.error) { toast.error(data?.error ?? 'Error desconocido'); return false; }
    toast.success(data.success);
  };

  return (
    <ConfirmActionDialog
      trigger={
        <Button variant="ghost" className="w-full justify-start gap-2 text-[#F08775] hover:bg-destructive/15 hover:text-[#F08775]" size="sm">
          <Trash2 className="size-3.5" />
          Eliminar
        </Button>
      }
      title="Eliminar tarifa"
      description="Esta acción no se puede deshacer."
      icon={Trash2}
      actionLabel="Eliminar la tarifa"
      tone="danger"
      onConfirm={eliminar}
    />
  );
}
