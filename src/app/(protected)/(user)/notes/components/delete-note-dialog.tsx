'use client';

import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { Trash } from 'lucide-react';
import { Note } from '@/types/note.type';
import { deleteNoteAction } from '@/actions/notes/delete-note.action';

export function DeleteNoteDialog({ note }: { note: Note }) {
  const handleDelete = async () => {
    const data = await deleteNoteAction(note.id);
    if (!data || data.error) {
      toast.error(data?.error);
    } else {
      toast.success(data.success);
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
          <Trash className="size-4" />
          Eliminar aviso
        </Button>
      }
      title="Eliminar aviso"
      description="Esta acción no se puede deshacer."
      confirmText="Eliminar aviso"
      actionLabel="Eliminar"
      tone="danger"
      onConfirm={handleDelete}
    >
      Se eliminará el aviso del {note.date} permanentemente.
    </ConfirmActionDialog>
  );
}
