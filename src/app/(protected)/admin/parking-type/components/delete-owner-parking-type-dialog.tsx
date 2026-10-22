'use client';

import { Button } from '@/components/ui/button';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { toast } from '@/lib/toast';
import { OwnerParkingType } from '@/types/owner-parking-type';
import { deleteOwnerParkingTypeAction } from '@/actions/owner-parking-type/delete-owner-parking-type.action';

// Baja importante: diálogo de confirmación y, para confirmar, mantener apretado el botón.
export function DeleteOwnerParkingTypeDialog({ parkingType }: { parkingType: OwnerParkingType }) {
  const eliminar = async () => {
    const data = await deleteOwnerParkingTypeAction(parkingType.id);
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
