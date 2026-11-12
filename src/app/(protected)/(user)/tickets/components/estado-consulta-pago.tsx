'use client';

// La consulta periódica del estado de un pago (transferencia al alias o QR) y lo que se muestra
// cuando no se puede hacer. «No pudimos consultar» nunca se presenta como «no pagó» ni como
// «sigue esperando» con una comprobación vieja: se dice desde cuándo no hay dato y se reintenta.
// Solo consulta: no crea cobros ni registra salidas, así que repetirla no duplica nada.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { useForegroundPoll } from '@/hooks/use-foreground-poll';
import { esperaReintento } from '@/lib/reintentos';
import type { FalloSerializado } from '@/lib/fallos-backend';

export type ResultadoConsultaPago = { ok: true } | { ok: false; error?: string; fallo?: FalloSerializado };
export type FalloConsultaPago = { desde: number; mensaje: string | null; automatico: boolean };

const ZONA = 'America/Argentina/Buenos_Aires';
export const horaConSegundos = (ms: number) =>
  new Date(ms).toLocaleTimeString('es-AR', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });

// Después de tantos fallos seguidos se sigue consultando, pero cada 30 s como mucho.
const ESPERA_MAXIMA_MS = 30_000;

export function useConsultaDePago(
  consultarUnaVez: () => Promise<ResultadoConsultaPago>,
  { activo, cadaMs }: { activo: boolean; cadaMs: number },
) {
  // El estado que mandó el backend al abrir el cobro ya es una consulta exitosa.
  const [ultimaOkEl, setUltimaOkEl] = useState(() => Date.now());
  const [fallo, setFallo] = useState<FalloConsultaPago | null>(null);
  const [consultando, setConsultando] = useState(false);
  const [lenta, setLenta] = useState(false);
  const enCurso = useRef(false);
  const fallosSeguidos = useRef(0);
  const siguienteEl = useRef(0);
  const fn = useRef(consultarUnaVez);
  fn.current = consultarUnaVez;

  const consultar = useCallback(async (manual = false) => {
    // Nunca dos consultas a la vez; con fallos seguidos, el reloj espera más (salvo que la pidan).
    if (enCurso.current || (!manual && Date.now() < siguienteEl.current)) return;
    enCurso.current = true;
    setConsultando(true);
    const aviso = setTimeout(() => setLenta(true), 1_500);
    let r: ResultadoConsultaPago;
    try {
      r = await fn.current();
    } catch {
      // La acción no llegó al servidor del front (sin red, celular saliendo de suspensión).
      r = { ok: false, fallo: { categoria: 'transporte', transitorio: true, reintentarEnMs: null } };
    }
    clearTimeout(aviso);
    enCurso.current = false;
    setConsultando(false);
    setLenta(false);
    if (r.ok) {
      fallosSeguidos.current = 0;
      siguienteEl.current = 0;
      setUltimaOkEl(Date.now());
      setFallo(null);
      return;
    }
    fallosSeguidos.current++;
    const transitorio = r.fallo?.transitorio ?? true;
    siguienteEl.current = Date.now() + esperaReintento(fallosSeguidos.current, { baseMs: cadaMs, maxMs: ESPERA_MAXIMA_MS, retryAfterMs: r.fallo?.reintentarEnMs ?? null });
    // Un rechazo (permiso, cobro inexistente) no se arregla insistiendo: se muestra y se espera a
    // que la persona reintente. Una falla de comunicación sigue con espera progresiva.
    if (!transitorio) siguienteEl.current = Number.POSITIVE_INFINITY;
    setFallo((previo) => ({ desde: previo?.desde ?? Date.now(), mensaje: transitorio ? null : r.error ?? null, automatico: transitorio }));
  }, [cadaMs]);

  // También al volver de bloquear el teléfono o de otra app: useForegroundPoll consulta al volver.
  useForegroundPoll(() => void consultar(), cadaMs, { enabled: activo, immediate: false });

  // Un cobro que se cerró (confirmado, cancelado) ya no tiene nada que avisar.
  useEffect(() => { if (!activo) setFallo(null); }, [activo]);

  return { consultar, consultando, consultandoLento: lenta, ultimaOkEl, fallo };
}

/** Aviso de que el estado del pago no se pudo verificar, con la última comprobación buena. */
export function AvisoConsultaFallida({
  fallo,
  ultimaOkEl,
  consultando,
  onReintentar,
}: {
  fallo: FalloConsultaPago;
  ultimaOkEl: number;
  consultando: boolean;
  onReintentar: () => void;
}) {
  return (
    <div role="alert" className="flex gap-2.5 rounded-2xl border border-gm-orange/40 bg-gm-orange/10 p-3.5 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gm-orange" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">No pudimos consultar el estado del pago</p>
        <p className="text-gm-texto-2">
          Última consulta exitosa: <span className="gm-mono">{horaConSegundos(ultimaOkEl)}</span>.{' '}
          {fallo.mensaje ?? 'Esto no quiere decir que el pago no llegó.'}
        </p>
        {/* Debajo del texto: en el celular, al costado le quitaba la mitad del ancho al mensaje. */}
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3">
          <p className="text-[13px] text-muted-foreground" aria-live="polite">
            {consultando ? 'Reintentando…' : fallo.automatico ? 'Seguimos reintentando solos.' : 'Tocá Reintentar para consultar de nuevo.'}
          </p>
          <button
            type="button"
            disabled={consultando}
            onClick={onReintentar}
            className="-mr-1.5 flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-gm-yellow transition-colors hover:bg-gm-yellow/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-60"
          >
            {consultando ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );
}

/** «Consultado a las 12:03:15» debajo del estado de espera: la búsqueda está viva. */
export function UltimaConsulta({ ultimaOkEl, consultandoLento }: { ultimaOkEl: number; consultandoLento: boolean }) {
  return (
    <span className="block text-[12px] text-muted-foreground">
      {consultandoLento ? 'Consultando…' : <>Última consulta: <span className="gm-mono">{horaConSegundos(ultimaOkEl)}</span></>}
    </span>
  );
}
