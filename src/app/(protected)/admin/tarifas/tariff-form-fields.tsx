'use client';

import { useId, useState } from 'react';
import { Input } from '@/components/ui/input';

import { TariffSelect } from './tariff-select';
export const fieldValue = (value: number | undefined) => Number.isFinite(value) ? value : '';
export const fieldNumber = (value: string) => value === '' ? NaN : Number(value);

export function MoneyField({ label, name, value, onChange, max = 2147483647 }: {
  label: string; name: string; value: number | undefined; onChange: (value: number) => void; max?: number;
}) {
  const id = useId();
  return <div className="min-w-0 space-y-2">
    <label htmlFor={id} className="block text-sm font-medium">{label}</label>
    <div className="relative">
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">$</span>
      <Input id={id} aria-label={name} type="number" inputMode="numeric" min={0} max={max} step={1}
        placeholder="0" value={fieldValue(value)} onChange={event => onChange(fieldNumber(event.target.value))}
        className="h-11 rounded-lg pl-8 tabular-nums" />
    </div>
  </div>;
}

export function DurationField({ label, name, value, onChange, max = 5256000, commitOnBlur = false }: {
  label: string; name: string; value: number; onChange: (value: number) => void; max?: number; commitOnBlur?: boolean;
}) {
  const id = useId();
  const [editing, setEditing] = useState<string | null>(null);
  const [unit, setUnit] = useState(() => value > 0 && value % 1440 === 0 ? 1440 : value > 0 && value % 60 === 0 ? 60 : 1);
  return <div className="min-w-0 space-y-2">
    <label htmlFor={id} className="block text-sm font-medium">{label}</label>
    <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-2">
      <Input id={id} aria-label={name} type="number" inputMode="decimal" min={0} max={max / unit} step="any"
        placeholder="Ej. 1" value={editing ?? fieldValue(value / unit)} className="h-11 min-w-0 rounded-lg tabular-nums"
        onChange={event => commitOnBlur ? setEditing(event.target.value) : onChange(fieldNumber(event.target.value) * unit)}
        onBlur={() => { if (editing !== null) { onChange(fieldNumber(editing) * unit); setEditing(null); } }}
        onKeyDown={event => { if (commitOnBlur && event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} />
      <TariffSelect compact name={name + ': unidad'} value={String(unit)} onValueChange={value => setUnit(Number(value))} options={[{ value: '1', label: 'minutos' }, { value: '60', label: 'horas' }, { value: '1440', label: 'días' }]} />
    </div>
  </div>;
}
