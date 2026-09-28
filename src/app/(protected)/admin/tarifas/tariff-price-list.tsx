'use client';

import { useEffect, useRef, useState } from 'react';
import { Clock3, Copy, Moon, Plus, Sun, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TariffBracket, TariffDraft } from '@/types/tariff-plan.type';
import { bracketLabel } from '@/utils/tariff-plan.utils';
import { DurationField, MoneyField } from './tariff-form-fields';

import { TariffSelect, tariffScheduleOptions } from './tariff-select';

type Vehicle = { code: string; name: string; enabled: boolean };
export function TariffPriceList({ draft, onChange, vehicles, night, onEnableNight }: {
  draft: TariffDraft; onChange: (draft: TariffDraft) => void; vehicles: Vehicle[]; night: boolean; onEnableNight: () => void;
}) {
  const keys = useRef(new WeakMap<TariffBracket, string>());
  const nextKey = useRef(0);
  const container = useRef<HTMLDivElement>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const keyFor = (row: TariffBracket) => {
    if (row.id) return row.id;
    let key = keys.current.get(row);
    if (!key) { key = 'draft-' + nextKey.current++; keys.current.set(row, key); }
    return key;
  };
  useEffect(() => {
    if (!copiedKey) return;
    const row = container.current?.querySelector('[data-row-key="' + copiedKey + '"]');
    const field = row?.querySelector<HTMLElement>('[role="combobox"][aria-label$=": horario"]') ?? row?.querySelector<HTMLInputElement>('input[aria-label*="precio"]');
    field?.focus({ preventScroll: true });
    row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [copiedKey]);
  const availableEndingScopes = (row: TariffBracket) => (['DAY', 'NIGHT', null] as const).filter(scope =>
    !draft.brackets.some(other => other.vehicleType === row.vehicleType && other.uptoMinutes === null && other.ticketDayType === scope));
  const duplicate = (index: number) => {
    const { id: _id, ...copy } = draft.brackets[index];
    if (copy.uptoMinutes === null) {
      const scopes = availableEndingScopes(copy);
      if (!scopes.length) return;
      copy.ticketDayType = scopes[0];
      if (copy.ticketDayType !== null) onEnableNight();
    }
    const brackets = [...draft.brackets];
    brackets.splice(index + 1, 0, copy);
    setCopiedKey(keyFor(copy));
    onChange({ ...draft, brackets });
  };
  const update = (index: number, patch: Partial<TariffBracket>, relabel = false) => {
    const row = { ...draft.brackets[index], ...patch };
    keys.current.set(row, keyFor(draft.brackets[index]));
    if (relabel) row.label = bracketLabel(row);
    onChange({ ...draft, brackets: draft.brackets.map((previous, i) => i === index ? row : previous) });
  };
  const remove = (index: number) => onChange({ ...draft, brackets: draft.brackets.filter((_, i) => i !== index) });
  const add = (vehicleType: string, open: boolean, scope: TariffBracket['ticketDayType'] = null) => {
    if (open && draft.brackets.some(row => row.vehicleType === vehicleType && row.uptoMinutes === null && row.ticketDayType === scope)) return;
    if (scope !== null) onEnableNight();
    const rows = draft.brackets.filter(row => row.vehicleType === vehicleType);
    const last = Math.max(0, ...rows.map(row => Number.isFinite(row.uptoMinutes) ? row.uptoMinutes ?? 0 : 0));
    const row: TariffBracket = { vehicleType, ticketDayType: scope, label: '', uptoMinutes: open ? null : Math.min(last + 60, 5256000), price: NaN, recurringUnitMinutes: open ? 60 : null, recurringPriceMode: 'FIXED' };
    row.label = bracketLabel(row);
    onChange({ ...draft, brackets: [...draft.brackets, row] });
  };
  const scheduleField = (row: TariffBracket, index: number, name: string) => night && <label className="block min-w-0 space-y-2 text-sm font-medium">
    <span className="block">Se aplica</span>
    <TariffSelect name={name + ': horario'} value={row.ticketDayType ?? 'ANY'} onValueChange={value => update(index, { ticketDayType: value === 'ANY' ? null : value as 'DAY' | 'NIGHT' })} options={tariffScheduleOptions.filter(option => row.uptoMinutes !== null || !draft.brackets.some((other, otherIndex) => otherIndex !== index && other.vehicleType === row.vehicleType && other.uptoMinutes === null && (other.ticketDayType ?? 'ANY') === option.value))} />
  </label>;
  const removeButton = (row: TariffBracket, index: number, vehicle: Vehicle) => <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground hover:text-destructive" aria-label={'Quitar ' + row.label + ' de ' + vehicle.name} onClick={() => remove(index)}><Trash2 className="size-4" aria-hidden="true" /></Button>;

  const rowActions = (row: TariffBracket, index: number, vehicle: Vehicle) => <div className="flex items-center">
    <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground hover:text-amber-500" title="Copiar precio" disabled={row.uptoMinutes === null && !availableEndingScopes(row).length} aria-label={'Copiar ' + row.label + ' de ' + vehicle.name} onClick={() => duplicate(index)}><Copy className="size-4" aria-hidden="true" /></Button>
    {removeButton(row, index, vehicle)}
  </div>;

  return <div ref={container} className="space-y-5">
    <p className="text-sm leading-relaxed text-muted-foreground">Agregá una fila por duración y cargá su precio en pesos. Se ordenan de menor a mayor duración. Usá el botón de copiar para crear otra fila con el mismo precio.</p>
    {copiedKey && <p role="status" className="text-sm text-amber-600 dark:text-amber-400">Precio copiado. Revisá el horario, la duración y el importe de la nueva fila.</p>}
    {night && <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">Los precios de día o noche reemplazan al de “Todo el día” para la misma duración.</p>}
    {vehicles.map(vehicle => {
      const rows = draft.brackets.map((row, index) => ({ row, index })).filter(({ row }) => row.vehicleType === vehicle.code);
      const durations = rows.filter(({ row }) => row.uptoMinutes !== null).sort((a, b) =>
        (Number.isFinite(a.row.uptoMinutes) ? a.row.uptoMinutes! : Infinity) - (Number.isFinite(b.row.uptoMinutes) ? b.row.uptoMinutes! : Infinity));
      const scopeOrder = { ANY: 0, DAY: 1, NIGHT: 2 };
      const endings = rows.filter(({ row }) => row.uptoMinutes === null).sort((a,b) => scopeOrder[a.row.ticketDayType ?? 'ANY'] - scopeOrder[b.row.ticketDayType ?? 'ANY']);
      return <fieldset data-tariff-price-list key={vehicle.code} className="min-w-0 overflow-hidden rounded-xl border bg-card">
        <legend className="sr-only">Precios de {vehicle.name}</legend>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3 sm:px-5">
          <h4 className="font-semibold">{vehicle.name}</h4>
          <span className="text-xs text-muted-foreground">{vehicle.enabled ? 'Importes en pesos argentinos' : 'Vehículo deshabilitado · precios conservados'}</span>
        </div>
        <div className="px-4 sm:px-5">
          {!durations.length && <div className="py-6"><p className="text-sm font-medium">Empezá con la primera duración</p><p className="mt-1 text-sm text-muted-foreground">Por ejemplo, el precio de 30 minutos o de 1 hora.</p></div>}
          {durations.map(({ row, index }, position) => <div key={keyFor(row)} data-row-key={keyFor(row)} data-tariff-duration className="relative border-b py-4 last:border-0">
            <div className="mb-3 flex items-center justify-between gap-2 sm:hidden"><span className="text-xs font-medium text-muted-foreground">Precio {position + 1}</span>{rowActions(row, index, vehicle)}</div>
            <div className={'grid items-end gap-3 ' + (night ? 'sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_88px] xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_88px]' : 'sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_88px]')}>
              <div className="sm:col-start-1 sm:row-start-1"><DurationField commitOnBlur label="Hasta" name={vehicle.name + ': duración ' + (position + 1)} value={row.uptoMinutes!} onChange={value => update(index, { uptoMinutes: value }, true)} /></div>
              <div className="sm:col-start-2 sm:row-start-1"><MoneyField label="Precio total" name={vehicle.name + ': precio ' + (position + 1)} value={row.price} onChange={value => update(index, { price: value })} /></div>
              {night && <div className="sm:col-span-2 sm:col-start-1 sm:row-start-2 xl:col-span-1 xl:col-start-3 xl:row-start-1">{scheduleField(row, index, vehicle.name + ': duración ' + (position + 1))}</div>}
              <div className={'hidden sm:col-start-3 sm:row-start-1 sm:block ' + (night ? 'xl:col-start-4' : '')}>{rowActions(row, index, vehicle)}</div>
            </div>
          </div>)}
          <div className="pb-4 pt-2"><Button type="button" size="sm" variant="outline" onClick={() => add(vehicle.code, false)}><Plus className="mr-1 size-4" aria-hidden="true" />Agregar duración</Button></div>
        </div>
        <div className="space-y-4 border-t bg-muted/15 p-4 sm:p-5">
          <div><h5 className="text-sm font-semibold">Si se queda más tiempo</h5><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Definí el cobro posterior de este vehículo. Podés usar una regla de día y otra de noche, con importes y formas de cobro distintos.</p></div>
          {!endings.length && <p className="text-sm text-muted-foreground">Sin una regla adicional, se usa el último importe disponible. Comprobá el resultado en el simulador.</p>}
          {endings.map(({ row, index }, position) => <div key={keyFor(row)} data-row-key={keyFor(row)} data-tariff-ending={row.ticketDayType ?? 'ANY'} className="space-y-4 rounded-xl border bg-card p-3 sm:p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
              {row.ticketDayType === 'DAY' ? <Sun className="size-4" aria-hidden="true" /> : row.ticketDayType === 'NIGHT' ? <Moon className="size-4" aria-hidden="true" /> : <Clock3 className="size-4" aria-hidden="true" />}
              {row.ticketDayType === 'DAY' ? 'Cobro posterior de día' : row.ticketDayType === 'NIGHT' ? 'Cobro posterior de noche' : 'Cobro posterior general'}
            </div>
            <div className="flex items-start justify-between gap-3">
              <label className="block min-w-0 flex-1 space-y-2 text-sm font-medium"><span className="block">Cómo seguir cobrando</span><TariffSelect name={vehicle.name + ': cobro posterior ' + (position + 1)} value={row.recurringUnitMinutes === null ? 'TOTAL' : 'EXTRA'} onValueChange={value => update(index, { recurringUnitMinutes: value === 'EXTRA' ? 60 : null, recurringPriceMode: row.recurringPriceMode ?? 'DERIVED' }, true)} options={[{ value: 'EXTRA', label: 'Sumar un adicional', description: 'Se suma al precio de la última duración.' }, { value: 'TOTAL', label: 'Cobrar un total fijo', description: 'Un único precio para toda la estadía.' }]} /></label>
              <div className="pt-7">{rowActions(row, index, vehicle)}</div>
            </div>
            <div className="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {row.recurringUnitMinutes !== null && <DurationField label="Por cada" name={vehicle.name + ': período adicional ' + (position + 1)} value={row.recurringUnitMinutes} onChange={value => update(index, { recurringUnitMinutes: value }, true)} />}
              <MoneyField label={row.recurringUnitMinutes === null ? 'Precio total de la estadía' : row.recurringPriceMode === 'FIXED' ? 'Precio del adicional' : 'Precio de respaldo'} name={vehicle.name + ': precio posterior ' + (position + 1)} value={row.price} onChange={value => update(index, { price: value })} />
              {scheduleField(row, index, vehicle.name + ': regla posterior ' + (position + 1))}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{row.recurringUnitMinutes !== null ? 'Se suma al precio de la última duración. Se cobra cada adicional que empieza.' : 'Este es el total a pagar por la estadía; no se suma a los precios anteriores.'}</p>
            {row.recurringUnitMinutes !== null && <details open={row.recurringPriceMode !== 'FIXED' || undefined} className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">Cálculo del adicional{row.recurringPriceMode !== 'FIXED' ? ' · configuración anterior' : ' · avanzado'}</summary>
              <label className="mt-3 block space-y-2"><span className="sr-only">Modo del precio adicional</span><TariffSelect name={vehicle.name + ': cálculo del adicional ' + (position + 1)} value={row.recurringPriceMode ?? 'DERIVED'} onValueChange={value => update(index, { recurringPriceMode: value as 'FIXED' | 'DERIVED' })} options={[{ value: 'FIXED', label: 'Usar el precio del adicional' }, { value: 'DERIVED', label: 'Calcular con los otros precios de la lista' }]} /></label>
              {row.recurringPriceMode !== 'FIXED' && <p className="mt-2 text-xs text-muted-foreground">Conserva el cálculo anterior: usa una duración equivalente o proporcional de la lista. El precio de respaldo sólo se usa si no hay una referencia.</p>}
            </details>}
          </div>)}
          <div className="flex flex-wrap gap-2">
            {!night && !endings.length && <Button type="button" variant="outline" size="sm" onClick={() => add(vehicle.code, true)}><Plus className="mr-1 size-4" aria-hidden="true" />Definir cobro posterior</Button>}
            {!endings.some(({ row }) => row.ticketDayType === 'DAY') && <Button type="button" variant="outline" size="sm" onClick={() => add(vehicle.code, true, 'DAY')}><Sun className="mr-2 size-4" aria-hidden="true" />Agregar cobro de día</Button>}
            {!endings.some(({ row }) => row.ticketDayType === 'NIGHT') && <Button type="button" variant="outline" size="sm" onClick={() => add(vehicle.code, true, 'NIGHT')}><Moon className="mr-2 size-4" aria-hidden="true" />Agregar cobro de noche</Button>}
          </div>
          {endings.some(({ row }) => row.ticketDayType === null) && night && <p className="text-xs text-muted-foreground">La regla de día o noche reemplaza al cobro general en ese horario.</p>}
        </div>
      </fieldset>;
    })}
    <p className="text-xs leading-relaxed text-muted-foreground">El cálculo puede combinar duraciones de la lista. Usá el simulador para comprobar cuánto se cobra en cada caso.</p>
  </div>;
}
