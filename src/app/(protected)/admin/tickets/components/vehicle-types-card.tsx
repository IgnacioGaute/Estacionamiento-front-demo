'use client';
import { useState, useTransition } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bike, Bus, CarFront, Check, Plus, Truck } from 'lucide-react';
import { DataLoading } from '@/components/ui/data-loading';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useVehicleTypes } from '@/components/vehicle-type-options';
import { saveVehicleTypeAction } from '@/actions/tickets/vehicle-types.action';

// Los que más se suman después de Auto: un toque y quedan agregados con su código.
const SUGERENCIAS = ['Moto', 'Camioneta', 'Utilitario', 'Bicicleta'];
const codigoDe = (nombre: string) => nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/^[^A-Z]+/, '').slice(0, 32);
const sinAcentos = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// Mismo criterio que los botones de entrada, así el operador ve el mismo ícono.
const iconoDe = (nombre: string) => {
  const n = sinAcentos(nombre);
  return /moto|bici/.test(n) ? Bike : /combi|bus|colectivo/.test(n) ? Bus : /camion|truck|utilitario/.test(n) ? Truck : CarFront;
};
const LLEGADA = [0.16, 1, 0.3, 1] as const;

// sinEncabezado: la página ya lo titula (Configuración → Tipos de vehículo).
export function VehicleTypesCard({ enConfiguracionInicial = false, sinEncabezado = false }: { enConfiguracionInicial?: boolean; sinEncabezado?: boolean } = {}) {
  const { types, error, loading } = useVehicleTypes();
  const quieto = useReducedMotion();
  const [code, setCode] = useState(''); const [codeEdited, setCodeEdited] = useState(false); const [name, setName] = useState('');
  const [verCodigo, setVerCodigo] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const save = (id: string | null, values: { code?: string; name?: string; enabled?: boolean }) => startTransition(async () => {
    const result = await saveVehicleTypeAction(id, values);
    if (result.error) toast.error(result.error);
    else {
      toast.success(id ? 'Vehículo guardado' : `${values.name} agregado`);
      window.dispatchEvent(new Event('vehicle-types-updated'));
      if (id && values.name) setNames(({ [id]: _guardado, ...resto }) => resto);
      if (!id) { setCode(''); setName(''); setCodeEdited(false); setVerCodigo(false); }
    }
  });
  const existentes = new Set(types.flatMap(t => [t.code, sinAcentos(t.name)]));
  const sugerencias = SUGERENCIAS.filter(s => !existentes.has(codigoDe(s)) && !existentes.has(sinAcentos(s)));
  const activos = types.filter(t => t.enabled).length;

  return <section className={cn('space-y-5', !enConfiguracionInicial && 'rounded-2xl border border-gm-line bg-gm-surface p-4 sm:p-6')}>
    {!enConfiguracionInicial && !sinEncabezado && <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold">¿Qué vehículos recibís?</h2>
        <p className="mt-1 text-sm text-muted-foreground">Los activos aparecen al registrar una entrada. Pausar uno no afecta a los que ya están adentro.</p>
      </div>
      {!loading && types.length > 0 && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"><span className="text-gm-yellow">{activos}</span> de {types.length} activos</p>}
    </header>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {loading && !types.length ? <DataLoading label="Cargando vehículos…" /> : <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <AnimatePresence initial={false}>
        {types.map(t => {
          const Icon = iconoDe(t.name);
          const valor = names[t.code] ?? t.name;
          const cambiado = valor.trim() !== t.name && !!valor.trim();
          return <motion.li
            key={t.code}
            layout={quieto ? false : 'position'}
            initial={quieto ? false : { y: 16, scale: 0.97, filter: 'blur(6px)', clipPath: 'inset(0% 0% 100% 0% round 16px)' }}
            animate={{ y: 0, scale: 1, filter: 'blur(0px)', clipPath: 'inset(0% 0% 0% 0% round 16px)', transition: { duration: 0.55, ease: LLEGADA }, transitionEnd: { filter: 'none', clipPath: 'none' } }}
            className={cn('flex min-w-0 flex-col gap-4 rounded-2xl border p-4 transition-colors duration-300', t.enabled ? 'border-gm-line-strong bg-gm-surface-2' : 'border-gm-line bg-transparent')}
          >
            <div className="flex items-start justify-between gap-3">
              <span className={cn('grid size-12 shrink-0 place-items-center rounded-xl transition-colors duration-300', t.enabled ? 'bg-gm-yellow text-gm-ink' : 'bg-white/[0.05] text-muted-foreground')}>
                <Icon className="size-6" aria-hidden />
              </span>
              <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold">
                <span className={t.enabled ? 'text-foreground' : 'text-muted-foreground'}>{t.enabled ? 'Se recibe' : 'Pausado'}</span>
                <Switch aria-label={`Recibir ${t.name}`} checked={t.enabled} disabled={pending} onCheckedChange={enabled => save(t.code, { enabled })} />
              </label>
            </div>
            <form className="min-w-0" onSubmit={e => { e.preventDefault(); if (cambiado) save(t.code, { name: valor.trim() }); }}>
              <div className="flex items-center gap-1.5">
                <Input
                  aria-label={`Nombre de ${t.name}`}
                  value={valor}
                  maxLength={80}
                  disabled={pending}
                  onChange={e => setNames({ ...names, [t.code]: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Escape') setNames(({ [t.code]: _descartado, ...resto }) => resto); }}
                  className={cn('-ml-2 h-10 min-w-0 border-transparent bg-transparent px-2 text-lg font-semibold shadow-none md:text-lg hover:border-gm-line focus-visible:border-gm-line-strong', !t.enabled && 'text-muted-foreground')}
                />
                <AnimatePresence initial={false}>
                  {cambiado && <motion.span initial={{ scale: 0.6, filter: 'blur(4px)' }} animate={{ scale: 1, filter: 'blur(0px)' }} exit={{ scale: 0.6, filter: 'blur(4px)', transition: { duration: 0.15 } }}>
                    <Button type="submit" size="icon" className="size-9" disabled={pending} aria-label={`Guardar el nombre de ${t.name}`}><Check className="size-4" aria-hidden /></Button>
                  </motion.span>}
                </AnimatePresence>
              </div>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{cambiado ? 'Enter para guardar · Esc para descartar' : `Código ${t.code}`}</p>
            </form>
          </motion.li>;
        })}
      </AnimatePresence>

      <li className="flex min-w-0 flex-col gap-3 rounded-2xl border border-dashed border-gm-line-strong p-4 sm:col-span-2 lg:col-span-1">
        <p className="flex items-center gap-2 text-sm font-semibold"><span className="grid size-7 place-items-center rounded-lg bg-white/[0.06]"><Plus className="size-4" aria-hidden /></span>Agregar vehículo</p>
        {sugerencias.length > 0 && <div className="flex flex-wrap gap-2">
          {sugerencias.map(s => <button key={s} type="button" disabled={pending} onClick={() => save(null, { code: codigoDe(s), name: s })} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-gm-line-strong px-3 text-sm font-medium transition-colors hover:border-gm-yellow hover:text-gm-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-50">
            <Plus className="size-3.5" aria-hidden />{s}
          </button>)}
        </div>}
        <form onSubmit={e => { e.preventDefault(); if (name.trim() && code) save(null, { code, name: name.trim() }); }} className="space-y-2">
          <div className="flex gap-2">
            <Input id="vehicle-name" aria-label="Nombre que verá el operador" placeholder={sugerencias.length ? 'Otro: Combi…' : 'Por ejemplo: Combi'} maxLength={80} required value={name} onChange={e => { setName(e.target.value); if (!codeEdited) setCode(codigoDe(e.target.value)); }} disabled={pending} className="min-w-0 flex-1" />
            <Button disabled={pending || !name.trim() || !code}>Agregar</Button>
          </div>
          {verCodigo
            ? <Input id="vehicle-code" aria-label="Código corto y único" placeholder="COMBI" pattern="[A-Z][A-Z0-9_]{0,31}" maxLength={32} required value={code} onChange={e => { setCodeEdited(true); setCode(e.target.value.toUpperCase()); }} disabled={pending} className="font-mono uppercase" />
            : name.trim() && <p className="text-xs text-muted-foreground">Código <span className="font-mono text-foreground">{code || '—'}</span> · <button type="button" onClick={() => setVerCodigo(true)} className="underline underline-offset-2 hover:text-foreground">cambiar</button></p>}
        </form>
      </li>
    </ul>}
    <p className="text-xs leading-relaxed text-muted-foreground">
      {enConfiguracionInicial
        ? 'El código se elige una sola vez. Los precios de cada vehículo los cargás en el paso siguiente.'
        : 'El código se elige una sola vez. A un vehículo nuevo cargale su precio en Tarifas antes de registrar su primera entrada.'}
    </p>
  </section>;
}
