'use client';
import LatticeLoader from '@/components/ui/lattice-loader';
import { DataLoading } from '@/components/ui/data-loading';

// Las acciones de administración sobre la cuenta: ajustes, devoluciones, anulaciones y la carga
// de los abonos del mes. Todas piden motivo o confirmación: tocan plata y quedan en el libro con
// nombre y fecha.

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, Ban, CheckCircle2, MoreHorizontal } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { plata } from '@/components/plataforma/formato';
import { Segmentos, Selector } from '@/components/plataforma/mono';
import {
  anularMovimientoAction,
  cargarAbonosAction,
  previsualizarAbonosAction,
  registrarAjusteAction,
  registrarDevolucionAction,
} from '@/actions/cuentas/cuentas.action';
import { Anulable, CargoCuenta, METODOS_COBRO, MetodoCobro, PlanAbonos } from '@/types/cuenta.type';
import { CampoImporte } from './campo-importe';
import { colorSaldo, fechaAR, leerImporte, mesActual, mesLargo, nuevoId, sumarMeses, textoSaldo } from './util';

const VIEJOS_PRIMERO = 'VIEJOS_PRIMERO';
const MOTIVO_MINIMO = 10;
const boton = 'h-11 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-gm-surface-2';
const primario =
  'flex h-11 items-center gap-2 rounded-xl bg-gm-yellow px-5 text-sm font-bold text-gm-ink hover:bg-[#FFD23A] disabled:opacity-50';
const campo = 'h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gm-yellow';
const rotulo = 'mb-1.5 block text-xs font-semibold text-muted-foreground';

function CampoMotivo({
  valor,
  onChange,
  placeholder,
  minimo = 3,
  etiqueta = 'Motivo',
}: {
  valor: string;
  onChange: (v: string) => void;
  placeholder: string;
  minimo?: number;
  etiqueta?: string;
}) {
  const largo = valor.trim().length;
  return (
    <label className="block">
      <span className="mb-1.5 flex justify-between text-xs font-semibold text-muted-foreground">
        <span>{etiqueta}</span>
        {minimo > 3 && (
          <span className={largo >= minimo ? 'text-emerald-400' : ''}>
            {Math.min(largo, minimo)}/{minimo}
          </span>
        )}
      </span>
      <input value={valor} onChange={(e) => onChange(e.target.value)} maxLength={255} placeholder={placeholder} className={campo} />
    </label>
  );
}

