'use client';
import { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const cashMoney = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
type Shortcut = { label: string; amount: number; disabled?: boolean };
export function CashAmountField({ id, label, value, onChange, disabled, max, placeholder, shortcuts = [], increments = false, description }: {
  id: string; label: string; value: string; onChange: (value: string) => void;
  disabled?: boolean; max?: number; placeholder?: string; shortcuts?: Shortcut[]; increments?: boolean; description?: ReactNode;
}) {
  return <div className="space-y-2.5">
    <Label htmlFor={id}>{label}</Label>
    <div className="relative"><span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">$</span><Input id={id} type="number" inputMode="numeric" min="0" step="1" max={max} required value={value} onChange={e => onChange(e.target.value)} disabled={disabled} placeholder={placeholder ?? 'Otro importe'} aria-describedby={description ? id + '-help' : undefined} className="h-11 pl-8 text-base font-semibold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" /></div>
    {!!shortcuts.length && <div className="flex flex-wrap gap-2" role="group" aria-label={'Opciones rápidas: ' + label}>{shortcuts.map((shortcut, index) => <Button key={index} type="button" size="sm" variant="outline" className="h-auto min-h-9 whitespace-normal rounded-lg py-2 text-left aria-pressed:border-gm-yellow/50 aria-pressed:bg-gm-yellow/10 aria-pressed:text-gm-yellow" disabled={disabled || shortcut.disabled} aria-pressed={value !== '' && Number(value) === shortcut.amount} onClick={() => onChange(String(shortcut.amount))}>{shortcut.label}</Button>)}</div>}
    {increments && <div className="space-y-1.5"><p className="text-xs text-muted-foreground">Sumá con un toque</p><div className="flex flex-wrap gap-1.5" role="group" aria-label={'Sumar importes: ' + label}>{[500, 1000, 2000, 5000, 10000].map(amount => <Button key={amount} type="button" size="sm" variant="secondary" className="min-h-9 rounded-lg px-2.5 tabular-nums" disabled={disabled || (max !== undefined && Number(value || 0) + amount > max)} onClick={() => onChange(String((Number.isInteger(Number(value)) && Number(value) >= 0 ? Number(value) : 0) + amount))}><Plus className="size-3" />{cashMoney(amount)}</Button>)}</div></div>}
    {description && <p id={id + '-help'} className="text-xs leading-relaxed text-muted-foreground">{description}</p>}
  </div>;
}
