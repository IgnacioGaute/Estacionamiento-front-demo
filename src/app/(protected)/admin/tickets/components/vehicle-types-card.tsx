 'use client';
import { useState, useTransition } from 'react';
import { toast } from '@/lib/toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useVehicleTypes } from '@/components/vehicle-type-options';
import { saveVehicleTypeAction } from '@/actions/tickets/vehicle-types.action';
export function VehicleTypesCard() {
  const { types, error, loading } = useVehicleTypes();
  const [code, setCode] = useState(''); const [codeEdited, setCodeEdited] = useState(false); const [name, setName] = useState('');
  const [names, setNames] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const save = (id: string | null, values: { code?: string; name?: string; enabled?: boolean }) => startTransition(async () => {
    const result = await saveVehicleTypeAction(id, values);
    if (result.error) toast.error(result.error);
    else { toast.success('Vehículo guardado'); window.dispatchEvent(new Event('vehicle-types-updated')); if (!id) { setCode(''); setName(''); setCodeEdited(false); } }
  });
  return <section className="space-y-4 rounded-xl border p-4">
    <p className="rounded-lg bg-gm-yellow/5 p-3 text-sm text-muted-foreground">Cada playa nueva empieza con Auto. Podés cambiar su nombre, desactivarlo o agregar otros tipos de vehículo.</p>
    <div><h2 className="text-lg font-semibold">¿Qué vehículos recibís?</h2><p className="text-sm text-muted-foreground">Agregá los que necesitás. Al desactivar uno, deja de aparecer para nuevos ingresos. Los vehículos que ya entraron pueden salir normalmente.</p></div>
    {error && <p role="alert" className="text-destructive">{error}</p>}{loading && <p>Cargando vehículos…</p>}
    <div className="space-y-2">{types.map(t => <div key={t.code} className="flex flex-wrap items-center gap-3 rounded-lg border p-3"><div className="flex-1 min-w-40"><Label htmlFor={`name-${t.code}`}>Nombre del vehículo</Label><Input id={`name-${t.code}`} value={names[t.code] ?? t.name} onChange={e => setNames({ ...names, [t.code]: e.target.value })} maxLength={80} disabled={pending} /><p className="text-xs text-muted-foreground mt-1">Código: {t.code}</p></div><Button size="sm" variant="outline" disabled={pending || !(names[t.code] ?? t.name).trim()} onClick={() => save(t.code, { name: names[t.code] ?? t.name })}>Guardar nombre</Button><Switch aria-label={`Recibir ${t.name}`} checked={t.enabled} disabled={pending} onCheckedChange={enabled => save(t.code, { enabled })} /><span className="text-sm">{t.enabled ? 'Se reciben' : 'No se reciben'}</span></div>)}</div>
    <form onSubmit={e => { e.preventDefault(); save(null, { code, name }); }} className="space-y-3 border-t pt-4"><h3 className="font-medium">Agregar otro vehículo</h3><div className="flex flex-wrap items-end gap-3"><div className="space-y-1"><Label htmlFor="vehicle-name">Nombre que verá el operador</Label><Input id="vehicle-name" placeholder="Por ejemplo: Moto" maxLength={80} required value={name} onChange={e => { setName(e.target.value); if (!codeEdited) setCode(e.target.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0,32)); }} disabled={pending} /></div><div className="space-y-1"><Label htmlFor="vehicle-code">Código corto y único</Label><Input id="vehicle-code" placeholder="MOTO" pattern="[A-Z][A-Z0-9_]{0,31}" maxLength={32} required value={code} onChange={e => { setCodeEdited(true); setCode(e.target.value.toUpperCase()); }} disabled={pending} /></div><Button disabled={pending}>Agregar vehículo</Button></div><p className="text-xs text-muted-foreground">El código se elige una sola vez. Después de agregar el vehículo, cargá su precio en Precios por duración o en Cómo cobrar antes de registrar su primera entrada.</p></form>
  </section>;
}
