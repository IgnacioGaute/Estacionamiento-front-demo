 'use client';
import { forwardRef, useEffect, useState } from 'react';
import { Bike, CarFront, Check, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import LatticeLoader from '@/components/ui/lattice-loader';
import { getVehicleTypesAction, VehicleTypeItem } from '@/actions/tickets/vehicle-types.action';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
export function useVehicleTypes() {
  const [types, setTypes] = useState<VehicleTypeItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    const load = () => { setLoading(true); getVehicleTypesAction().then(rows => { if (alive) { setTypes(rows); setError(''); } }).catch(() => { if (alive) setError('No se pudieron cargar los vehículos.'); }).finally(() => { if (alive) setLoading(false); }); };
    load(); window.addEventListener('vehicle-types-updated', load);
    return () => { alive = false; window.removeEventListener('vehicle-types-updated', load); };
  }, []);
  return { types, error, loading };
}
export function VehicleTypeOptions() {
  const { types, error, loading } = useVehicleTypes();
  return <>{types.filter(t => t.enabled).map(t => <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>)}{(loading || error) && <SelectItem disabled value="__status">{error || <LatticeLoader label="Cargando vehículos…" showTimer={false} cellSize={4} gap={1} fontSize={12} />}</SelectItem>}</>;
}
export function VehicleTypePicker({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const { types, error, loading } = useVehicleTypes();
  const active = types.filter(t => t.enabled);
  const selected = active.find(t => t.code === value);
  const placeholder = loading ? 'Cargando vehículos…' : error ? 'No se pudieron cargar' : active.length ? 'Elegir vehículo' : 'No hay vehículos habilitados';
  if (loading && !active.length) return <div aria-label="Cargando tipos de vehículo" className="space-y-2"><LatticeLoader label="Cargando vehículos…" showTimer={false} cellSize={4} gap={1} fontSize={12} /></div>;
  return <Select key={loading ? 'loading' : 'ready'} value={value} onValueChange={onChange} disabled={disabled || loading || !!error || !active.length}><SelectTrigger aria-label="Tipo de vehículo"><SelectValue placeholder={placeholder}>{selected?.name ?? placeholder}</SelectValue></SelectTrigger><SelectContent>{active.map(t => <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>)}</SelectContent></Select>;
}


export const VehicleTypeButtons = forwardRef<HTMLDivElement, {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onValidityChange?: (valid: boolean) => void;
  // El nombre del elegido, para repetirlo en el botón de confirmar («AB123CD · Auto»).
  onSelectedNameChange?: (name: string | null) => void;
}>(({ value, onChange, disabled, onValidityChange, onSelectedNameChange, ...props }, ref) => {
  const { types, error, loading } = useVehicleTypes();
  const active = types.filter(type => type.enabled);
  const valid = !loading && !error && active.some(type => type.code === value);
  const selectedName = active.find(type => type.code === value)?.name ?? null;
  useEffect(() => { onValidityChange?.(!!valid); }, [valid, onValidityChange]);
  useEffect(() => { onSelectedNameChange?.(selectedName); }, [selectedName, onSelectedNameChange]);
  // Con dos tipos, botones anchos con el ícono al costado; con más, en columnas y el ícono arriba.
  // Bajos a propósito: el diálogo de entrada tiene que entrar en la pantalla sin desplazar.
  const wide = active.length <= 2;
  return <div {...props} ref={ref}>
    {loading ? <LatticeLoader label="Cargando vehículos…" showTimer={false} cellSize={4} gap={1} fontSize={12} />
      : error ? <p role="alert" className="text-xs text-gm-orange">{error}</p>
      : !active.length ? <p role="alert" className="text-xs text-muted-foreground">No hay tipos de vehículo habilitados. Pedile al administrador que los configure.</p>
      : <>
        <div role="radiogroup" aria-label="Tipo de vehículo" className={cn('grid gap-2', wide ? 'grid-cols-2' : 'grid-cols-3')}>
          {active.map((type, index) => {
            const selected = value === type.code;
            const name = (type.code + ' ' + type.name).toLowerCase();
            const Icon = /moto|bici/.test(name) ? Bike : /camion|truck|utilitario/.test(name) ? Truck : CarFront;
            return <button key={type.code} type="button" role="radio" aria-checked={selected}
              tabIndex={selected || (!valid && index === 0) ? 0 : -1} disabled={disabled}
              onClick={() => onChange(type.code)}
              onKeyDown={event => {
                if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
                event.preventDefault();
                const step = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
                const next = (index + step + active.length) % active.length;
                onChange(active[next].code);
                event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
              }}
              className={cn('relative flex min-w-0 rounded-[14px] border-[1.5px] text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50',
                wide ? 'min-h-[52px] items-center gap-2.5 px-3.5 text-left text-[15px] font-semibold short:min-h-12' : 'min-h-[62px] flex-col items-center justify-center gap-1 px-2 py-2 text-[13px] font-semibold short:min-h-14',
                selected ? 'border-gm-yellow bg-gm-yellow/[0.12]' : 'border-gm-line-strong bg-gm-surface-2 hover:border-gm-yellow/40')}>
              <Icon className={cn('size-[22px] shrink-0', selected ? 'text-gm-yellow' : 'text-muted-foreground')} aria-hidden />
              <span className={cn('min-w-0 break-words leading-tight', wide ? 'flex-1' : 'w-full text-center')}>{type.name}</span>
              {selected && <span aria-hidden className={cn('grid size-5 place-items-center rounded-full bg-gm-yellow text-gm-ink', !wide && 'absolute right-1.5 top-1.5 size-4')}><Check className={wide ? 'size-3.5' : 'size-3'} strokeWidth={3} /></span>}
            </button>;
          })}
        </div>
        {!valid && <p className="mt-2 text-xs text-gm-orange">Elegí uno de los vehículos habilitados.</p>}
      </>}
  </div>;
});
VehicleTypeButtons.displayName = 'VehicleTypeButtons';
