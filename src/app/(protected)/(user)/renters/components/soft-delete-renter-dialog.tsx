'use client';

import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { Customer } from '@/types/cutomer.type';
import { softDeleteCustomerAction } from '@/actions/customers/soft-delete-customer.action';
import { Archive } from 'lucide-react';

// Dar de baja no cancela lo que se debe: libera las cocheras y deja de cargarle abonos, pero la
// cuenta queda a la vista para cobrarle el saldo pendiente.
export function SoftDeleteRenterDialog({ customer, onHecho }: { customer: Customer; onHecho?: () => void }) {
  const handleSoftDelete = async () => {
    const data = await softDeleteCustomerAction(customer.id);
    if (!data || data.error) {
      toast.error(data?.error);
    } else {
      toast.success('Inquilino dado de baja. Su cuenta sigue disponible para cobrarle lo pendiente.');
      onHecho?.();
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
      title="Dar de baja al inquilino"
      description="Deja de alquilar: se liberan sus cocheras y no se le cargan más abonos."
      confirmText="Dar de baja"
      actionLabel="Dar de baja"
      tone="warning"
      onConfirm={handleSoftDelete}
    >
      <span className="font-semibold text-foreground">
        {customer.firstName} {customer.lastName}
      </span>{' '}
      conserva su historial y su saldo: si tiene algo pendiente, se le puede seguir cobrando desde su cuenta. Se puede
      reactivar más adelante.
    </ConfirmActionDialog>
  );
}
