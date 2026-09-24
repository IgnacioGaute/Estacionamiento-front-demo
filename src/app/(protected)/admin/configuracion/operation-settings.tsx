'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Barcode, Wallet } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { updateTicketScheduleAction } from '@/actions/tickets/update-ticket-schedule.action';

export function OperationSettings(props: { shiftsEnabled: boolean; barcodeTicketsEnabled: boolean }) {
  const [shifts, setShifts] = useState(props.shiftsEnabled);
  const [tickets, setTickets] = useState(props.barcodeTicketsEnabled);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  useEffect(() => { setShifts(props.shiftsEnabled); setTickets(props.barcodeTicketsEnabled); }, [props.shiftsEnabled, props.barcodeTicketsEnabled]);
  return <form className="overflow-hidden rounded-2xl border border-border bg-card" onSubmit={event => {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateTicketScheduleAction({ shiftsEnabled: shifts, barcodeTicketsEnabled: tickets });
      if (result.error) { toast.error(result.error.message); return; }
      toast.success('Configuración guardada');
      router.refresh();
    });
  }}>
    <div className="space-y-6 p-5 sm:p-6">
      <div className="flex items-start gap-3"><Wallet className="mt-1 size-5 shrink-0 text-gm-yellow" /><div className="min-w-0 flex-1"><label htmlFor="shifts-enabled" className="font-semibold">Turnos de caja</label><p className="mt-1 text-sm text-muted-foreground">Apertura, relevo y cierre de caja por operador. Al desactivarlos, podés seguir cobrando y usando la planilla diaria sin abrir un turno. El historial se conserva.</p><p className="mt-2 text-xs text-muted-foreground">Antes de desactivar, cerrá el turno abierto. Puede quedar efectivo pendiente: el saldo y el historial se conservan.</p></div><Switch id="shifts-enabled" checked={shifts} onCheckedChange={setShifts} disabled={pending} /></div>
      <div className="flex items-start gap-3 border-t border-border pt-6"><Barcode className="mt-1 size-5 shrink-0 text-gm-yellow" /><div className="min-w-0 flex-1"><label htmlFor="tickets-enabled" className="font-semibold">Tickets por código de barras</label><p className="mt-1 text-sm text-muted-foreground">Habilita el lector y las tarjetas físicas en la pantalla de operación. Apagado, trabajás con patentes y tickets por día, semana o mes.</p><p className="mt-2 text-xs text-muted-foreground">Registrá la salida de los tickets físicos en uso antes de apagarlo. No se borra su historial.</p></div><Switch id="tickets-enabled" checked={tickets} onCheckedChange={setTickets} disabled={pending} /></div>
    </div>
    <div className="flex justify-end border-t border-border bg-secondary/30 p-4"><Button disabled={pending || (shifts === props.shiftsEnabled && tickets === props.barcodeTicketsEnabled)}>{pending ? 'Guardando…' : 'Guardar configuración'}</Button></div>
  </form>;
}
