'use client';

import { Button } from '@/components/ui/button';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { toast } from '@/lib/toast';
import { OtherPayment } from '@/types/other-payment.type';
import { deleteExpenseAction } from '@/actions/other-payment/delete-other-payment.action';

// Baja importante: diálogo de confirmación y, para confirmar, mantener apretado el botón.
export function DeleteExpenseDialog({ expense }: { expense: OtherPayment }) {
  const eliminar = async () => {
    const data = await deleteExpenseAction(expense.id);
    if (!data || data.error) { toast.error(data?.error); return false; }
    toast.success(data.success);
  };

  return (
    <ConfirmActionDialog
      trigger={<Button variant="ghost" className="w-full justify-start" size="sm">Eliminar</Button>}
      title="Eliminar gasto"
      description="Esta acción no se puede deshacer."
      actionLabel="Eliminar el gasto"
      tone="danger"
      onConfirm={eliminar}
    />
  );
}
