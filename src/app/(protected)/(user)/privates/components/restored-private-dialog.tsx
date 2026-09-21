'use client';

import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { Customer } from '@/types/cutomer.type';
import { restoredCustomerAction } from '@/actions/customers/restored-customer.action';
import { RotateCcw } from 'lucide-react';

export function RestoredPrivateDialog({ customer }: { customer: Customer }) {
  const handleRestore = async () => {
    const data = await restoredCustomerAction(customer.id);
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
          <RotateCcw className="w-4 h-4" />
          Restaurar inquilino de terceros
        </Button>
      }
      title="Restaurar inquilino de terceros"
      description="Volverá a aparecer en el listado activo."
      confirmText="Restaurar Inquilino"
      actionLabel="Restaurar"
      tone="success"
      onConfirm={handleRestore}
    >
      Se reactivará a{' '}
      <span className="font-semibold text-foreground">
        {customer.firstName} {customer.lastName}
      </span>{' '}
      con sus datos históricos.
    </ConfirmActionDialog>
  );
}
