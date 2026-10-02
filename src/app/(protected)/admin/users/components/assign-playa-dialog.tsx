'use client';
import { DataLoading } from '@/components/ui/data-loading';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, MapPin, Pencil } from 'lucide-react';
import { User } from '@/types/user.type';
import { operatorPlayaAction } from '@/actions/tenancy/context.action';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

type Playa = { id: string; nombre: string };

export function AssignPlayaDialog({ user, assigned }: { user: User; assigned: Playa | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playas, setPlayas] = useState<Playa[]>([]);
  const [current, setCurrent] = useState<Playa | null>(assigned);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');

  useEffect(() => setCurrent(assigned), [assigned?.id, assigned?.nombre]);

  async function abrir() {
    setOpen(true);
    setLoading(true);
    setError('');
    const result = await operatorPlayaAction(user.id);
    if (result.error) setError(result.error);
    else {
      const available = result.playas ?? [];
      setPlayas(available);
      setSelected(result.playaId ?? '');
      setCurrent(available.find(playa => playa.id === result.playaId) ?? null);
    }
    setLoading(false);
  }

  async function guardar() {
    setLoading(true);
    setError('');
    const result = await operatorPlayaAction(user.id, selected);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    setCurrent(playas.find(playa => playa.id === result.playaId) ?? null);
    toast.success('Playa del operador actualizada.');
    setOpen(false);
    router.refresh();
  }

  return <>
    <div className="flex min-w-[180px] items-center gap-2">
      {current ? <>
        <span className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-gm-yellow/25 bg-gm-yellow/5 px-2.5 py-1.5 text-sm font-medium"><MapPin className="size-3.5 shrink-0 text-gm-yellow" /><span className="truncate">{current.nombre}</span></span>
        <Button type="button" variant="ghost" size="icon" aria-label={`Cambiar playa de ${user.firstName} ${user.lastName}`} title="Cambiar playa" className="size-8 shrink-0 text-muted-foreground hover:text-gm-yellow" onClick={abrir}><Pencil className="size-3.5" /></Button>
      </> : <Button type="button" variant="outline" size="sm" onClick={abrir}>Asignar playa</Button>}
    </div>

    <Dialog open={open} onOpenChange={value => { if (!loading) setOpen(value); }}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
        <DialogHeader>
          <DialogTitle>Playa de {user.firstName}</DialogTitle>
          <DialogDescription>Elegí la playa donde trabajará este operador. El cambio se aplica a su próximo ingreso.</DialogDescription>
        </DialogHeader>
        {loading && !playas.length ? <DataLoading label="Cargando playas…" /> : <fieldset disabled={loading} className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">Playa asignada</legend>
          {playas.map(playa => <label key={playa.id} className="group flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-border bg-background/50 px-4 py-3 transition-colors hover:border-gm-yellow/50 has-[:checked]:border-gm-yellow has-[:checked]:bg-gm-yellow/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gm-yellow">
            <input type="radio" name={`playa-${user.id}`} value={playa.id} checked={selected === playa.id} onChange={() => setSelected(playa.id)} className="sr-only" />
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground group-has-[:checked]:bg-gm-yellow/15 group-has-[:checked]:text-gm-yellow"><MapPin className="size-4" /></span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{playa.nombre}</span>
            {selected === playa.id && <Check className="size-4 shrink-0 text-gm-yellow" aria-hidden />}
          </label>)}
          {!playas.length && !error && <p className="text-sm text-muted-foreground">La empresa todavía no tiene playas creadas.</p>}
        </fieldset>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="button" onClick={guardar} disabled={loading || !selected || selected === current?.id}>{current ? 'Guardar cambio' : 'Asignar playa'}</Button>
      </DialogContent>
    </Dialog>
  </>;
}
