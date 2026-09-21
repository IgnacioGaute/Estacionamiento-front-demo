 'use client';
import { useEffect, useState } from 'react';
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
  return <>{types.filter(t => t.enabled).map(t => <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>)}{(loading || error) && <SelectItem disabled value="__status">{error || 'Cargando…'}</SelectItem>}</>;
}
export function VehicleTypePicker({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const { types, error, loading } = useVehicleTypes();
  const active = types.filter(t => t.enabled);
  const selected = active.find(t => t.code === value);
  const placeholder = loading ? 'Cargando vehículos…' : error ? 'No se pudieron cargar' : active.length ? 'Elegir vehículo' : 'No hay vehículos habilitados';
  return <Select key={loading ? 'loading' : 'ready'} value={value} onValueChange={onChange} disabled={disabled || loading || !!error || !active.length}><SelectTrigger aria-label="Tipo de vehículo"><SelectValue placeholder={placeholder}>{selected?.name ?? placeholder}</SelectValue></SelectTrigger><SelectContent>{active.map(t => <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>)}</SelectContent></Select>;
}
