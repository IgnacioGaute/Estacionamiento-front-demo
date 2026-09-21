'use client';

import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { Customer } from '@/types/cutomer.type';
import { deleteCustomerAction } from '@/actions/customers/delete-customer.action';
import { Trash } from 'lucide-react';

export function DeleteRenterDialog({ customer }: { customer: Customer }) {
  const handleDelete = async () => {
    const data = await deleteCustomerAction(customer.id);
    if ('error' in data) {
      toast.error(data.error.message);
    } else {
      toast.success('Inquilino eliminado exitosamente');
    }
  };

  return (
    <ConfirmActionDialog
      trigger={
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-[#F08775] hover:bg-destructive/15 hover:text-[#F08775]"
        >
          <Trash className="w-4 h-4" />
          Eliminar inquilino
        </Button>
      }
      title="Eliminar inquilino"
      description="Se eliminará permanentemente — esta acción no se puede deshacer."
      confirmText="Eliminar Inquilino"
      actionLabel="Eliminar definitivamente"
      tone="danger"
      onConfirm={handleDelete}
    >
      Se eliminarán las cocheras alquiladas, recibos y movimientos de{' '}
      <span className="font-semibold text-foreground">
        {customer.firstName} {customer.lastName}
      </span>
      .
    </ConfirmActionDialog>
  );
}
