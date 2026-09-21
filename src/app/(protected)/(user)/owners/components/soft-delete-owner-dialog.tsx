'use client';

import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { Customer } from '@/types/cutomer.type';
import { softDeleteCustomerAction } from '@/actions/customers/soft-delete-customer.action';
import { Archive } from 'lucide-react';

export function SoftDeleteOwnerDialog({ customer }: { customer: Customer }) {
  const handleSoftDelete = async () => {
    const data = await softDeleteCustomerAction(customer.id);
    if (!data || data.error) {
      toast.error(data?.error);
    } else {
      toast.success(data.success);
    }
  };

  return (
    <ConfirmActionDialog
      trigger={
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <Archive className="w-4 h-4" />
          Dar de baja
        </Button>
      }
      title="Dar de baja al propietario"
      description="Podrá restaurarse después desde la pestaña de archivados."
      confirmText="Eliminar Propietario"
      actionLabel="Dar de baja"
      tone="warning"
      onConfirm={handleSoftDelete}
    >
      Se ocultará a{' '}
      <span className="font-semibold text-foreground">
        {customer.firstName} {customer.lastName}
      </span>{' '}
      del listado activo. Sus recibos y datos históricos se conservan.
    </ConfirmActionDialog>
  );
}
