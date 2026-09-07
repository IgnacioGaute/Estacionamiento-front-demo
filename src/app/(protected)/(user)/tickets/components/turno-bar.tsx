'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Wallet } from 'lucide-react';
import { Turno } from '@/types/turno.type';
import { getMyOpenTurnoAction } from '@/actions/turnos/get-my-open-turno.action';
import { openTurnoAction } from '@/actions/turnos/open-turno.action';
import { closeTurnoAction } from '@/actions/turnos/close-turno.action';
import { openTurnoSchema, OpenTurnoSchemaType, closeTurnoSchema, CloseTurnoSchemaType } from '@/schemas/turno.schema';

export function TurnoBar() {
  const [turno, setTurno] = useState<Turno | null>(null);
  const [dialog, setDialog] = useState<'OPEN' | 'CLOSE' | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = () => startTransition(async () => setTurno(await getMyOpenTurnoAction()));
  useEffect(() => { load(); }, []);

  const openForm = useForm<OpenTurnoSchemaType>({
    resolver: zodResolver(openTurnoSchema),
    defaultValues: { fondoInicial: undefined },
  });
  const closeForm = useForm<CloseTurnoSchemaType>({
    resolver: zodResolver(closeTurnoSchema),
    defaultValues: { efectivoContado: undefined, observaciones: '' },
  });

  const onOpenSubmit = (values: OpenTurnoSchemaType) => {
    startTransition(async () => {
      const data = await openTurnoAction(values);
      if (data.error) {
        toast.error(typeof data.error === 'string' ? data.error : data.error.message);
      } else {
        toast.success('Turno abierto');
        openForm.reset();
        setDialog(null);
        load();
      }
    });
  };

  const onCloseSubmit = (values: CloseTurnoSchemaType) => {
    if (!turno) return;
    startTransition(async () => {
      const data = await closeTurnoAction(turno.id, values);
      if (data.error) {
        toast.error(typeof data.error === 'string' ? data.error : data.error.message);
      } else {
        toast.success('Turno cerrado');
        closeForm.reset();
        setDialog(null);
        load();
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setDialog(turno ? 'CLOSE' : 'OPEN')}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.04em] text-foreground hover:bg-gm-surface-2"
      >
        <Wallet className="h-3.5 w-3.5" />
        {turno ? `Turno abierto · fondo $${turno.fondoInicial}` : 'Abrir mi turno'}
      </button>

      <Dialog open={dialog === 'OPEN'} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Abrir turno</DialogTitle></DialogHeader>
          <Form {...openForm}>
            <form onSubmit={openForm.handleSubmit(onOpenSubmit)} className="space-y-4">
              <FormField
                control={openForm.control}
                name="fondoInicial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fondo inicial de caja</FormLabel>
                    <FormControl>
                      <Input type="number" disabled={isPending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button className="w-full" type="submit" disabled={isPending}>Abrir turno</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'CLOSE'} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cerrar turno</DialogTitle></DialogHeader>
          <Form {...closeForm}>
            <form onSubmit={closeForm.handleSubmit(onCloseSubmit)} className="space-y-4">
              <FormField
                control={closeForm.control}
                name="efectivoContado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Efectivo contado</FormLabel>
                    <FormControl>
                      <Input type="number" disabled={isPending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={closeForm.control}
                name="observaciones"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observaciones (opcional)</FormLabel>
                    <FormControl>
                      <Input disabled={isPending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button className="w-full" type="submit" disabled={isPending}>Cerrar turno</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