export function AjusteDialog({
  customerId,
  nombre,
  pendientes,
  open,
  onOpenChange,
  onGuardado,
}: {
  customerId: string;
  nombre: string;
  pendientes: CargoCuenta[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onGuardado?: () => void;
}) {
  const [tipo, setTipo] = useState<'BONIFICACION' | 'RECARGO'>('BONIFICACION');
  const [texto, setTexto] = useState('');
  const [motivo, setMotivo] = useState('');
  const [recibo, setRecibo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const { valor: importe, error } = leerImporte(texto);

  useEffect(() => {
    if (open) {
      setTexto('');
      setMotivo('');
      setRecibo('');
    }
  }, [open]);

  async function guardar() {
    setEnviando(true);
    const r = await registrarAjusteAction(customerId, {
      tipo,
      importe,
      motivo: motivo.trim(),
      ...(tipo === 'BONIFICACION' && recibo ? { receiptId: recibo } : {}),
    });
    setEnviando(false);
    if (!r.data) {
      toast.error(r.error ?? 'No se pudo cargar el ajuste.');
      return;
    }
    toast.success(tipo === 'RECARGO' ? 'Recargo cargado: quedó como cargo pendiente.' : 'Descuento aplicado.');
    onOpenChange(false);
    onGuardado?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Ajuste de cuenta</DialogTitle>
          <DialogDescription>
            Para corregir la cuenta de {nombre} sin tocar lo ya registrado. Queda en el estado de cuenta con el motivo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Segmentos
            etiqueta="Tipo de ajuste"
            className="w-fit"
            opciones={[
              { id: 'BONIFICACION', label: 'Bonificación (descuento)' },
              { id: 'RECARGO', label: 'Recargo' },
            ]}
            valor={tipo}
            onChange={setTipo}
          />
          <p className="text-xs text-muted-foreground">
            {tipo === 'BONIFICACION'
              ? 'Baja lo pendiente: un descuento, un error a favor del inquilino, una deuda que se perdona. No es plata recibida: en el cargo figura aparte, como descuento.'
              : 'Sube lo pendiente: interés por mora, un gasto a cargo del inquilino. Queda como un cargo propio para cobrarlo.'}
          </p>
          <label className="block">
            <span className={rotulo}>Importe</span>
            <CampoImporte grande autoFocus ariaLabel="Importe del ajuste" texto={texto} onTexto={setTexto} />
          </label>
          {tipo === 'BONIFICACION' && pendientes.length > 0 && (
            <label className="block">
              <span className={rotulo}>Aplicar a</span>
              {/* Radix no acepta un ítem con valor vacío: «sin cargo elegido» va con un centinela. */}
              <Selector
                ariaLabel="Aplicar a"
                className="h-11 w-full justify-between rounded-xl"
                valor={recibo || VIEJOS_PRIMERO}
                opciones={[
                  { id: VIEJOS_PRIMERO, label: 'Los cargos más viejos primero' },
                  ...pendientes.map((r) => ({ id: r.id, label: `${r.concepto} · pendiente ${plata(r.saldo)}` })),
                ]}
                onChange={(v) => setRecibo(v === VIEJOS_PRIMERO ? '' : v)}
              />
            </label>
          )}
          <CampoMotivo
            valor={motivo}
            onChange={setMotivo}
            placeholder={tipo === 'BONIFICACION' ? 'Ej.: descuento por pago anual' : 'Ej.: interés por mora de octubre'}
          />
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className={boton}>
            Cancelar
          </button>
          <button
            type="button"
            disabled={!importe || !!error || motivo.trim().length < 3 || enviando}
            onClick={() => void guardar()}
            className={primario}
          >
            {enviando && <LatticeLoader compact label="Procesando…" showTimer={false} cellSize={4} gap={1} />}
            {tipo === 'BONIFICACION' ? 'Aplicar descuento' : 'Cargar recargo'}
            {importe ? ` ${plata(importe)}` : ''}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Devolverle plata al inquilino no es anular un pago: el pago existió, y lo que se registra es la
// salida de la caja o del banco. Solo se devuelve saldo a favor.
export function DevolucionDialog({
  customerId,
  nombre,
  aFavor,
  open,
  onOpenChange,
  onGuardado,
}: {
  customerId: string;
  nombre: string;
  aFavor: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onGuardado?: () => void;
}) {
  const [texto, setTexto] = useState('');
  const [metodo, setMetodo] = useState<MetodoCobro>('CASH');
  const [motivo, setMotivo] = useState('');
  const [solicitud, setSolicitud] = useState('');
  const [enviando, setEnviando] = useState(false);
  const { valor: importe, error } = leerImporte(texto);
  const excede = importe > aFavor;

  useEffect(() => {
    if (open) {
      setTexto(aFavor > 0 ? String(aFavor) : '');
      setMotivo('');
      setMetodo('CASH');
      setSolicitud(nuevoId());
    }
  }, [open, aFavor]);

  async function guardar() {
    setEnviando(true);
    const r = await registrarDevolucionAction(customerId, { importe, metodo, motivo: motivo.trim(), solicitudId: solicitud });
    setEnviando(false);
    if (!r.data) {
      toast.error(r.error ?? 'No se pudo registrar la devolución.');
      return;
    }
    toast.success(r.data.repetido ? 'Esa devolución ya estaba registrada.' : 'Devolución registrada.');
    onOpenChange(false);
    onGuardado?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Devolver saldo a favor</DialogTitle>
          <DialogDescription>
            Plata que efectivamente se le devuelve a {nombre}. Si es en efectivo, sale de la caja del turno abierto.
          </DialogDescription>
        </DialogHeader>
        {aFavor <= 0 ? (
          <p className="rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground">
            No tiene saldo a favor. Si un cargo no correspondía, corregilo primero con una bonificación o anulándolo.
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm">
              Saldo a favor disponible: <strong className="text-emerald-400">{plata(aFavor)}</strong>
            </p>
            <div className="flex items-start gap-2">
              <Selector
                ariaLabel="Medio de la devolución"
                className="h-11 w-40 shrink-0 justify-between rounded-xl"
                valor={metodo}
                opciones={METODOS_COBRO}
                onChange={(v) => setMetodo(v as MetodoCobro)}
              />
              <CampoImporte className="flex-1" grande ariaLabel="Importe a devolver" texto={texto} onTexto={setTexto} />
            </div>
            {excede && !error && <p className="text-xs text-destructive">No se puede devolver más que el saldo a favor.</p>}
            <CampoMotivo
              valor={motivo}
              onChange={setMotivo}
              minimo={MOTIVO_MINIMO}
              placeholder="Ej.: dejó la cochera y se le devuelve lo pagado de más"
            />
          </div>
        )}
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className={boton}>
            Cancelar
          </button>
          {aFavor > 0 && (
            <button
              type="button"
              disabled={!importe || !!error || excede || motivo.trim().length < MOTIVO_MINIMO || enviando}
              onClick={() => void guardar()}
              className={primario}
            >
              {enviando && <LatticeLoader compact label="Procesando…" showTimer={false} cellSize={4} gap={1} />}
              Devolver {importe ? plata(importe) : ''}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Lo que se va a anular, descripto para confirmarlo sin ambigüedad.
export type AAnular = {
  id: string;
  titulo: string;
  detalle: string;
  // El importe que hay que escribir para confirmar.
  importe: number;
  // Cómo cambia el saldo de la cuenta: negativo si baja lo pendiente.
  efecto: number;
  saldoActual: number;
};

// Anular es la excepción (un error de carga reciente), así que pide tres cosas: ver el efecto
// en la cuenta, contar el motivo y escribir el importe. El backend vuelve a controlar todo.
export function AnularDialog({
  movimiento,
  onOpenChange,
  onAnulado,
}: {
  movimiento: AAnular | null;
  onOpenChange: (v: boolean) => void;
  onAnulado?: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const { valor: escrito } = leerImporte(texto);
  const motivoOk = motivo.trim().length >= MOTIVO_MINIMO;
  const importeOk = !!movimiento && escrito === movimiento.importe;

  useEffect(() => {
    if (movimiento) {
      setMotivo('');
      setTexto('');
    }
  }, [movimiento]);

  async function anular() {
    if (!movimiento || !motivoOk || !importeOk) return;
    setEnviando(true);
    const r = await anularMovimientoAction(movimiento.id, { motivo: motivo.trim(), confirmacion: escrito });
    setEnviando(false);
    if (!r.data) {
      toast.error(r.error ?? 'No se pudo anular.');
      return;
    }
    toast.success('Anulado. Queda en el listado de anulaciones de la playa.');
    onOpenChange(false);
    onAnulado?.();
  }

  const despues = movimiento ? movimiento.saldoActual + movimiento.efecto : 0;

  return (
    <Dialog open={!!movimiento} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{movimiento?.titulo}</DialogTitle>
          <DialogDescription>{movimiento?.detalle}</DialogDescription>
        </DialogHeader>
        {movimiento && (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Ahora</div>
              <div className={`font-display text-lg font-semibold tabular-nums ${colorSaldo(movimiento.saldoActual)}`}>
                {textoSaldo(movimiento.saldoActual)}
              </div>
            </div>
            <ArrowRight aria-hidden className="size-4 text-muted-foreground" />
            <div className="text-right">
              <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Queda</div>
              <div className={`font-display text-lg font-semibold tabular-nums ${colorSaldo(despues)}`}>{textoSaldo(despues)}</div>
            </div>
          </div>
        )}
        <CampoMotivo
          etiqueta="Motivo de la anulación"
          valor={motivo}
          onChange={setMotivo}
          minimo={MOTIVO_MINIMO}
          placeholder="Ej.: se cargó dos veces el mismo cargo"
        />
        <label className="block">
          <span className={rotulo}>
            Para confirmar, escribí el importe: <strong className="text-foreground">{plata(movimiento?.importe ?? 0)}</strong>
          </span>
          <CampoImporte grande sinPegar bien={importeOk} ariaLabel="Importe a anular" texto={texto} onTexto={setTexto} />
        </label>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className={boton}>
            Volver
          </button>
          <button
            type="button"
            disabled={!motivoOk || !importeOk || enviando}
            onClick={() => void anular()}
            className="flex h-11 items-center gap-2 rounded-xl border border-[#FF7A4D]/60 px-5 text-sm font-bold text-[#FF7A4D] hover:bg-[#FF7A4D]/10 disabled:opacity-50"
          >
            {enviando && <LatticeLoader compact label="Procesando…" showTimer={false} cellSize={4} gap={1} />}
            Anular {movimiento ? plata(movimiento.importe) : ''}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// El «⋯» de un cargo, pago o ajuste. Anular queda a un paso más, y cuando no se puede el menú
// dice por qué y cómo se corrige en su lugar.
export function MenuAnular({
  etiqueta,
  anulable,
  onAnular,
}: {
  etiqueta: string;
  anulable: Anulable;
  onAnular: () => void;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Más acciones"
          className="flex size-9 items-center justify-center rounded-[10px] border border-border text-muted-foreground hover:bg-gm-surface-2 hover:text-foreground"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 border border-border bg-gm-surface p-1">
        <DropdownMenuItem
          disabled={!anulable.ok}
          onSelect={onAnular}
          className="text-[#FF7A4D] focus:bg-[#FF7A4D]/10 focus:text-[#FF7A4D]"
        >
          <Ban /> {etiqueta}
        </DropdownMenuItem>
        {!anulable.ok && anulable.motivo && (
          <p className="px-2 pb-1.5 pt-0.5 text-xs leading-snug text-muted-foreground">{anulable.motivo}</p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Cargar los abonos de un mes registra cuánto corresponde cobrarle a cada inquilino (el recibo se
// emite cuando paga). Antes de confirmar se ve exactamente qué se va a cargar y por cuánto, qué ya
// estaba cargado y qué no se puede cargar y por qué.
export function CargarAbonosDialog({
  open,
  onOpenChange,
  onCargado,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCargado?: () => void;
}) {
  const actual = mesActual();
  const [mes, setMes] = useState(actual);
  const [dia, setDia] = useState('10');
  const [plan, setPlan] = useState<PlanAbonos | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [verDetalle, setVerDetalle] = useState(false);
  // El día guardado se propone una vez por apertura; si después se cambia de mes, se respeta lo
  // que haya elegido la persona.
  const diaPropuesto = useRef(false);

  useEffect(() => {
    if (open) diaPropuesto.current = false;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let vigente = true;
    setCargando(true);
    setError('');
    void previsualizarAbonosAction(mes).then((r) => {
      if (!vigente) return;
      setCargando(false);
      if (!r.data) {
        setPlan(null);
        setError(r.error ?? 'No se pudo preparar la carga.');
        return;
      }
      setPlan(r.data);
      if (!diaPropuesto.current) {
        diaPropuesto.current = true;
        setDia(String(r.data.vencimientoDia));
      }
    });
    return () => {
      vigente = false;
    };
  }, [open, mes]);

  const diaNum = Number(dia);
  const diaOk = Number.isInteger(diaNum) && diaNum >= 1 && diaNum <= 28;

  async function cargar() {
    if (!plan || !diaOk) return;
    setEnviando(true);
    const r = await cargarAbonosAction(mes, diaNum);
    setEnviando(false);
    if (!r.data) {
      toast.error(r.error ?? 'No se pudieron cargar los abonos.');
      return;
    }
    toast.success(
      r.data.cargados
        ? `Listo: ${r.data.detalle}.${r.data.sinCargar.length ? ` ${r.data.sinCargar.length} sin cargar.` : ''}`
        : `No había abonos de ${mesLargo(mes)} para cargar.`,
    );
    onOpenChange(false);
    onCargado?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Cargar abonos de {mesLargo(mes).split(' ')[0]}</DialogTitle>
          <DialogDescription>
            Registra lo que corresponde cobrarle a cada inquilino ese mes. El recibo se emite recién cuando paga.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-end gap-3">
          <Segmentos
            etiqueta="Mes"
            className="w-fit"
            opciones={[
              { id: actual, label: mesLargo(actual) },
              { id: sumarMeses(actual, 1), label: mesLargo(sumarMeses(actual, 1)) },
            ]}
            valor={mes}
            onChange={setMes}
          />
          <label className="block">
            <span className={rotulo}>Vence el día</span>
            <input
              inputMode="numeric"
              value={dia}
              onChange={(e) => setDia(e.target.value.replace(/\D/g, '').slice(0, 2))}
              aria-invalid={!diaOk}
              className={`${campo} w-24 text-center font-semibold ${diaOk ? '' : 'border-destructive'}`}
            />
          </label>
        </div>
        {!diaOk && <p className="text-xs text-destructive">Elegí un día del 1 al 28 (todos los meses lo tienen).</p>}

        {cargando && (
          <DataLoading label="Revisando abonos…" />
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {plan && !cargando && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-gm-yellow/40 bg-gm-yellow/[0.06] px-4 py-3">
              {plan.aCargar.length ? (
                <>
                  <p className="text-[15px] font-semibold">
                    Se van a cargar {plan.aCargar.length} {plan.aCargar.length === 1 ? 'abono' : 'abonos'} por{' '}
                    {plata(plan.total)}.
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Vencen el {diaOk ? fechaAR(`${mes}-${String(diaNum).padStart(2, '0')}`) : '—'}; si esa fecha ya pasó,
                    vencen hoy.
                  </p>
                </>
              ) : (
                <p className="text-[15px] font-semibold">No falta cargar ningún abono de {mesLargo(mes)}.</p>
              )}
            </div>
            <ul className="space-y-1.5 text-sm">
              {plan.yaCargados.length > 0 && (
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  {plan.yaCargados.length} ya {plan.yaCargados.length === 1 ? 'tenía' : 'tenían'} el abono de{' '}
                  {mesLargo(mes)}: se {plan.yaCargados.length === 1 ? 'omite' : 'omiten'}.
                </li>
              )}
              {plan.sinCargar.map((x) => (
                <li key={x.id} className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#FF7A4D]" />
                  <span>
                    <strong>{x.nombre}</strong> no se puede cargar: {x.motivo}
                  </span>
                </li>
              ))}
            </ul>
            {plan.aCargar.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setVerDetalle((v) => !v)}
                  className="text-sm font-semibold text-gm-yellow hover:text-[#FFD84D]"
                >
                  {verDetalle ? 'Ocultar el detalle' : 'Ver el detalle por inquilino'}
                </button>
                {verDetalle && (
                  <ul className="mt-2 max-h-56 divide-y divide-border overflow-y-auto rounded-xl border border-border">
                    {plan.aCargar.map((x) => (
                      <li key={x.id} className="flex justify-between gap-3 px-3 py-2 text-sm">
                        <span className="min-w-0 truncate">
                          {x.nombre}
                          {x.cocheras.length ? <span className="text-muted-foreground"> · {x.cocheras.join(', ')}</span> : null}
                        </span>
                        <span className="tabular-nums">{plata(x.importe)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className={boton}>
            Cancelar
          </button>
          <button
            type="button"
            disabled={enviando || cargando || !plan?.aCargar.length || !diaOk}
            onClick={() => void cargar()}
            className={primario}
          >
            {enviando && <LatticeLoader compact label="Procesando…" showTimer={false} cellSize={4} gap={1} />}
            {plan?.aCargar.length
              ? `Cargar ${plan.aCargar.length} ${plan.aCargar.length === 1 ? 'abono' : 'abonos'} · ${plata(plan.total)}`
              : 'Nada para cargar'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
