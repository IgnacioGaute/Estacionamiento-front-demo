'use client';

// La franja del último cobro en efectivo: patente, cuánto se cobró y con qué medio, lo que entregó
// el cliente y el vuelto, para consultarlo mientras se da el cambio. Aparece recién cuando el
// servidor confirmó el cobro, no tapa nada y no pide tocar nada para seguir con la próxima salida.
//
// Desde acá se corrige ese cobro («Corregir registro»): medio, vehículo, recibido o vuelto, u otro
// error para revisar. Qué se aplica ya y qué queda pendiente lo decide el servidor.

import { useEffect, useState } from 'react';
import { Banknote, Clock3, PencilLine, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatImporte } from '@/components/pricing-breakdown';
import { useTenant } from '@/components/tenant-provider';
import { descartarUltimoCobro, marcarCorreccion, useUltimoCobro } from '@/lib/ultimo-cobro';
import { CorregirRegistro, type VehiculoAdentro } from './corregir-registro';

const hora = (en: number) => new Date(en).toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

// Se vuelve a mirar cada minuto para que deje de mostrarse cuando vence.
function useMinuto() {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return ahora;
}

export function UltimoCobroFranja({ className, adentro, isAdmin, onCorregido }: {
  className?: string;
  // Los vehículos adentro: el que de verdad se fue, si la salida se cobró sobre otro.
  adentro?: VehiculoAdentro[];
  isAdmin?: boolean;
  onCorregido?: () => void;
}) {
  const { playaId } = useTenant();
  const cobro = useUltimoCobro(playaId, useMinuto());
  const [corregir, setCorregir] = useState(false);
  // La operación a corregir se fija al abrir: si llega otro cobro mientras tanto, no cambia.
  const [operacion, setOperacion] = useState<{ tipo: 'ESTADIA' | 'PASE'; id: string } | null>(null);
  if (!cobro) return null;
  const conVuelto = cobro.vuelto !== null && cobro.vuelto > 0;
  const abrir = () => { setOperacion({ tipo: cobro.tipo, id: cobro.registroId }); setCorregir(true); };
  return (
    <section aria-label="Último cobro en efectivo" aria-live="polite" className={cn('rounded-2xl border border-gm-line-strong bg-gm-surface-2 pb-1 pl-3 pr-1.5 pt-3', className)}>
      {/* Tres líneas cortas en vez de una que se cortaba en el celular: quién, cuánto y con qué, y
          lo que entregó; el vuelto, grande a la derecha. */}
      <div className="flex items-start gap-3 pr-1.5">
        <span aria-hidden className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-gm-ok/15 text-gm-ok"><Banknote className="size-[18px]" /></span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="gm-mono truncate text-[15px] font-bold">{cobro.identificacion}</p>
          <p className="text-[13px]"><strong className="gm-mono font-bold">{formatImporte(cobro.total)}</strong> <span className="text-muted-foreground">{cobro.medio}</span></p>
          <p className="text-[13px] text-muted-foreground">
            {cobro.recibido === null
              ? 'Sin dato de lo que entregó'
              : cobro.efectivo !== cobro.total
                ? <>Entregó <span className="gm-mono text-foreground">{formatImporte(cobro.recibido)}</span> por {formatImporte(cobro.efectivo)} en efectivo</>
                : <>Entregó <span className="gm-mono text-foreground">{formatImporte(cobro.recibido)}</span></>}
            {' · '}{hora(cobro.en)}
          </p>
        </div>
        {cobro.vuelto !== null && (
          <div className="shrink-0 text-right">
            <p className="text-[11px] font-semibold text-muted-foreground">Vuelto</p>
            <p className={cn('gm-mono mt-1 text-[24px] font-bold leading-none', conVuelto ? 'text-gm-yellow' : 'text-foreground')}>{formatImporte(cobro.vuelto!)}</p>
          </div>
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-1 border-t border-gm-line pl-12 pt-0.5">
        <p className="mr-auto flex min-w-0 items-center gap-1.5 text-[11px] leading-snug text-muted-foreground">
          {cobro.correccion === 'APLICADA' ? <>Corregido: muestra lo vigente.</>
            : cobro.correccion === 'PENDIENTE' ? <><Clock3 className="size-3.5 shrink-0 text-gm-orange" aria-hidden />Corrección en revisión.</>
              : 'Recibido y vuelto: lo que se indicó al cobrar.'}
        </p>
        <button type="button" onClick={abrir}
          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-gm-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow">
          <PencilLine className="size-3.5" aria-hidden />Corregir
        </button>
        <button type="button" onClick={() => descartarUltimoCobro(playaId)} aria-label="Ocultar el último cobro"
          className="grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow">
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <CorregirRegistro
        operacion={operacion}
        open={corregir}
        onOpenChange={setCorregir}
        cobroReciente
        adentro={adentro}
        isAdmin={isAdmin}
        onListo={(c) => {
          const antes = c.antes as { efectivoRecibido?: number | null };
          const despues = c.despues as { efectivoRecibido?: number; vuelto?: number };
          // Lo recibido de la franja cambia solo si se corrigió ese cobro (no otro de la misma estadía).
          const esteCobro = c.tipo === 'RECIBIDO_VUELTO' && (antes.efectivoRecibido ?? null) === cobro.recibido;
          marcarCorreccion(playaId, { estado: c.estado, ...(esteCobro ? { recibido: despues.efectivoRecibido, vuelto: despues.vuelto } : {}) });
          onCorregido?.();
        }}
      />
    </section>
  );
}
