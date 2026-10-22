'use client';

import { Button } from '@/components/ui/button';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { toast } from '@/lib/toast';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Receipt } from '@/types/receipt.type';
import { deleteReceiptAction } from '@/actions/receipts/delete-receipt.action';

// Baja importante: diálogo de confirmación y, para confirmar, mantener apretado el botón.
export function DeleteReceiptDialog({ receipt, triggerClassName }: { receipt: Receipt; triggerClassName?: string }) {
  const eliminar = async () => {
    const data = await deleteReceiptAction(receipt.id);
    if ('error' in data) { toast.error(data.error.message); return false; }
    toast.success('Recibo eliminado exitosamente');
  };

  return (
    <ConfirmActionDialog
      trigger={
        <Button variant="ghost" className={cn('w-full justify-start gap-2', triggerClassName)} size="sm">
          <Trash2 size={13} className="shrink-0 text-muted-foreground" />
          Eliminar Recibo
        </Button>
      }
      title="Eliminar recibo"
      description="Esta acción no se puede deshacer."
      icon={Trash2}
      actionLabel="Eliminar el recibo"
      tone="danger"
      onConfirm={eliminar}
    />
  );
}
