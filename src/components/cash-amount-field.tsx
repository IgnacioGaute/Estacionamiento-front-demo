'use client';
import { ReactNode, useRef, useState } from 'react';
import { Check, Pencil, Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export const cashMoney = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const miles = (n: number) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n);
type Shortcut = { label: string; disabled?: boolean } & ({ amount: number } | { edit: true });

// Un importe de caja: la cifra grande con separador de miles y, pegados abajo, los atajos («Conté
// todo», «No hay efectivo»…) como una bandeja del mismo recuadro. El input sigue siendo numérico;
// mientras no tiene foco se muestra la cifra formateada encima, y al escribir aparecen los dígitos.
export function CashAmountField({ id, label, value, onChange, disabled, max, placeholder, shortcuts = [], increments = false, description, status, compact, editLabel = 'Editar importe', labelClassName }: {
  id: string; label: string; value: string; onChange: (value: string) => void;
  disabled?: boolean; max?: number; placeholder?: string; shortcuts?: Shortcut[]; increments?: boolean; description?: ReactNode;
  // Estado del importe (p. ej. «El efectivo coincide»), a la derecha de la cifra.
  status?: ReactNode;
  compact?: boolean;
  editLabel?: string;
  labelClassName?: string;
}) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const numero = value !== '' && Number.isInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null;
  const formateado = !focused && numero !== null;
  return <div className="space-y-2.5">
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <Label htmlFor={id} className={cn('min-w-0 flex-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground', labelClassName)}>{label}</Label>
      {!!shortcuts.length && <button type="button" disabled={disabled} aria-label={editLabel + ': ' + label} aria-controls={id}
        onClick={() => inputRef.current?.focus()}
        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-gm-line-strong px-3 text-xs font-semibold text-gm-yellow transition-colors hover:bg-gm-yellow/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-50">
        <Pencil className="size-3.5" aria-hidden />{editLabel}
      </button>}
    </div>
    <div className={cn('overflow-hidden rounded-2xl border bg-gm-surface-2/60 transition-[border-color,box-shadow]', focused ? 'border-gm-yellow/60 shadow-[0_0_0_4px_hsl(var(--gm-yellow)/0.10)]' : 'border-gm-line-strong', disabled && 'opacity-60')}>
      <div onClick={() => inputRef.current?.focus()} className={cn('flex cursor-text items-baseline gap-2', compact ? 'px-3 py-1.5' : 'px-4 pb-3 pt-3.5')}>
        <span aria-hidden className="font-display text-2xl font-bold text-muted-foreground">$</span>
        <span className="relative min-w-0 flex-1">
          <input ref={inputRef} id={id} type="number" inputMode="numeric" min="0" step="1" max={max} required value={value} onChange={e => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} disabled={disabled} placeholder={placeholder ?? 'Otro importe'} aria-describedby={description ? id + '-help' : undefined}
            className={cn('h-10 w-full bg-transparent font-display text-[34px] font-bold leading-none tracking-tight tabular-nums outline-none placeholder:font-sans placeholder:text-[15px] placeholder:font-medium placeholder:tracking-normal placeholder:text-muted-foreground/70 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none', formateado && 'text-transparent')} />
          {formateado && <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex items-center font-display text-[34px] font-bold leading-none tracking-tight tabular-nums">{miles(numero)}</span>}
        </span>
        {status && <span className="shrink-0 self-center">{status}</span>}
      </div>
      {!!shortcuts.length && <div role="group" aria-label={'Opciones rápidas: ' + label} className={cn('grid border-t border-gm-line', shortcuts.length === 3 && 'grid-cols-2 sm:grid-cols-3')} style={shortcuts.length === 3 ? undefined : { gridTemplateColumns: `repeat(${shortcuts.length}, minmax(0, 1fr))` }}>
        {shortcuts.map((shortcut, index) => {
          const editar = 'edit' in shortcut;
          const elegido = !editar && value !== '' && Number(value) === shortcut.amount;
          const [nombre, importe] = shortcut.label.split(' · ');
          return <button key={index} type="button" disabled={disabled || shortcut.disabled} aria-pressed={editar ? undefined : elegido} aria-controls={editar ? id : undefined}
            onClick={() => { if ('edit' in shortcut) { inputRef.current?.focus(); inputRef.current?.select(); } else onChange(String(shortcut.amount)); }}
            className={cn('flex min-h-14 min-w-0 items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gm-yellow disabled:cursor-not-allowed disabled:opacity-40', elegido ? 'bg-gm-yellow/10 text-gm-yellow' : 'hover:bg-gm-surface-3/70', index > 0 && 'border-l border-gm-line', shortcuts.length === 3 && index === 2 && 'col-span-2 border-l-0 border-t sm:col-span-1 sm:border-l sm:border-t-0')}>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold leading-tight">{nombre}</span>
              {importe && <span className={cn('mt-0.5 block text-xs tabular-nums', elegido ? 'text-gm-yellow/80' : 'text-muted-foreground')}>{importe}</span>}
            </span>
            {editar ? <Pencil className="size-4 shrink-0 text-gm-yellow" aria-hidden /> : <span aria-hidden className={cn('grid size-5 shrink-0 place-items-center rounded-full border transition-colors', elegido ? 'border-gm-yellow bg-gm-yellow text-gm-ink' : 'border-gm-line-strong')}>{elegido && <Check className="size-3" strokeWidth={3} />}</span>}
          </button>;
        })}
      </div>}
    </div>
    {increments && <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={'Sumar importes: ' + label}>
      <span className="mr-1 text-xs text-muted-foreground">Sumá</span>
      {[500, 1000, 2000, 5000, 10000].map(amount => <button key={amount} type="button" disabled={disabled || (max !== undefined && Number(value || 0) + amount > max)} onClick={() => onChange(String((Number.isInteger(Number(value)) && Number(value) >= 0 ? Number(value) : 0) + amount))}
        className="inline-flex h-8 items-center gap-1 rounded-full border border-gm-line-strong bg-gm-surface-3/60 px-3 text-xs font-semibold tabular-nums transition-colors hover:border-gm-yellow/40 hover:text-gm-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:cursor-not-allowed disabled:opacity-40"><Plus className="size-3" aria-hidden />{cashMoney(amount)}</button>)}
    </div>}
    {description && <p id={id + '-help'} className="text-xs leading-relaxed text-muted-foreground">{description}</p>}
  </div>;
}
