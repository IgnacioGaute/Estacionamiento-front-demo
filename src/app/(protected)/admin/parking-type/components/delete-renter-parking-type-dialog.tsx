'use client';

import { Button } from '@/components/ui/button';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { toast } from '@/lib/toast';
import { RenterParkingType } from '@/types/renter-parking-type';
import { deleteRenterParkingTypeAction } from '@/actions/renter-parking-type/delete-renter-parking-type.action';

// Baja importante: diálogo de confirmación y, para confirmar, mantener apretado el botón.
export function DeleteRenterParkingTypeDialog({ parkingType }: { parkingType: RenterParkingType }) {
  const eliminar = async () => {
    const data = await deleteRenterParkingTypeAction(parkingType.id);
    if (!data || data.error) { toast.error(typeof data?.error === 'string' ? data.error : 'Error al eliminar'); return false; }
    toast.success(data.success);
  };

  return (
    <ConfirmActionDialog
      trigger={<Button variant="ghost" className="w-full justify-start" size="sm">Eliminar</Button>}
      title="Eliminar tipo de estacionamiento"
      description="Esta acción no se puede deshacer."
      actionLabel="Eliminar el tipo"
      tone="danger"
      onConfirm={eliminar}
    />
  );
}
