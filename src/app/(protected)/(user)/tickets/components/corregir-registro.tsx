'use client';

// «Corregir registro»: corrige una operación ya hecha (la patente, el medio de pago, lo que entregó
// el cliente y el vuelto, la salida registrada sobre el vehículo equivocado) o deja otro error para
// revisar. Antes de confirmar siempre muestra qué cambia y cómo queda la plata; si se aplica ya o
// queda pendiente lo decide el servidor, no el botón. El original no se pierde: queda en el historial
// de cambios de la operación. Sin conexión no se corrige: el servidor tiene que validarla.
//
// Nada viene elegido: ni qué corregir, ni el importe, ni la transferencia, ni el motivo.

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { formatImporte } from '@/components/pricing-breakdown';
import {
  ActionDialog,
  ActionDialogBody,
  ActionDialogContent,
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogPrimaryButton,
  ActionDialogSecondaryButton,
} from '@/components/ui/action-dialog';
import {
  corregirAction,
  detalleOperacionAction,
  previsualizarCorreccionAction,
  transferenciasParaCorreccionAction,
} from '@/actions/operaciones/operaciones.action';
import type {
  CobroCorregible, Correccion, CorreccionPayload, DetalleOperacion, PrevisualizacionCorreccion, TipoCorreccion, TransferenciasParaCorreccion,
} from '@/types/operaciones.type';
import { EfectivoRecibido, faltaDelEfectivo } from './efectivo-recibido';
// randomUUID solo existe con HTTPS: el mismo generador que los cobros a inquilinos.
import { nuevoId } from '@/app/(protected)/(user)/renters/components/cuenta/util';

export type OperacionACorregir = { tipo: 'ESTADIA' | 'PASE'; id: string };
// Un vehículo que figura adentro: el que de verdad se fue, si la salida se registró sobre otro.
export type VehiculoAdentro = { id: string; identificacion: string; entrada: string };

export const TIPOS_CORRECCION: Record<TipoCorreccion, { titulo: string; ayuda: string }> = {
  IDENTIFICACION: { titulo: 'Patente', ayuda: 'Se cargó otra patente' },
  MEDIO_PAGO: { titulo: 'Medio de pago', ayuda: 'Pagó con otro medio' },
  RECIBIDO_VUELTO: { titulo: 'Recibido y vuelto', ayuda: 'Entregó otro importe' },
  VEHICULO: { titulo: 'Vehículo equivocado', ayuda: 'Se cobró la salida de otro' },
  OTRO: { titulo: 'Otro error', ayuda: 'Lo revisa administración' },
};

const MOTIVOS: Record<TipoCorreccion, string[]> = {
  IDENTIFICACION: ['Error de tipeo', 'La cámara leyó mal'],
  MEDIO_PAGO: ['Pagó con otro medio', 'Pago mixto mal cargado'],
  RECIBIDO_VUELTO: ['Cargué mal lo que entregó', 'Toqué «Justo» por error'],
  VEHICULO: ['Elegí otro de la lista'],
  OTRO: [],
};
const OTRO_MOTIVO = 'Otro motivo';
export const MEDIO: Record<string, string> = { CASH: 'Efectivo', TRANSFER: 'Transferencia', MERCADOPAGO: 'Mercado Pago (QR)' };

