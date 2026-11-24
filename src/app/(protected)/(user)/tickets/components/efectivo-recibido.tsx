'use client';

// «¿Con cuánto paga?»: lo que entrega el cliente en billetes por la parte en efectivo de un cobro.
// Lo usan la salida normal, «Se fue antes», los pases por día, semana o mes y la parte en efectivo de
// un pago mixto. Hasta elegir «Justo» o indicar el importe no se puede confirmar el efectivo, y si lo
// entregado no alcanza tampoco: se corrige el importe o se cobra el resto con otro medio (nunca se
// convierte en descuento ni en deuda). Lo elegido viaja con el cobro y el servidor calcula el vuelto.
//
// «Justo» no se elige solo: el operador tiene que tocarlo. Es un toque y no abre otra ventana.

import { useEffect, useId, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatImporte } from '@/components/pricing-breakdown';
import { estadoEfectivo, pagosSugeridos } from '@/utils/vuelto';

const miles = (valor: number) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(valor);

export function EfectivoRecibido({ aplicado, recibido, onChange, disabled, titulo = '¿Con cuánto paga?', onCobrarResto, className }: {
  // El importe que se cobra en efectivo (todo el saldo, o la parte en efectivo de un pago mixto).
  aplicado: number;
  recibido: number | null;
  onChange: (recibido: number | null) => void;
  disabled?: boolean;
  titulo?: string;
  // Entregó menos que el saldo: ofrece cobrar el resto con otro medio (el pago mixto existente).
  onCobrarResto?: (entregado: number) => void;
  className?: string;
}) {
  const id = useId();
  const [otro, setOtro] = useState(false);
  const [texto, setTexto] = useState('');
  // Si el que llama borra lo elegido (cambió el saldo), se vuelve a los botones.
  useEffect(() => {
    if (recibido === null && !otro) setTexto('');
  }, [recibido, otro]);
  const sugeridos = pagosSugeridos(aplicado);
  const estado = estadoEfectivo(aplicado, recibido);
  const boton = (activo: boolean) => cn(
    'h-11 rounded-xl border-[1.5px] px-1 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-50',
    activo ? 'border-gm-yellow bg-gm-yellow/[0.12]' : 'border-gm-line-strong bg-gm-surface-2 hover:border-gm-yellow/40',
  );
  return (
    <div role="group" aria-labelledby={id} className={cn('space-y-2.5 rounded-2xl border bg-gm-surface-2/50 p-3 short:space-y-2', estado.estado === 'FALTA' ? 'border-gm-orange/50' : 'border-border', className)}>
      <p className="flex items-baseline justify-between gap-2">
        <span id={id} className="text-[14px] font-semibold">{titulo}</span>
        <span className="text-xs text-muted-foreground">{formatImporte(aplicado)} en efectivo</span>
      </p>
      {otro ? (
        <div className="flex gap-2">
          <label htmlFor={id + '-otro'} className="sr-only">Importe que entrega</label>
          <input
            id={id + '-otro'}
            autoFocus
            inputMode="numeric"
            placeholder="Importe que entrega"
            disabled={disabled}
            value={texto ? miles(Number(texto)) : ''}
            onChange={(e) => {
              const digitos = e.target.value.replace(/\D/g, '').slice(0, 9);
              setTexto(digitos);
              onChange(digitos ? Number(digitos) : null);
            }}
            className="gm-mono h-11 min-w-0 flex-1 rounded-xl border-[1.5px] border-gm-yellow bg-gm-surface-2 px-3 text-base font-semibold text-foreground outline-none"
          />
          <button type="button" disabled={disabled} onClick={() => { setOtro(false); setTexto(''); onChange(null); }} className="h-11 shrink-0 rounded-xl px-3 text-[14px] font-semibold text-muted-foreground hover:text-foreground">
            Volver
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          <button type="button" disabled={disabled} aria-pressed={recibido === aplicado} onClick={() => onChange(recibido === aplicado ? null : aplicado)} className={boton(recibido === aplicado)}>
            Justo
          </button>
          {sugeridos.map((valor) => (
            <button key={valor} type="button" disabled={disabled} aria-pressed={recibido === valor} onClick={() => onChange(recibido === valor ? null : valor)} className={cn(boton(recibido === valor), 'gm-mono')}>
              {miles(valor)}
            </button>
          ))}
          {/* Sin sugeridos (importes chicos) el botón ocupa el lugar que queda. */}
          <button type="button" disabled={disabled} onClick={() => { setOtro(true); setTexto(''); onChange(null); }} className={cn(boton(false), sugeridos.length < 2 && 'col-span-2', sugeridos.length === 0 && 'col-span-3')}>
            Otro
          </button>
        </div>
      )}
      {estado.estado === 'LISTO' && (
        <p role="status" className="flex items-center justify-between border-t border-dashed border-gm-line-strong pt-2.5">
          <span className="text-[14px] font-semibold">{estado.vuelto === 0 ? 'Sin vuelto' : 'Vuelto'}</span>
          <span className="gm-mono text-[24px] font-bold leading-none text-gm-yellow">{formatImporte(estado.vuelto)}</span>
        </p>
      )}
      {estado.estado === 'FALTA' && (
        <div role="alert" className="space-y-2 border-t border-dashed border-gm-line-strong pt-2.5">
          <p className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-gm-orange">Le falta entregar</span>
            <span className="gm-mono text-[20px] font-bold leading-none text-gm-orange">{formatImporte(estado.falta)}</span>
          </p>
          <p className="text-[13px] leading-snug text-gm-texto-2">
            No se puede cobrar todo en efectivo con eso. Corregí lo que entrega{onCobrarResto ? ' o cobrá el resto con otro medio.' : '.'}
          </p>
          {onCobrarResto && recibido !== null && recibido > 0 && (
            <button type="button" disabled={disabled} onClick={() => onCobrarResto(recibido)}
              className="inline-flex min-h-11 items-center rounded-xl border border-gm-line-strong px-3 text-[13px] font-semibold transition-colors hover:border-gm-yellow/50 hover:text-gm-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow">
              {formatImporte(recibido)} en efectivo y {formatImporte(estado.falta)} con otro medio
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Lo que dice el botón de confirmar mientras falta algo del efectivo (o null si está listo).
export function faltaDelEfectivo(aplicado: number, recibido: number | null): string | null {
  const estado = estadoEfectivo(aplicado, recibido);
  if (estado.estado === 'SIN_INDICAR') return 'Tocá «Justo» o con cuánto paga';
  if (estado.estado === 'FALTA') return `Le falta entregar ${formatImporte(estado.falta)}`;
  return null;
}
