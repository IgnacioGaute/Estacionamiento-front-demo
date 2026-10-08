'use client';
import { useState } from 'react';
import { Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { guardarComisionesCajaAction } from '@/actions/box-lists/comisiones.action';
import type { ComisionesCaja } from '@/types/box-list.type';

const formatoDinero = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const dinero = (n: number) => formatoDinero.format(n);

export function ComisionesCajaForm({ inicial }: { inicial: ComisionesCaja }) {
  const [qr, setQr] = useState(String(inicial.qrPorcentaje));
  const [transferencia, setTransferencia] = useState(String(inicial.transferenciaPorcentaje));
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const qrNumero = Number(qr.replace(',', '.'));
  const transferenciaNumero = Number(transferencia.replace(',', '.'));
  const valido = [qr, transferencia].every(v => /^\d{1,3}([.,]\d{1,2})?$/.test(v)) && [qrNumero, transferenciaNumero].every(n => n >= 0 && n <= 100);
  return <form id="comisiones" className="space-y-5 rounded-2xl border border-border bg-secondary/10 p-5 sm:p-6" onSubmit={async event => {
    event.preventDefault();
    if (!valido || guardando) return;
    setGuardando(true); setError(''); setMensaje('');
    try {
      const result = await guardarComisionesCajaAction({ qrPorcentaje: qrNumero, transferenciaPorcentaje: transferenciaNumero });
      if (result.error) setError(result.error);
      else setMensaje('Comisiones guardadas para todas las playas de esta empresa. Volvé a abrir la planilla para ver el cálculo actualizado.');
    } catch { setError('No se pudo guardar. Intentá nuevamente.'); }
    finally { setGuardando(false); }
  }}>
    <div className="flex items-start gap-3"><span className="rounded-xl bg-gm-yellow/10 p-3 text-gm-yellow"><Percent className="size-5" /></span><div><h2 className="text-lg font-semibold">Comisiones para el resumen de caja</h2><p className="mt-1 text-sm text-muted-foreground">Definí cuánto descontar para estimar lo que recibe la empresa. El cliente paga el importe original del ticket.</p></div></div>
    <fieldset disabled={guardando} className="grid gap-4 sm:grid-cols-2">
      {[{ id: 'comision-qr', label: 'Mercado Pago / QR', value: qr, set: setQr, porcentaje: qrNumero, ayuda: 'Un porcentaje general para los cobros registrados como Mercado Pago.' }, { id: 'comision-transferencia', label: 'Transferencias / alias', value: transferencia, set: setTransferencia, porcentaje: transferenciaNumero, ayuda: 'Incluye transferencias verificadas y las registradas manualmente.' }].map(campo => <div key={campo.id} className="rounded-xl border border-border bg-background/50 p-4">
        <label htmlFor={campo.id} className="text-sm font-semibold">{campo.label}</label>
        <div className="relative mt-3"><Input id={campo.id} inputMode="decimal" value={campo.value} onChange={e => { campo.set(e.target.value); setMensaje(''); }} aria-describedby={`${campo.id}-ayuda`} className="h-12 pr-10 text-lg tabular-nums" required /><span className="pointer-events-none absolute right-4 top-3 text-muted-foreground">%</span></div>
        <p id={`${campo.id}-ayuda`} className="mt-2 text-xs leading-relaxed text-muted-foreground">{campo.ayuda}</p>
        {valido && <p className="mt-3 text-sm">De $10.000 quedan <strong className="tabular-nums">{dinero(10000 * (1 - campo.porcentaje / 100))}</strong></p>}
      </div>)}
    </fieldset>
    <p className="text-xs leading-relaxed text-muted-foreground">Usá 0% si no querés descontar nada. Ingresá el porcentaje final, con IVA incluido si corresponde. Se aplica a los ingresos; no se presume devolución de comisión al registrar un egreso. Al cambiarlo se recalculan también las fechas anteriores consultadas. Es una estimación, no la liquidación de Mercado Pago.</p>
    {!valido && <p role="alert" className="text-sm text-destructive">Ingresá porcentajes entre 0 y 100, con hasta dos decimales.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {mensaje && <p role="status" className="text-sm text-emerald-500">{mensaje}</p>}
    <Button type="submit" disabled={!valido || guardando}>{guardando ? 'Guardando…' : 'Guardar comisiones'}</Button>
  </form>;
}
