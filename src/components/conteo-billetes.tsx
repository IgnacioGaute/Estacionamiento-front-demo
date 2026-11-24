'use client';

// El conteo del cajón por billetes: una fila por denominación, de mayor a menor, con cuántos hay,
// el subtotal y el total contado. No precarga nada ni mira el esperado (el conteo es ciego): solo
// suma lo que se escribe. «No hay efectivo» declara $0 sin escribir filas.
//
// `DesgloseBilletes` muestra un desglose guardado (historial del turno), sin edición.

import { useState } from 'react';
import { ChevronDown, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cantidadValida, DENOMINACION_CHICA, DENOMINACIONES, desgloseDe, totalDesglose, type Cantidades, type ConteoBillete } from '@/utils/conteo-billetes';

const pesos = (n: number) => '$ ' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n);

function Fila({ denominacion, valor, onChange, disabled }: { denominacion: number; valor: string; onChange: (texto: string) => void; disabled?: boolean }) {
  const id = 'billete-' + denominacion;
  const cantidad = cantidadValida(valor) ? Number(valor) : 0;
  const invalido = valor !== '' && !cantidadValida(valor);
  return (
    <li className="flex items-center gap-3 py-1.5">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="gm-mono block text-[16px] font-bold tabular-nums">{pesos(denominacion)}</label>
        <span className={cn('gm-mono block truncate text-[12px] tabular-nums', cantidad > 0 ? 'text-gm-texto-2' : 'text-muted-foreground/60')}>
          {cantidad > 0 ? '= ' + pesos(cantidad * denominacion) : 'sin contar'}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" aria-label={`Un billete de ${pesos(denominacion)} menos`} disabled={disabled || cantidad <= 0} onClick={() => onChange(cantidad - 1 > 0 ? String(cantidad - 1) : '')}
          className="grid size-11 place-items-center rounded-xl border border-gm-line-strong text-foreground transition-colors hover:border-gm-yellow/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-30">
          <Minus className="size-4" aria-hidden />
        </button>
        <input id={id} inputMode="numeric" autoComplete="off" placeholder="0" value={valor} disabled={disabled}
          aria-invalid={invalido || undefined}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
          // Enter pasa a la fila siguiente: no compara (eso es «Comparar con lo esperado»).
          data-billete
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            const filas = [...document.querySelectorAll<HTMLInputElement>('input[data-billete]')];
            filas[filas.indexOf(e.currentTarget) + 1]?.focus();
          }}
          onFocus={(e) => e.currentTarget.select()}
          className={cn('gm-mono h-11 w-[64px] shrink-0 rounded-xl border-[1.5px] bg-gm-surface-2 text-center text-[18px] font-bold tabular-nums outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-gm-yellow',
            invalido ? 'border-destructive' : cantidad > 0 ? 'border-gm-yellow/50' : 'border-gm-line-strong')} />
        <button type="button" aria-label={`Un billete de ${pesos(denominacion)} más`} disabled={disabled} onClick={() => onChange(String(cantidad + 1))}
          className="grid size-11 place-items-center rounded-xl border border-gm-line-strong text-foreground transition-colors hover:border-gm-yellow/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-30">
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
    </li>
  );
}

