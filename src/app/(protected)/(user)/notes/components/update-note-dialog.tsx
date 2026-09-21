'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/lib/toast';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Edit3, Loader2 } from 'lucide-react';

import { Note } from '@/types/note.type';
import {
  updateNoteSchema,
  UpdateNoteSchemaType,
} from '@/schemas/note.schema';
import { updateNoteAction } from '@/actions/notes/update-note.action';

export function UpdateNoteDialog({ note }: { note: Note }) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const form = useForm<UpdateNoteSchemaType>({
    resolver: zodResolver(updateNoteSchema),
    defaultValues: { description: note.description || '' },
  });

  const onSubmit = async (values: UpdateNoteSchemaType) => {
    startTransition(async () => {
      const response = await updateNoteAction(note.id, values);
      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success('Aviso actualizado exitosamente');
        form.reset();
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <Edit3 className="size-4" />
          Editar aviso
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md border border-gm-yellow/40 bg-gm-yellow/15 text-gm-yellow">
              <Edit3 className="size-4" />
            </span>
            <div>
              <DialogTitle>Editar aviso</DialogTitle>
              <DialogDescription className="mt-0.5">
                Actualizá el contenido del aviso.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea disabled={isPending} rows={5} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
