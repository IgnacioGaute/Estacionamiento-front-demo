'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

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
import { Loader2, StickyNote } from 'lucide-react';

import { noteSchema, NoteSchemaType } from '@/schemas/note.schema';
import { createNoteAction } from '@/actions/notes/create-note.action';

export function CreateNoteDialog() {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const session = useSession();

  const form = useForm<NoteSchemaType>({
    resolver: zodResolver(noteSchema),
    defaultValues: { description: '' },
  });

  const onSubmit = (values: NoteSchemaType) => {
    startTransition(() => {
      createNoteAction(values, session.data?.user.id || '')
        .then((data) => {
          if (data.error) {
            toast.error(data.error);
          } else {
            toast.success('Aviso creado exitosamente');
            form.reset();
            setOpen(false);
            window.dispatchEvent(new Event('new-note-created'));
          }
        })
        .catch((err) => {
          console.error(err);
          toast.error('Error al crear el aviso');
        });
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          Nuevo aviso
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md border border-gm-yellow/40 bg-gm-yellow/15 text-gm-yellow">
              <StickyNote className="size-4" />
            </span>
            <div>
              <DialogTitle>Nuevo aviso</DialogTitle>
              <DialogDescription className="mt-0.5">
                Nota interna para que todo el equipo lo vea.
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
                    <Textarea
                      disabled={isPending}
                      rows={5}
                      placeholder="Ej: cobrar a Iturralde — pasa hoy a las 18hs por el saldo de marzo."
                      {...field}
                    />
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
                Crear aviso
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