export function ConteoBilletes({ cantidades, onCantidades, sinEfectivo, onSinEfectivo, disabled }: {
  cantidades: Cantidades;
  onCantidades: (cantidades: Cantidades) => void;
  sinEfectivo: boolean;
  onSinEfectivo: (sinEfectivo: boolean) => void;
  disabled?: boolean;
}) {
  const chicas = DENOMINACIONES.filter((d) => d <= DENOMINACION_CHICA);
  const grandes = DENOMINACIONES.filter((d) => d > DENOMINACION_CHICA);
  const hayChicas = chicas.some((d) => (cantidades[d] ?? '') !== '');
  const [verChicas, setVerChicas] = useState(false);
  const total = totalDesglose(desgloseDe(cantidades));
  const cambiar = (d: number) => (texto: string) => { onSinEfectivo(false); onCantidades({ ...cantidades, [d]: texto }); };

  if (sinEfectivo)
    return (
      <div role="status" className="space-y-3 rounded-2xl border border-gm-line bg-gm-surface-2/60 p-4">
        <p className="text-[15px] font-semibold">No hay efectivo en el cajón</p>
        <p className="text-sm leading-relaxed text-muted-foreground">Se declara un conteo de $ 0. Si encontrás billetes, contalos.</p>
        <button type="button" disabled={disabled} onClick={() => onSinEfectivo(false)}
          className="inline-flex min-h-11 items-center rounded-xl border border-gm-line-strong px-4 text-sm font-semibold transition-colors hover:border-gm-yellow/50 hover:text-gm-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow">
          Contar billetes
        </button>
      </div>
    );

  return (
    <section aria-label="Billetes contados" className="overflow-hidden rounded-2xl border border-gm-line">
      <div className="flex justify-between gap-3 border-b border-gm-line bg-gm-surface-2/60 px-3.5 py-2 text-[11px] font-semibold text-muted-foreground">
        <span>Billete</span><span className="w-[160px] text-center">Cuántos hay</span>
      </div>
      <ul className="divide-y divide-gm-line/60 px-3.5">
        {grandes.map((d) => <Fila key={d} denominacion={d} valor={cantidades[d] ?? ''} onChange={cambiar(d)} disabled={disabled} />)}
      </ul>
      <button type="button" aria-expanded={verChicas || hayChicas} onClick={() => setVerChicas((v) => !v)} disabled={hayChicas}
        className="flex min-h-11 w-full items-center justify-between gap-2 border-t border-gm-line px-3.5 text-left text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gm-yellow disabled:cursor-default disabled:hover:text-muted-foreground">
        Billetes de $ 50 o menos y monedas
        {!hayChicas && <ChevronDown className={cn('size-4 transition-transform', verChicas && 'rotate-180')} aria-hidden />}
      </button>
      {(verChicas || hayChicas) && (
        <ul className="divide-y divide-gm-line/60 border-t border-gm-line/60 px-3.5">
          {chicas.map((d) => <Fila key={d} denominacion={d} valor={cantidades[d] ?? ''} onChange={cambiar(d)} disabled={disabled} />)}
        </ul>
      )}
      <div className="flex items-center justify-between gap-3 border-t border-gm-line bg-gm-surface-2/60 px-3.5 py-3" aria-live="polite">
        <span className="text-[15px] font-semibold">Total contado</span>
        <strong className="gm-mono text-[22px] font-bold tabular-nums">{pesos(total)}</strong>
      </div>
      <div className="border-t border-gm-line px-3.5 py-2">
        <button type="button" disabled={disabled} onClick={() => { onCantidades({}); onSinEfectivo(true); }}
          className="inline-flex min-h-11 items-center rounded-xl px-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow">
          No hay efectivo
        </button>
      </div>
    </section>
  );
}

// Un desglose guardado, para el historial. [] es «No hay efectivo».
// `resaltar`: las denominaciones que cambiaron respecto del otro conteo (recuento).
export function DesgloseBilletes({ titulo, desglose, className, resaltar = [] }: { titulo: string; desglose: ConteoBillete[]; className?: string; resaltar?: number[] }) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-[11px] font-semibold text-muted-foreground">{titulo}</p>
      {desglose.length === 0 ? <p className="mt-1 text-sm">No había efectivo</p> : (
        <table className="mt-1 w-full text-[13px]">
          <caption className="sr-only">{titulo}</caption>
          <tbody>
            {desglose.map((f) => (
              <tr key={f.denominacion} className={cn(resaltar.includes(f.denominacion) && 'text-gm-atencion')}>
                <th scope="row" className="gm-mono py-0.5 text-left font-semibold tabular-nums">{pesos(f.denominacion)}</th>
                <td className={cn('gm-mono py-0.5 text-right tabular-nums', !resaltar.includes(f.denominacion) && 'text-muted-foreground')}>× {f.cantidad}{resaltar.includes(f.denominacion) && <span className="sr-only"> (cambió)</span>}</td>
                <td className="gm-mono py-0.5 pl-3 text-right tabular-nums">{pesos(f.denominacion * f.cantidad)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gm-line">
              <th scope="row" colSpan={2} className="pt-1 text-left font-semibold">Total</th>
              <td className="gm-mono pt-1 text-right font-bold tabular-nums">{pesos(totalDesglose(desglose))}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}
