 'use client';
import { forwardRef, useCallback, useEffect, useSyncExternalStore } from 'react';
import { Bike, CarFront, Check, Loader2, RefreshCw, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import LatticeLoader from '@/components/ui/lattice-loader';
import { cargarTiposDeVehiculoAction, VehicleTypeItem } from '@/actions/tickets/vehicle-types.action';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { esperaReintento } from '@/lib/reintentos';

// ── Carga compartida por playa ──────────────────────────────────────────────
// La pantalla de Tickets monta varios componentes que necesitan los tipos (tarjetas, diálogo de
// entrada, tarifas). Comparten un solo pedido en curso y un solo reloj de reintentos: con el
// backend caído no se multiplican las consultas. Es memoria de la página: cambiar de playa recarga
// toda la aplicación (window.location.assign), así que nunca se muestran tipos de otra playa; y se
// descarta cuando ninguna pantalla la usa. Tampoco se inventan: sin respuesta no hay opciones.
type EstadoTipos = { tipos: VehicleTypeItem[] | null; error: string; cargando: boolean; fallos: number; automatico: boolean };
type Tienda = { estado: EstadoTipos; oyentes: Set<() => void>; enCurso: Promise<void> | null; timer?: ReturnType<typeof setTimeout> };
const MAX_REINTENTOS_AUTOMATICOS = 4;
const INICIAL: EstadoTipos = { tipos: null, error: '', cargando: true, fallos: 0, automatico: false };
const tiendas = new Map<string, Tienda>();
const tienda = (clave: string) => {
  let t = tiendas.get(clave);
  if (!t) tiendas.set(clave, (t = { estado: INICIAL, oyentes: new Set(), enCurso: null }));
  return t;
};
const cambiar = (t: Tienda, cambios: Partial<EstadoTipos>) => {
  t.estado = { ...t.estado, ...cambios };
  t.oyentes.forEach((avisar) => avisar());
};

function cargarTipos(clave: string) {
  const t = tienda(clave);
  if (t.enCurso) return t.enCurso; // Nunca dos consultas superpuestas.
  clearTimeout(t.timer);
  cambiar(t, { cargando: true });
  const fallar = (error: string, transitorio: boolean, reintentarEnMs: number | null) => {
    const fallos = t.estado.fallos + 1;
    const automatico = transitorio && fallos <= MAX_REINTENTOS_AUTOMATICOS;
    cambiar(t, { cargando: false, error, fallos, automatico });
    if (!automatico) return;
    t.timer = setTimeout(() => {
      // Oculta u offline: lo retoma el aviso de volver (abajo).
      if (!document.hidden && navigator.onLine) void cargarTipos(clave);
    }, esperaReintento(fallos, { retryAfterMs: reintentarEnMs }));
  };
  t.enCurso = cargarTiposDeVehiculoAction()
    .then(
      (r) => {
        if ('tipos' in r) cambiar(t, { tipos: r.tipos, error: '', cargando: false, fallos: 0, automatico: false });
        else fallar(r.error, r.fallo.transitorio, r.fallo.reintentarEnMs);
      },
      // La acción ni llegó al servidor del front (sin red, o página de una versión anterior).
      () => fallar('No pudimos cargar los tipos de vehículo.', true, null),
    )
    .finally(() => { t.enCurso = null; });
  return t.enCurso;
}

// Al volver la conexión o la app (celular desbloqueado): se reintenta lo que quedó con error.
let escuchandoVuelta = false;
function escucharVuelta() {
  if (escuchandoVuelta || typeof window === 'undefined') return;
  escuchandoVuelta = true;
  const alVolver = () => {
    if (document.hidden || !navigator.onLine) return;
    tiendas.forEach((t, clave) => { if (t.estado.error && t.oyentes.size) void cargarTipos(clave); });
  };
  window.addEventListener('online', alVolver);
  document.addEventListener('visibilitychange', alVolver);
}

const clave = 'tipos';

export function useVehicleTypes() {
  const suscribir = useCallback((avisar: () => void) => {
    const t = tienda(clave);
    t.oyentes.add(avisar);
    return () => {
      t.oyentes.delete(avisar);
      // Sin ninguna pantalla que la use se descarta (y su reintento): al volver a abrir, se pide de
      // nuevo. El plazo deja pasar el desmontaje y montaje seguidos de React en desarrollo.
      setTimeout(() => {
        if (t.oyentes.size || tiendas.get(clave) !== t) return;
        clearTimeout(t.timer);
        tiendas.delete(clave);
      }, 0);
    };
  }, []);
  const estado = useSyncExternalStore(suscribir, () => tienda(clave).estado, () => INICIAL);
  useEffect(() => {
    escucharVuelta();
    // Cada pantalla que se abre trae la lista vigente (se une al pedido en curso si lo hay).
    void cargarTipos(clave);
    const recargar = () => void cargarTipos(clave);
    window.addEventListener('vehicle-types-updated', recargar);
    return () => window.removeEventListener('vehicle-types-updated', recargar);
  }, []);
  const reintentar = useCallback(() => {
    tienda(clave).estado = { ...tienda(clave).estado, fallos: 0 };
    void cargarTipos(clave);
  }, []);
  // Con una lista ya recibida de esta playa, una actualización fallida no la borra.
  const conDatos = estado.tipos !== null;
  return {
    types: estado.tipos ?? [],
    error: conDatos ? '' : estado.error,
    loading: !conDatos && estado.cargando && !estado.error,
    reintentando: !conDatos && estado.cargando && !!estado.error,
    // Si quedan intentos automáticos programados (si no, la persona decide cuándo).
    automatico: estado.automatico,
    reintentar,
  };
}

/** Error al cargar los tipos, con la forma de recuperarlo sin cerrar la aplicación. */
function ErrorTipos({ error, reintentando, automatico, reintentar }: { error: string; reintentando: boolean; automatico: boolean; reintentar: () => void }) {
  return (
    <div role="alert" className="flex items-center gap-3 rounded-[14px] border border-gm-orange/40 bg-gm-orange/10 py-2 pl-3.5 pr-2">
      <p className="min-w-0 flex-1 text-[13px] leading-snug">
        <span className="block font-semibold text-foreground">{error}</span>
        <span className="block text-muted-foreground">{reintentando ? 'Reintentando…' : automatico ? 'Reintentamos solos en unos segundos.' : 'Revisá la conexión y tocá Reintentar.'}</span>
      </p>
      <button
        type="button"
        onClick={reintentar}
        disabled={reintentando}
        className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-gm-yellow transition-colors hover:bg-gm-yellow/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-60"
      >
        {reintentando ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
        Reintentar
      </button>
    </div>
  );
}
export function VehicleTypeOptions() {
  const { types, error, loading } = useVehicleTypes();
  return <>{types.filter(t => t.enabled).map(t => <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>)}{(loading || error) && <SelectItem disabled value="__status">{error || <LatticeLoader label="Cargando vehículos…" showTimer={false} cellSize={4} gap={1} fontSize={12} />}</SelectItem>}</>;
}
export function VehicleTypePicker({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const { types, error, loading, reintentando, automatico, reintentar } = useVehicleTypes();
  const active = types.filter(t => t.enabled);
  const selected = active.find(t => t.code === value);
  const placeholder = loading ? 'Cargando vehículos…' : error ? 'No se pudieron cargar' : active.length ? 'Elegir vehículo' : 'No hay vehículos habilitados';
  if (loading && !active.length) return <div aria-label="Cargando tipos de vehículo" className="space-y-2"><LatticeLoader label="Cargando vehículos…" showTimer={false} cellSize={4} gap={1} fontSize={12} /></div>;
  if (error) return <ErrorTipos error={error} reintentando={reintentando} automatico={automatico} reintentar={reintentar} />;
  return <Select key={loading ? 'loading' : 'ready'} value={value} onValueChange={onChange} disabled={disabled || loading || !!error || !active.length}><SelectTrigger aria-label="Tipo de vehículo"><SelectValue placeholder={placeholder}>{selected?.name ?? placeholder}</SelectValue></SelectTrigger><SelectContent>{active.map(t => <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>)}</SelectContent></Select>;
}


export const VehicleTypeButtons = forwardRef<HTMLDivElement, {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onValidityChange?: (valid: boolean) => void;
  // El nombre del elegido, para repetirlo en el botón de confirmar («AB123CD · Auto»).
  onSelectedNameChange?: (name: string | null) => void;
  // Para lugares angostos, como la tarjeta de Cobrar salida: siempre el ícono arriba y de a dos por
  // fila. Al costado, con el tilde, «Camioneta» no entraba y se partía letra por letra.
  compact?: boolean;
  // La entrada de la playa gratuita está detectando el tipo con la foto: una sola carga en el lugar
  // de los botones, que cubre también la de los tipos.
  detectando?: boolean;
}>(({ value, onChange, disabled, onValidityChange, onSelectedNameChange, compact, detectando, ...props }, ref) => {
  const { types, error, loading, reintentando, automatico, reintentar } = useVehicleTypes();
  const active = types.filter(type => type.enabled);
  const valid = !loading && !error && active.some(type => type.code === value);
  const selectedName = active.find(type => type.code === value)?.name ?? null;
  useEffect(() => { onValidityChange?.(!!valid); }, [valid, onValidityChange]);
  useEffect(() => { onSelectedNameChange?.(selectedName); }, [selectedName, onSelectedNameChange]);
  // Con dos tipos, botones anchos con el ícono al costado; con más, en columnas y el ícono arriba.
  // Bajos a propósito: el diálogo de entrada tiene que entrar en la pantalla sin desplazar.
  const wide = !compact && active.length <= 2;
  return <div {...props} ref={ref}>
    {loading || detectando ? <LatticeLoader label={detectando ? 'Detectando el vehículo…' : 'Cargando vehículos…'} showTimer={false} cellSize={4} gap={1} fontSize={12} />
      : error ? <ErrorTipos error={error} reintentando={reintentando} automatico={automatico} reintentar={reintentar} />
      : !active.length ? <p role="alert" className="text-xs text-muted-foreground">No hay tipos de vehículo habilitados. Pedile al administrador que los configure.</p>
      : <>
        <div role="radiogroup" aria-label="Tipo de vehículo" className={cn('grid gap-2', compact || active.length <= 2 ? 'grid-cols-2' : 'grid-cols-3')}>
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