const TZ = 'America/Argentina/Buenos_Aires';
export const horaDe = (fecha: string | Date) => new Date(fecha).toLocaleTimeString('es-AR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const restante = (p: CobroCorregible) => p.monto - p.corregido;
// Los cobros que siguen siendo de esta estadía (no los que pasaron a otra con «vehículo equivocado»).
const propios = (pagos: CobroCorregible[]) => pagos.filter((p) => !p.movido);

// Qué se puede corregir de esta operación y, si no, por qué (se muestra deshabilitado con el motivo).
export function opcionesDe(d: DetalleOperacion): { tipo: TipoCorreccion; noDisponible: string | null }[] {
  if (d.tipo === 'PASE') {
    return [
      { tipo: 'RECIBIDO_VUELTO', noDisponible: d.pagado && (d.metodo ?? 'CASH') === 'CASH' ? null : 'No se cobró en efectivo.' },
      { tipo: 'OTRO', noDisponible: null },
    ];
  }
  const pagos = propios(d.pagos);
  const corregibles = pagos.filter((p) => p.metodo !== 'MERCADOPAGO' && !p.confirmadoPorMp && restante(p) > 0);
  return [
    { tipo: 'IDENTIFICACION', noDisponible: !d.salida ? 'Sigue adentro: corregila desde Cobrar salida.' : d.identificacion.startsWith('Ticket ') ? 'Es una estadía de tarjeta.' : null },
    { tipo: 'MEDIO_PAGO', noDisponible: !pagos.length ? 'No tiene cobros.' : corregibles.length ? null : 'Mercado Pago confirmó sus cobros o ya se corrigieron.' },
    { tipo: 'RECIBIDO_VUELTO', noDisponible: pagos.some((p) => p.metodo === 'CASH' && restante(p) > 0) ? null : 'No tiene cobros en efectivo.' },
    { tipo: 'VEHICULO', noDisponible: d.salida ? null : 'Todavía no salió.' },
    { tipo: 'OTRO', noDisponible: null },
  ];
}

const tarjeta = (activa: boolean) => cn(
  'w-full rounded-xl border-[1.5px] px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:cursor-not-allowed disabled:opacity-50',
  activa ? 'border-gm-yellow bg-gm-yellow/[0.12]' : 'border-gm-line-strong bg-gm-surface-2 hover:border-gm-yellow/40',
);
const campo = 'w-full rounded-xl border border-gm-line-strong bg-gm-surface-2 px-3 py-2.5 text-base outline-none placeholder:text-muted-foreground focus:border-gm-yellow';

export function CorregirRegistro({ operacion, open, onOpenChange, cobroReciente = false, adentro = [], isAdmin = false, onListo }: {
  operacion: OperacionACorregir | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Desde la franja del último cobro: ese cobro viene elegido (es del que se habla).
  cobroReciente?: boolean;
  adentro?: VehiculoAdentro[];
  // Solo para los textos: quién aplica lo decide el servidor.
  isAdmin?: boolean;
  onListo?: (correccion: Correccion) => void;
}) {
  const [detalle, setDetalle] = useState<DetalleOperacion | null>(null);
  const [cargaError, setCargaError] = useState('');
  const [paso, setPaso] = useState<'tipo' | 'datos' | 'resumen'>('tipo');
  const [tipo, setTipo] = useState<TipoCorreccion | null>(null);
  const [motivo, setMotivo] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [patente, setPatente] = useState('');
  const [cobroId, setCobroId] = useState<string | null>(null);
  const [importe, setImporte] = useState<number | null>(null);
  const [parcial, setParcial] = useState(false);
  const [parcialTexto, setParcialTexto] = useState('');
  const [operacionId, setOperacionId] = useState<string | null>(null);
  const [transferencias, setTransferencias] = useState<TransferenciasParaCorreccion | null>(null);
  const [buscandoTransferencias, setBuscandoTransferencias] = useState(false);
  const [recibido, setRecibido] = useState<number | null>(null);
  const [destinoId, setDestinoId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [resumen, setResumen] = useState<PrevisualizacionCorreccion | null>(null);
  const [error, setError] = useState('');
  // Una por resumen: reintentar la confirmación no la duplica (el servidor devuelve la misma).
  const [solicitudId, setSolicitudId] = useState('');
  const [pending, startTransition] = useTransition();
  // «Guardando…» solo mientras se confirma: al pasar al resumen la revisión puede tardar en soltar.
  const [confirmando, setConfirmando] = useState(false);

  const cargar = useCallback((op: OperacionACorregir) => {
    setCargaError('');
    detalleOperacionAction(op.tipo, op.id).then((r) => {
      if (r.error !== undefined) { setCargaError(r.error); return; }
      setDetalle(r.data);
    });
  }, []);

  useEffect(() => {
    if (!open || !operacion) return;
    setDetalle(null); setPaso('tipo'); setTipo(null); setMotivo(null); setTexto(''); setPatente('');
    setCobroId(null); setImporte(null); setParcial(false); setParcialTexto(''); setOperacionId(null); setTransferencias(null);
    setRecibido(null); setDestinoId(null); setBusqueda(''); setResumen(null); setError(''); setSolicitudId('');
    cargar(operacion);
  }, [open, operacion, cargar]);

  const pagos = useMemo(() => detalle?.tipo === 'ESTADIA' ? propios(detalle.pagos) : [], [detalle]);
  const cobrosDelTipo = useMemo(() => tipo === 'MEDIO_PAGO'
    ? pagos.filter((p) => p.metodo !== 'MERCADOPAGO' && !p.confirmadoPorMp && restante(p) > 0)
    : tipo === 'RECIBIDO_VUELTO' ? pagos.filter((p) => p.metodo === 'CASH' && restante(p) > 0) : [], [pagos, tipo]);
  const cobro = cobrosDelTipo.find((p) => p.id === cobroId) ?? null;

  const elegirTipo = (t: TipoCorreccion) => {
    setTipo(t); setMotivo(t === 'OTRO' ? 'Otro error' : null); setError('');
    setCobroId(null); setImporte(null); setParcial(false); setParcialTexto(''); setOperacionId(null); setTransferencias(null); setRecibido(null);
    // Un solo cobro posible, o el último cobro desde la franja: ese es.
    const posibles = t === 'MEDIO_PAGO'
      ? pagos.filter((p) => p.metodo !== 'MERCADOPAGO' && !p.confirmadoPorMp && restante(p) > 0)
      : t === 'RECIBIDO_VUELTO' ? pagos.filter((p) => p.metodo === 'CASH' && restante(p) > 0) : [];
    const ultimo = [...posibles].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];
    if (posibles.length === 1 || (cobroReciente && ultimo)) setCobroId((posibles.length === 1 ? posibles[0] : ultimo).id);
    setPaso('datos');
  };

  // A transferencia: las acreditaciones de Mercado Pago de ese importe y cerca de esa hora. Las busca
  // quien puede aplicar la corrección; si va a revisión, las busca administración al revisarla.
  const aTransferencia = tipo === 'MEDIO_PAGO' && cobro?.metodo === 'CASH';
  const buscaTransferencia = aTransferencia && !!cobro?.directo;
  useEffect(() => {
    setOperacionId(null);
    setTransferencias(null);
    if (!buscaTransferencia || !cobro || !importe) return;
    let vigente = true;
    setBuscandoTransferencias(true);
    transferenciasParaCorreccionAction(cobro.id, importe).then((r) => {
      if (!vigente) return;
      setTransferencias(r.error !== undefined ? { disponible: false, motivo: r.error, opciones: [] } : r.data);
    }).finally(() => { if (vigente) setBuscandoTransferencias(false); });
    return () => { vigente = false; };
  }, [buscaTransferencia, cobro, importe]);

  const aplicadoEfectivo = detalle?.tipo === 'PASE' ? detalle.precio : cobro ? restante(cobro) : 0;
  const figura = detalle?.tipo === 'PASE'
    ? { recibido: detalle.efectivoRecibido, vuelto: detalle.vuelto }
    : cobro ? { recibido: cobro.efectivoRecibido, vuelto: cobro.vuelto } : null;
  const candidatos = useMemo(() => {
    const q = normalizar(busqueda);
    return adentro.filter((v) => v.id !== detalle?.id && (!q || normalizar(v.identificacion).includes(q)));
  }, [adentro, busqueda, detalle?.id]);

  const falta = (() => {
    if (!tipo || !detalle) return 'Elegí qué hay que corregir';
    switch (tipo) {
      case 'IDENTIFICACION': {
        const nueva = normalizar(patente);
        if (!nueva) return 'Escribí la patente correcta';
        if (detalle.tipo === 'ESTADIA' && nueva === normalizar(detalle.patente ?? '')) return 'Es la misma patente que figura';
        break;
      }
      case 'MEDIO_PAGO':
        if (!cobro) return 'Elegí el cobro';
        if (!importe) return parcial ? 'Escribí cuánto fue por el otro medio' : 'Elegí cuánto fue por el otro medio';
        if (importe > restante(cobro)) return `Como máximo ${formatImporte(restante(cobro))}`;
        if (buscaTransferencia && !operacionId) return buscandoTransferencias ? 'Buscando transferencias…' : 'Elegí la transferencia o «No la encuentro»';
        break;
      case 'RECIBIDO_VUELTO': {
        if (detalle.tipo === 'ESTADIA' && !cobro) return 'Elegí el cobro';
        const f = faltaDelEfectivo(aplicadoEfectivo, recibido);
        if (f) return f;
        if (figura && recibido === figura.recibido) return 'Es lo mismo que figura';
        break;
      }
      case 'VEHICULO':
        if (!destinoId) return 'Elegí el vehículo que se fue';
        break;
      case 'OTRO':
        if (!texto.trim()) return 'Contá qué estuvo mal';
        break;
    }
    if (!motivo) return 'Elegí el motivo';
    if (motivo === OTRO_MOTIVO && !texto.trim()) return 'Contá el motivo';
    return null;
  })();

  const payload = (): CorreccionPayload | null => {
    if (!detalle || !tipo || !motivo) return null;
    return {
      solicitudId, tipo, version: detalle.version, motivo, detalle: texto.trim() || undefined,
      ...(detalle.tipo === 'PASE' ? { paseId: detalle.id } : { registrationId: detalle.id }),
      ...(tipo === 'IDENTIFICACION' ? { patente: patente.trim().toUpperCase() } : {}),
      ...(tipo === 'MEDIO_PAGO' && cobro ? {
        movimientoId: cobro.id, metodo: cobro.metodo === 'CASH' ? 'TRANSFER' as const : 'CASH' as const, importe: importe ?? undefined,
        ...(operacionId && operacionId !== 'SIN' ? { operacionId } : {}),
      } : {}),
      ...(tipo === 'RECIBIDO_VUELTO' ? { ...(cobro ? { movimientoId: cobro.id } : {}), efectivoRecibido: recibido ?? undefined } : {}),
      ...(tipo === 'VEHICULO' ? { destinoRegistrationId: destinoId ?? undefined } : {}),
    };
  };

  // La operación cambió mientras se corregía: se vuelve a cargar y a los datos, sin perder lo escrito.
  const operacionCambio = (mensaje: string) => {
    setError(mensaje);
    setPaso('datos');
    setResumen(null);
    if (operacion) cargar(operacion);
  };

  const revisar = () => {
    if (falta || pending) return;
    const id = nuevoId();
    const p = payload();
    if (!p) return;
    setError('');
    startTransition(async () => {
      const r = await previsualizarCorreccionAction({ ...p, solicitudId: id });
      if (r.error !== undefined) {
        if (r.code === 'OPERACION_CAMBIO') operacionCambio(r.error);
        else setError(r.error);
        return;
      }
      setSolicitudId(id);
      setResumen(r.data);
      setPaso('resumen');
    });
  };

  const confirmar = () => {
    const p = payload();
    if (!p || pending) return;
    setError('');
    setConfirmando(true);
    startTransition(async () => {
      const r = await corregirAction(p);
      setConfirmando(false);
      if (r.error !== undefined) {
        if (r.code === 'OPERACION_CAMBIO') operacionCambio(r.error);
        // Sin respuesta: no se sabe si se guardó. Reintentar con la misma solicitud no la duplica.
        else setError(r.code ? r.error : `${r.error} Podés reintentar: no se guarda dos veces.`);
        return;
      }
      toast.success(r.data.estado === 'APLICADA' ? 'Corrección aplicada.' : 'Enviada a revisión: no cambió nada todavía.');
      onListo?.(r.data);
      onOpenChange(false);
    });
  };

  const opciones = detalle ? opcionesDe(detalle) : [];
  const descripcion = detalle
    ? detalle.tipo === 'ESTADIA'
      ? `${detalle.identificacion}${detalle.salida ? ` · salió ${horaDe(detalle.salida)}` : ' · adentro'}${detalle.precio != null ? ` · ${formatImporte(detalle.precio)}` : ''}`
      : `${detalle.identificacion} · ${formatImporte(detalle.precio)}`
    : 'Cargando la operación…';
  const aplicaAhora = resumen?.estado === 'APLICADA';

  return (
    <ActionDialog open={open} onOpenChange={(o) => { if (!pending) onOpenChange(o); }}>
      <ActionDialogContent>
        <ActionDialogHeader
          title={paso === 'resumen' ? 'Revisá la corrección' : tipo && paso === 'datos' ? TIPOS_CORRECCION[tipo].titulo : 'Corregir registro'}
          description={descripcion}
          onBack={paso === 'datos' ? () => { setPaso('tipo'); setError(''); } : paso === 'resumen' ? () => { setPaso('datos'); setError(''); } : undefined}
          backDisabled={pending}
        />
        <ActionDialogBody className="gap-4">
          {!detalle ? (
            cargaError
              ? <div role="alert" className="space-y-3 rounded-xl border border-destructive/40 p-3 text-sm"><p className="text-destructive">{cargaError}</p>
                  <button type="button" className="font-semibold text-gm-yellow" onClick={() => operacion && cargar(operacion)}>Reintentar</button></div>
              : <p role="status" className="py-6 text-center text-sm text-muted-foreground">Cargando la operación…</p>
          ) : paso === 'tipo' ? (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-[14px] font-semibold">¿Qué hay que corregir?</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {opciones.map(({ tipo: t, noDisponible }) => (
                  <button key={t} type="button" disabled={!!noDisponible} onClick={() => elegirTipo(t)} className={tarjeta(false)}>
                    <span className="block text-[14px] font-semibold">{TIPOS_CORRECCION[t].titulo}</span>
                    <span className="block text-[12px] text-muted-foreground">{noDisponible ?? TIPOS_CORRECCION[t].ayuda}</span>
                  </button>
                ))}
              </div>
              <p className="pt-1 text-[12px] leading-relaxed text-muted-foreground">
                El importe, la tarifa y los horarios no se editan: si están mal, usá «Otro error» y lo revisa administración.
              </p>
            </fieldset>
          ) : paso === 'datos' && tipo ? (
            <>
              {tipo === 'IDENTIFICACION' && detalle.tipo === 'ESTADIA' && (
                <div className="space-y-1.5">
                  <p className="text-[13px] text-muted-foreground">Figura: <strong className="gm-mono text-foreground">{detalle.patente || 'sin patente'}</strong></p>
                  <label htmlFor="corregir-patente" className="text-[13px] font-semibold">Patente correcta</label>
                  <input id="corregir-patente" value={patente} maxLength={12} autoCapitalize="characters" autoComplete="off" disabled={pending}
                    onChange={(e) => setPatente(e.target.value.toUpperCase())} className={cn(campo, 'gm-mono uppercase')} />
                  <p className="text-[12px] text-muted-foreground">No cambia el importe ni la tarifa: se cobró lo que correspondía a esa estadía.</p>
                </div>
              )}

              {(tipo === 'MEDIO_PAGO' || (tipo === 'RECIBIDO_VUELTO' && detalle.tipo === 'ESTADIA')) && (
                <fieldset className="space-y-2">
                  <legend className="mb-1.5 text-[13px] font-semibold">¿Qué cobro?</legend>
                  {cobrosDelTipo.map((p) => (
                    <button key={p.id} type="button" aria-pressed={cobroId === p.id} disabled={pending}
                      onClick={() => { setCobroId(p.id); setImporte(null); setParcial(false); setParcialTexto(''); setRecibido(null); }}
                      className={tarjeta(cobroId === p.id)}>
                      <span className="flex items-baseline justify-between gap-2 text-[14px] font-semibold">
                        <span>{p.tipo === 'ANTICIPO' ? 'Anticipo' : 'Cobro de la salida'} · {MEDIO[p.metodo] ?? p.metodo}</span>
                        <span className="gm-mono">{formatImporte(p.monto)}</span>
                      </span>
                      <span className="block text-[12px] text-muted-foreground">
                        {horaDe(p.fecha)}{p.operador ? ` · ${p.operador}` : ''}{p.corregido ? ` · ya se corrigieron ${formatImporte(p.corregido)}` : ''}
                      </span>
                    </button>
                  ))}
                </fieldset>
              )}

              {tipo === 'MEDIO_PAGO' && cobro && (
                <div className="space-y-3">
                  <p className="rounded-xl border border-border bg-gm-surface-2/50 px-3 py-2.5 text-[13px]">
                    Figura en <strong>{(MEDIO[cobro.metodo] ?? cobro.metodo).toLowerCase()}</strong> → pasa a <strong>{cobro.metodo === 'CASH' ? 'transferencia' : 'efectivo'}</strong>
                  </p>
                  <fieldset className="space-y-2">
                    <legend className="mb-1.5 text-[13px] font-semibold">¿Cuánto fue por {cobro.metodo === 'CASH' ? 'transferencia' : 'efectivo'}?</legend>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" aria-pressed={!parcial && importe === restante(cobro)} disabled={pending}
                        onClick={() => { setParcial(false); setParcialTexto(''); setImporte(restante(cobro)); }} className={tarjeta(!parcial && importe === restante(cobro))}>
                        <span className="block text-[14px] font-semibold">Todo</span><span className="gm-mono block text-[12px] text-muted-foreground">{formatImporte(restante(cobro))}</span>
                      </button>
                      <button type="button" aria-pressed={parcial} disabled={pending} onClick={() => { setParcial(true); setImporte(null); }} className={tarjeta(parcial)}>
                        <span className="block text-[14px] font-semibold">Una parte</span><span className="block text-[12px] text-muted-foreground">Pago mixto</span>
                      </button>
                    </div>
                    {parcial && (
                      <>
                        <label htmlFor="corregir-importe" className="sr-only">Importe por el otro medio</label>
                        <input id="corregir-importe" inputMode="numeric" autoFocus placeholder="Importe" disabled={pending}
                          value={parcialTexto ? new Intl.NumberFormat('es-AR').format(Number(parcialTexto)) : ''}
                          onChange={(e) => { const d = e.target.value.replace(/\D/g, '').slice(0, 9); setParcialTexto(d); setImporte(d ? Number(d) : null); }}
                          className={cn(campo, 'gm-mono')} />
                      </>
                    )}
                  </fieldset>
                  {aTransferencia && !cobro.directo && (
                    <p className="rounded-xl border border-border bg-gm-surface-2/50 px-3 py-2.5 text-[12px] leading-relaxed text-gm-texto-2">
                      {cobro.motivoRevision ?? 'La revisa administración.'} Administración busca la transferencia en Mercado Pago; mientras tanto el efectivo esperado no cambia.
                    </p>
                  )}
                  {buscaTransferencia && importe && importe <= restante(cobro) ? (
                    <fieldset className="space-y-2">
                      <legend className="mb-1.5 text-[13px] font-semibold">¿Cuál es la transferencia?</legend>
                      {buscandoTransferencias ? <p role="status" className="text-[13px] text-muted-foreground">Buscando en Mercado Pago…</p> : (
                        <>
                          {transferencias && !transferencias.disponible && transferencias.motivo && (
                            <p className="text-[12px] text-muted-foreground">{transferencias.motivo}</p>
                          )}
                          {transferencias?.opciones.map((t) => (
                            <button key={t.operacionId} type="button" aria-pressed={operacionId === t.operacionId} disabled={pending}
                              onClick={() => setOperacionId(t.operacionId)} className={tarjeta(operacionId === t.operacionId)}>
                              <span className="flex items-baseline justify-between gap-2 text-[14px] font-semibold">
                                <span className="truncate">{t.nombre || 'Pagador sin nombre'}</span><span className="gm-mono">{formatImporte(t.importe)}</span>
                              </span>
                              <span className="block text-[12px] text-muted-foreground">{horaDe(t.fecha)}{t.entidad ? ` · ${t.entidad}` : ''} · Op. {t.operacionId}</span>
                            </button>
                          ))}
                          {transferencias?.disponible && !transferencias.opciones.length && (
                            <p className="text-[12px] text-muted-foreground">No hay acreditaciones libres de {formatImporte(importe)} cerca de las {horaDe(cobro.fecha)}.</p>
                          )}
                          <button type="button" aria-pressed={operacionId === 'SIN'} disabled={pending} onClick={() => setOperacionId('SIN')} className={tarjeta(operacionId === 'SIN')}>
                            <span className="block text-[14px] font-semibold">No la encuentro</span>
                            <span className="block text-[12px] text-muted-foreground">
                              {isAdmin ? 'Queda como transferencia aprobada por administración, no verificada.' : 'La revisa administración. Mientras tanto el efectivo esperado no cambia.'}
                            </span>
                          </button>
                        </>
                      )}
                    </fieldset>
                  ) : null}
                </div>
              )}

              {tipo === 'RECIBIDO_VUELTO' && (detalle.tipo === 'PASE' || cobro) && (
                <div className="space-y-2">
                  <p className="text-[13px] text-muted-foreground">
                    {figura?.recibido == null ? 'No se indicó con cuánto pagó.' : <>Figura: entregó <strong className="gm-mono text-foreground">{formatImporte(figura.recibido)}</strong> · vuelto <strong className="gm-mono text-foreground">{formatImporte(figura.vuelto ?? 0)}</strong></>}
                  </p>
                  <EfectivoRecibido aplicado={aplicadoEfectivo} recibido={recibido} onChange={setRecibido} disabled={pending} titulo="¿Con cuánto pagó de verdad?" />
                  <p className="text-[12px] text-muted-foreground">Es lo declarado: no cambia lo que entró a la caja. Si el vuelto que se dio fue otro, aparece al contar.</p>
                </div>
              )}

              {tipo === 'VEHICULO' && (
                <fieldset className="space-y-2">
                  <legend className="mb-1.5 text-[13px] font-semibold">¿Qué vehículo se fue de verdad?</legend>
                  <div className="relative">
                    <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <label htmlFor="corregir-buscar" className="sr-only">Buscar patente</label>
                    <input id="corregir-buscar" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar patente" autoComplete="off" className={cn(campo, 'pl-9')} />
                  </div>
                  <div className="max-h-56 space-y-2 overflow-y-auto">
                    {candidatos.map((v) => (
                      <button key={v.id} type="button" aria-pressed={destinoId === v.id} disabled={pending} onClick={() => setDestinoId(v.id)} className={tarjeta(destinoId === v.id)}>
                        <span className="gm-mono block text-[14px] font-semibold">{v.identificacion}</span>
                        <span className="block text-[12px] text-muted-foreground">Entró {v.entrada}</span>
                      </button>
                    ))}
                    {!candidatos.length && (
                      <p className="rounded-xl border border-dashed border-border p-3 text-[13px] text-muted-foreground">
                        {adentro.length ? 'Ninguno coincide con la búsqueda.' : 'No hay vehículos adentro.'} Si el que se fue no figura, usá «Otro error».
                      </p>
                    )}
                  </div>
                  <p className="text-[12px] text-muted-foreground">La salida y el cobro pasan a ese vehículo; {detalle.identificacion} vuelve a figurar adentro. La caja no cambia.</p>
                </fieldset>
              )}

              {MOTIVOS[tipo].length > 0 && (
                <fieldset className="space-y-2">
                  <legend className="mb-1.5 text-[13px] font-semibold">Motivo</legend>
                  <div className="flex flex-wrap gap-2">
                    {[...MOTIVOS[tipo], OTRO_MOTIVO].map((m) => (
                      <button key={m} type="button" aria-pressed={motivo === m} disabled={pending} onClick={() => setMotivo(m)}
                        className={cn('min-h-10 rounded-full border-[1.5px] px-3.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow',
                          motivo === m ? 'border-gm-yellow bg-gm-yellow/[0.12]' : 'border-gm-line-strong bg-gm-surface-2 hover:border-gm-yellow/40')}>
                        {m}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
              <div className="space-y-1.5">
                <label htmlFor="corregir-detalle" className="text-[13px] font-semibold">
                  {tipo === 'OTRO' ? '¿Qué estuvo mal?' : motivo === OTRO_MOTIVO ? 'Contá el motivo' : 'Detalle (opcional)'}
                </label>
                <textarea id="corregir-detalle" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={500} disabled={pending} rows={tipo === 'OTRO' ? 4 : 2}
                  placeholder={tipo === 'OTRO' ? 'Ej.: le cobré la tarifa de moto a un auto' : 'Qué pasó'} className={campo} />
                {tipo === 'OTRO' && <p className="text-[12px] text-muted-foreground">No cambia nada: queda en Avisos para que administración lo revise.</p>}
              </div>
            </>
          ) : resumen ? (
            <div className="space-y-3">
              <div className={cn('flex items-start gap-2.5 rounded-xl border p-3', aplicaAhora ? 'border-gm-ok/40 bg-gm-ok/10' : 'border-gm-orange/50 bg-gm-orange/10')}>
                {aplicaAhora ? <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-gm-ok" /> : <Clock3 aria-hidden className="mt-0.5 size-5 shrink-0 text-gm-orange" />}
                <div className="min-w-0 text-[13px] leading-relaxed">
                  <p className="text-[14px] font-semibold">{aplicaAhora ? 'Se aplica al confirmar' : 'Queda para revisión'}</p>
                  {!aplicaAhora && resumen.motivoRevision && <p className="text-gm-texto-2">{resumen.motivoRevision}</p>}
                </div>
              </div>
              <ul className="space-y-1.5 rounded-xl border border-border bg-gm-surface-2/50 p-3 text-[13px] leading-relaxed">
                {(resumen.efecto.lineas ?? []).map((l, i) => <li key={i}>{l}</li>)}
              </ul>
              <p className="text-[12px] text-muted-foreground">El registro original queda guardado en el historial de cambios.</p>
            </div>
          ) : null}
          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/40 p-3 text-[13px] text-destructive">
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />{error}
            </p>
          )}
        </ActionDialogBody>
        {detalle && paso !== 'tipo' && (
          <ActionDialogFooter>
            {paso === 'resumen' && (
              <ActionDialogSecondaryButton disabled={pending} onClick={() => { setPaso('datos'); setError(''); }}>Cambiar</ActionDialogSecondaryButton>
            )}
            {paso === 'datos' ? (
              <ActionDialogPrimaryButton disabled={pending || !!falta} onClick={revisar} falta={pending ? undefined : falta}>
                {pending ? 'Revisando…' : 'Revisar corrección'}
              </ActionDialogPrimaryButton>
            ) : (
              <ActionDialogPrimaryButton disabled={pending} onClick={confirmar} detail={detalle.identificacion}>
                {confirmando ? 'Guardando…' : aplicaAhora ? 'Aplicar corrección' : 'Enviar a revisión'}
              </ActionDialogPrimaryButton>
            )}
          </ActionDialogFooter>
        )}
      </ActionDialogContent>
    </ActionDialog>
  );
}
