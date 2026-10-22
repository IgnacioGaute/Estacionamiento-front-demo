'use client';

// Destino del super admin: la plataforma o una playa. Opciones en tarjetas (radios nativos, con
// teclado y lector de pantalla) en vez de un <select>, cuyo desplegable dibujaba el navegador en
// blanco y celeste. Con muchas playas aparece un buscador y la lista se desplaza.

import { useState, useTransition, type ReactNode } from 'react';
import { ArrowRight, Check, LayoutDashboard, Loader2, LogOut, MapPin, Search } from 'lucide-react';
import { selectPlayaAction, selectPlatformAction, type OperationalContext } from '@/actions/tenancy/context.action';
import { logoutAction } from '@/actions/auth/logout.action';
import { PLATFORM_HOME, PLATFORM_SELECTION } from '@/lib/access-scope';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Desde cuántas playas conviene buscar en vez de recorrer la lista.
const CON_BUSCADOR = 6;

function Opcion({ value, seleccion, onElegir, icono, titulo, detalle }: {
  value: string;
  seleccion: string;
  onElegir: (value: string) => void;
  icono: ReactNode;
  titulo: string;
  detalle?: string;
}) {
  const elegida = seleccion === value;
  return (
    <label
      className={cn(
        'flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gm-yellow',
        elegida ? 'border-gm-yellow/50 bg-gm-yellow/[0.06]' : 'border-white/[0.08] bg-[#14120F] hover:border-white/[0.16]',
      )}
    >
      <input type="radio" name="destino" value={value} checked={elegida} onChange={() => onElegir(value)} className="sr-only" />
      <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', elegida ? 'bg-gm-yellow text-gm-ink' : 'bg-white/[0.05] text-muted-foreground')}>
        {icono}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[14px] font-medium text-foreground">{titulo}</span>
        {detalle && <span className="truncate text-[12.5px] text-muted-foreground">{detalle}</span>}
      </span>
      <span aria-hidden className={cn('grid size-5 shrink-0 place-items-center rounded-full border', elegida ? 'border-gm-yellow bg-gm-yellow text-gm-ink' : 'border-white/20')}>
        {elegida && <Check className="size-3" strokeWidth={3} />}
      </span>
    </label>
  );
}

export function AccessSelector({ playas, loadError = '' }: { playas: OperationalContext['playas']; loadError?: string }) {
  const [selection, setSelection] = useState(PLATFORM_SELECTION);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const [navigating, setNavigating] = useState(false);
  const busy = pending || navigating;
  const platform = selection === PLATFORM_SELECTION;
  const texto = busqueda.trim().toLocaleLowerCase('es-AR');
  const visibles = texto ? playas.filter(p => p.nombre.toLocaleLowerCase('es-AR').includes(texto)) : playas;

  const elegir = (value: string) => { setSelection(value); setError(''); };

  function enter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    startTransition(async () => {
      try {
        const result = platform ? await selectPlatformAction() : await selectPlayaAction(selection);
        if (result.error) { setError(result.error); return; }
        // La recarga descarta el estado y la caché de navegación del ámbito anterior.
        setNavigating(true);
        window.location.assign(platform ? PLATFORM_HOME : '/tickets');
      } catch {
        setError('No se pudo ingresar. Intentá de nuevo.');
      }
    });
  }

  return (
    <>
      <form onSubmit={enter} className="space-y-5">
        <fieldset disabled={busy} className="m-0 min-w-0 space-y-4 border-0 p-0 disabled:opacity-60">
          <legend className="sr-only">Destino</legend>
          <Opcion
            value={PLATFORM_SELECTION}
            seleccion={selection}
            onElegir={elegir}
            icono={<LayoutDashboard className="size-[18px]" aria-hidden />}
            titulo="Plataforma"
            detalle="Empresas, playas, usuarios, planes y métricas"
          />

          {playas.length > 0 && (
            <div className="space-y-2">
              <p className="m-0 text-[12.5px] font-medium text-muted-foreground">
                Trabajar en una playa · {playas.length}
              </p>
              {playas.length > CON_BUSCADOR && (
                <label className="flex h-10 items-center gap-2 rounded-lg border border-white/[0.08] bg-[#14120F] px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-gm-yellow">
                  <Search className="size-4 shrink-0" aria-hidden />
                  <span className="sr-only">Buscar playa</span>
                  <input
                    type="search"
                    value={busqueda}
                    onChange={event => setBusqueda(event.target.value)}
                    placeholder="Buscar playa"
                    className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </label>
              )}
              <div className="-mr-1 flex max-h-[296px] flex-col gap-2 overflow-y-auto pr-1">
                {visibles.map(playa => (
                  <Opcion
                    key={playa.id}
                    value={playa.id}
                    seleccion={selection}
                    onElegir={elegir}
                    icono={<MapPin className="size-[18px]" aria-hidden />}
                    titulo={playa.nombre}
                  />
                ))}
                {!visibles.length && <p className="py-3 text-center text-sm text-muted-foreground">Ninguna playa coincide con «{busqueda.trim()}».</p>}
              </div>
            </div>
          )}
        </fieldset>

        {loadError && <div role="alert" className="space-y-2 text-sm text-muted-foreground"><p>{loadError}</p><button type="button" disabled={busy} className="underline" onClick={() => window.location.reload()}>Volver a cargar las playas</button></div>}
        {!loadError && playas.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay playas disponibles. Podés crearlas desde la plataforma.</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={busy} className="h-12 w-full gap-2 rounded-xl bg-gm-yellow font-semibold text-gm-ink hover:bg-gm-yellow/90">
          {busy ? <><Loader2 className="size-4 animate-spin" aria-hidden />Entrando…</> : <>{platform ? 'Entrar a la plataforma' : 'Entrar a la playa'}<ArrowRight className="size-4" aria-hidden /></>}
        </Button>
      </form>
      <form action={logoutAction} className="mt-4 text-center">
        <button type="submit" disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow"><LogOut className="size-4" aria-hidden />Cerrar sesión</button>
      </form>
    </>
  );
}
