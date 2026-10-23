'use client';

// «Se fue antes»: el auto se fue sin que nadie registrara la salida y el sistema siguió contando.
// Se elige la tarifa que le correspondía —las del vehículo que la estadía ya pasó y, en la última,
// cuántas veces la que se repite («cada»)— y se registra la salida en un solo paso: no hace falta
// la hora exacta ni corregir primero para cobrar después. Las tarifas y sus importes los arma el
// servidor con el mismo cálculo del cobro. El pago entra ahora, en el turno de quien lo registra,
// con los mismos medios que el cobro normal:
// - Efectivo, transferencia o efectivo + transferencia: la salida se registra junto con el pago.
// - QR o alias: se cobra el importe de la tarifa como anticipo y, al acreditarse, se registra la
//   salida (ya paga). Con efectivo + QR o alias, primero el efectivo y después el resto.
// Queda en la Actividad.
//
// Sin startTransition a propósito, como CorregirEntrada: un error de red iría a la pantalla de error.

import { useCallback, useEffect, useState } from 'react';
import { Banknote, Landmark } from 'lucide-react';
import {
  ActionDialog,
  ActionDialogBody,
  ActionDialogContent,
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogPrimaryButton,
} from '@/components/ui/action-dialog';
import { DataLoading } from '@/components/ui/data-loading';
import { CashAmountField } from '@/components/cash-amount-field';
import { formatImporte } from '@/components/pricing-breakdown';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { opcionesSalidaAnteriorAction, registrarSalidaAnteriorAction } from '@/actions/tickets/salida-anterior.action';
import { getCloseSummaryAction } from '@/actions/tickets/get-close-summary.action';
import { pagoParcialEfectivoAction } from '@/actions/tickets/pago-parcial.action';
import { crearCobroMercadoPagoAction } from '@/actions/mercadopago/mercadopago.action';
import { disponibilidadAliasAction, iniciarCobroAliasAction } from '@/actions/mercadopago/verificacion-alias.action';
import type { OpcionesSalidaAnterior, OpcionSalidaAnterior } from '@/services/tickets.service';
import type { TicketRegistration } from '@/types/ticket-registration.type';
import type { CobroMercadoPago } from '@/types/mercadopago.type';
import type { CobroAlias } from '@/types/verificacion-alias.type';
import { cuandoEntro, formatEstadia } from '@/utils/estadia';
import { PaymentMethodChoices, type MedioSalida } from './payment-method-choices';
import { CobroQrMercadoPago } from './cobro-qr-mercadopago';
import { CobroAliasPanel } from './cobro-alias';
import { TarifasElegibles } from './tarifas-elegibles';

type Devolucion = 'CASH' | 'TRANSFER';
const DEVOLUCIONES: { id: Devolucion; texto: string; Icono: typeof Banknote }[] = [
  { id: 'CASH', texto: 'Efectivo', Icono: Banknote },
  { id: 'TRANSFER', texto: 'Transferencia', Icono: Landmark },
];
type Resto = 'TRANSFER' | 'QR' | 'ALIAS';

export function SeFueAntes({ registration, open, onOpenChange, onRegistrada }: {
  registration: TicketRegistration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistrada: (registration: TicketRegistration) => void;
}) {
  const [datos, setDatos] = useState<OpcionesSalidaAnterior | null>(null);
  const [cargando, setCargando] = useState(false);
  const [elegida, setElegida] = useState<string | null>(null);
  const [cada, setCada] = useState(0);
  const [medio, setMedio] = useState<MedioSalida | null>(null);
  const [devolucion, setDevolucion] = useState<Devolucion | null>(null);
  const [efectivoHibrido, setEfectivoHibrido] = useState('');
  const [restoPor, setRestoPor] = useState<Resto>('TRANSFER');
  const [aliasDisponible, setAliasDisponible] = useState(false);
  const [cobroQr, setCobroQr] = useState<CobroMercadoPago | null>(null);
  const [cobroAlias, setCobroAlias] = useState<CobroAlias | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const id = registration?.id;

  const cargar = useCallback(async (estadia: string) => {
    setCargando(true);
    try {
      const resultado = await opcionesSalidaAnteriorAction(estadia);
      if (resultado.error || !resultado.opciones) { setError(resultado.error || 'No se pudieron cargar las tarifas.'); return null; }
      const nuevos = { ahora: resultado.ahora ?? 0, cobrado: resultado.cobrado ?? 0, opciones: resultado.opciones };
      setDatos(nuevos);
      return nuevos;
    } catch {
      setError('No se pudieron cargar las tarifas. Revisá la conexión e intentá de nuevo.');
      return null;
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !id) return;
    setDatos(null); setElegida(null); setCada(0); setMedio(null); setDevolucion(null); setEfectivoHibrido('');
    setRestoPor('TRANSFER'); setCobroQr(null); setCobroAlias(null); setError('');
    void cargar(id);
    void disponibilidadAliasAction().then((r) => setAliasDisponible(!!r.datos?.disponible));
  }, [open, id, cargar]);

  if (!registration) return null;

  // Las tarifas de base y las que repiten la franja abierta (van como contador sobre la última).
  const base = (datos?.opciones ?? []).filter((o) => !o.repeticiones);
  const repeticiones = (datos?.opciones ?? []).filter((o) => o.repeticiones).sort((a, b) => a.repeticiones! - b.repeticiones!);
  const ultimaBase = base[base.length - 1];
  const etiquetaCada = repeticiones[0]?.etiqueta.split(' × ').pop() ?? '';
  const elegidaBase = base.find((o) => o.salidaEn === elegida) ?? null;
  const opcion: OpcionSalidaAnterior | null =
    elegidaBase && elegidaBase === ultimaBase && cada > 0 ? repeticiones[cada - 1] ?? null : elegidaBase;

  const cobrado = datos?.cobrado ?? 0;
  const saldo = opcion ? Math.max(0, opcion.precio - cobrado) : 0;
  const devolver = opcion ? Math.max(0, cobrado - opcion.precio) : 0;
  const esperando = cobroQr?.estado === 'PENDIENTE' || (!!cobroAlias && ['ESPERANDO', 'REVISION'].includes(cobroAlias.estado));
  const efectivoParte = efectivoHibrido ? Number(efectivoHibrido) : 0;
  const errorHibrido = medio !== 'AMBOS' ? null : !efectivoParte ? 'Ingresá cuánto entrega en efectivo.' : efectivoParte >= saldo ? 'El efectivo cubre todo: elegí «Efectivo».' : null;
  const restoMedios: { id: Resto; texto: string }[] = [
    { id: 'TRANSFER', texto: 'Transferencia' },
    { id: 'QR', texto: 'QR' },
    ...(aliasDisponible ? [{ id: 'ALIAS' as const, texto: 'Al alias' }] : []),
  ];
  const listo = !!opcion && !enviando && !esperando && (saldo > 0 ? !!medio && !errorHibrido : devolver > 0 ? !!devolucion : true);
  const patente = registration.licensePlateOriginal || registration.ticket?.codeBar || registration.codeBarTicket || registration.lastNameCustomer || 'Sin patente';
  const etiquetaOpcion = opcion?.etiqueta ?? '';

  const terminar = (registrada: TicketRegistration) => {
    toast.success(`Salida registrada: ${patente} con «${etiquetaOpcion}».`);
    onOpenChange(false);
    onRegistrada(registrada);
  };

  // Registra la salida con la tarifa elegida y el pago que corresponda (o sin cobro si ya está paga).
  const registrar = async (pago: { metodo?: Devolucion; pagos?: { metodo: Devolucion; importe: number }[] } = {}, actual = datos) => {
    if (!opcion || !actual) return;
    const vigente = actual.opciones.find((o) => o.salidaEn === opcion.salidaEn);
    if (!vigente) { setError('La tarifa elegida ya no está disponible. Elegí otra.'); return; }
    const pendiente = Math.max(0, vigente.precio - actual.cobrado);
    const exceso = Math.max(0, actual.cobrado - vigente.precio);
    const resultado = await registrarSalidaAnteriorAction(registration.id, {
      salidaEn: vigente.salidaEn,
      expectedPrice: vigente.precio,
      expectedCollected: actual.cobrado,
      closeType: pendiente > 0 ? 'PAYMENT' : 'NO_CHARGE',
      ...(pendiente > 0 ? pago : {}),
      ...(exceso > 0 && devolucion ? { refundMetodo: devolucion } : {}),
    });
    if (resultado.error || !resultado.registration) {
      setError(resultado.error || 'No se pudo registrar la salida.');
      // Cambió lo cobrado mientras tanto (un anticipo, otro cobro): se vuelven a pedir las tarifas.
      if (resultado.code === 'TICKET_PRICE_CHANGED') await cargar(registration.id);
      return;
    }
    terminar(resultado.registration);
  };

  // El QR o el alias se acreditaron: con lo cobrado al día, se registra la salida. Si quedó algo
  // por cobrar (la tarifa calculada difiere en algún peso), se pide con efectivo o transferencia.
  const alAcreditarse = async () => {
    setCobroQr(null); setCobroAlias(null); setMedio(null); setEfectivoHibrido('');
    setEnviando(true);
    try {
      const actual = await cargar(registration.id);
      const vigente = actual?.opciones.find((o) => o.salidaEn === opcion?.salidaEn);
      if (!actual || !vigente) return;
      if (vigente.precio - actual.cobrado > 0) {
        setError(`El pago entró. Falta cobrar ${formatImporte(vigente.precio - actual.cobrado)}: elegí cómo.`);
        return;
      }
      await registrar({}, actual);
    } finally {
      setEnviando(false);
    }
  };

  // QR o alias como anticipo de la tarifa elegida: el servidor calcula lo que falta para cubrirla.
  const pedirAnticipo = async (por: 'QR' | 'ALIAS') => {
    if (!opcion) return;
    const anticipo = { anticipoMinutos: opcion.minutos, anticipoEtiqueta: opcion.etiqueta };
    if (por === 'QR') {
      const r = await crearCobroMercadoPagoAction(registration.id, 'HORA', anticipo);
      if (r.error || !r.cobro) { setError(r.error ?? 'No se pudo generar el QR.'); return; }
      setCobroQr(r.cobro);
    } else {
      const r = await iniciarCobroAliasAction(registration.id, 'HORA', anticipo);
      if (r.error || !r.datos) { setError(r.error ?? 'No se pudo empezar a esperar la transferencia.'); return; }
      if (r.datos.estado === 'CONFIRMADO') await alAcreditarse();
      else setCobroAlias(r.datos);
    }
  };

  const confirmar = async () => {
    if (!opcion || !listo) return;
    setEnviando(true);
    setError('');
    try {
      if (saldo === 0) return await registrar();
      if (medio === 'CASH' || medio === 'TRANSFER') return await registrar({ metodo: medio });
      if (medio === 'AMBOS' && restoPor === 'TRANSFER')
        return await registrar({ pagos: [{ metodo: 'CASH', importe: efectivoParte }, { metodo: 'TRANSFER', importe: saldo - efectivoParte }] });
      if (medio === 'AMBOS') {
        // Primero el efectivo, que ya está en la mano (como en el cobro normal); el QR o el alias
        // piden después lo que falta para cubrir la tarifa.
        const resumen = await getCloseSummaryAction(registration.id);
        if (!resumen || !('previewBracket' in resumen)) { setError('No se pudo leer la estadía. Intentá de nuevo.'); return; }
        const parcial = await pagoParcialEfectivoAction(registration.id, { importe: efectivoParte, expectedPrice: resumen.previewBracket.price, expectedCollected: resumen.totalCollectedSoFar });
        if (parcial.error) { setError(parcial.error); return; }
        toast.success(`Efectivo cobrado: ${formatImporte(efectivoParte)}.`);
        await cargar(registration.id);
        return await pedirAnticipo(restoPor as 'QR' | 'ALIAS');
      }
      if (medio === 'QR' || medio === 'ALIAS') return await pedirAnticipo(medio);
    } catch {
      setError('No se pudo registrar la salida. Revisá la conexión e intentá de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const elegir = (clave: string) => { setElegida(clave); setCada(0); setMedio(null); setDevolucion(null); setError(''); };
  const detalleBoton = !opcion ? 'Elegí la tarifa' : saldo > 0 ? formatImporte(saldo) : etiquetaOpcion;
  const textoBoton = enviando ? 'Registrando…'
    : saldo > 0 && (medio === 'QR' || (medio === 'AMBOS' && restoPor === 'QR')) ? 'Cobrar con QR'
    : saldo > 0 && (medio === 'ALIAS' || (medio === 'AMBOS' && restoPor === 'ALIAS')) ? 'Esperar transferencia al alias'
    : saldo > 0 ? 'Cobrar y registrar salida' : 'Registrar salida';

  return (
    <ActionDialog open={open} onOpenChange={(o) => { if (!enviando && !esperando) onOpenChange(o); }}>
      <ActionDialogContent>
        <ActionDialogHeader title="Se fue antes" description={`${patente} · entró ${cuandoEntro(registration)}`} />
        <ActionDialogBody>
          {cargando && !datos ? (
            <DataLoading label="Cargando tarifas…" />
          ) : datos && !datos.opciones.length ? (
            <p className="rounded-2xl border border-border bg-gm-surface-2 p-3.5 text-[13.5px] leading-relaxed text-muted-foreground">
              Todavía está en la primera tarifa: no hay una más barata. Cobralo normal, con {formatImporte(datos.ahora)}.
            </p>
          ) : datos && (
            <section aria-labelledby="se-fue-tarifa" className="space-y-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <p id="se-fue-tarifa" className="text-[14px] font-semibold">¿Qué tarifa le corresponde?</p>
                <p className="shrink-0 text-[12px] text-muted-foreground">Ahora serían {formatImporte(datos.ahora)}</p>
              </div>
              <TarifasElegibles
                id="se-fue-tarifa"
                disabled={enviando || esperando}
                opciones={base.map((o) => ({ clave: o.salidaEn, etiqueta: o.etiqueta, detalle: `hasta ${formatEstadia(o.minutos)}`, precio: o.precio }))}
                elegida={elegida}
                onElegir={elegir}
                cada={repeticiones.length ? {
                  etiqueta: etiquetaCada, max: repeticiones.length, cantidad: cada,
                  onCantidad: (n) => { setCada(n); setMedio(null); setError(''); },
                  precioCon: (n) => repeticiones[n - 1]?.precio ?? ultimaBase?.precio ?? 0,
                } : null}
              />
            </section>
          )}

          {error && <p role="alert" className="text-[13px] text-gm-orange">{error}</p>}

          {opcion && cobrado > 0 && (
            <p className="text-[12.5px] text-muted-foreground">
              {saldo > 0 ? `Ya pagó ${formatImporte(cobrado)}: falta cobrar ${formatImporte(saldo)}.` : devolver > 0 ? `Ya pagó ${formatImporte(cobrado)}: se devuelven ${formatImporte(devolver)}.` : 'Ya está pago: solo se registra la salida.'}
            </p>
          )}

          {cobroQr && <CobroQrMercadoPago cobro={cobroQr} onAcreditado={() => void alAcreditarse()} onCancelar={() => setCobroQr(null)} />}
          {cobroAlias && <CobroAliasPanel cobro={cobroAlias} onTerminado={() => void alAcreditarse()} onCancelado={() => setCobroAlias(null)} />}

          {opcion && saldo > 0 && !esperando && (
            <div role="group" aria-labelledby="se-fue-medio" className="space-y-2">
              <p id="se-fue-medio" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">¿Cómo paga?</p>
              <PaymentMethodChoices compact hibrido value={medio} onChange={(m) => { setMedio(m); setError(''); }} disabled={enviando} aliasDisponible={aliasDisponible} />
              {medio === 'AMBOS' && (
                <div className="space-y-2.5 rounded-2xl border border-border bg-gm-surface-2/50 p-3">
                  <CashAmountField compact id="se-fue-efectivo" label="En efectivo" value={efectivoHibrido} onChange={setEfectivoHibrido} disabled={enviando} max={saldo} />
                  <div className="space-y-2 border-t border-dashed border-gm-line-strong pt-2.5">
                    <p className="flex items-center justify-between gap-2">
                      <span className="text-[13.5px] font-semibold">El resto</span>
                      <span className="gm-mono text-[20px] font-bold leading-none">{formatImporte(Math.max(0, saldo - efectivoParte))}</span>
                    </p>
                    <div role="group" aria-label="Cómo paga el resto" className={cn('grid gap-2', restoMedios.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
                      {restoMedios.map((m) => (
                        <button key={m.id} type="button" aria-pressed={restoPor === m.id} disabled={enviando} onClick={() => setRestoPor(m.id)}
                          className={cn('h-11 rounded-xl border-[1.5px] px-1 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow',
                            restoPor === m.id ? 'border-gm-yellow bg-gm-yellow/[0.12]' : 'border-gm-line-strong bg-gm-surface-2 hover:border-gm-yellow/40')}>
                          {m.texto}
                        </button>
                      ))}
                    </div>
                  </div>
                  {errorHibrido && efectivoHibrido && <p role="alert" className="text-xs text-gm-orange">{errorHibrido}</p>}
                </div>
              )}
              {(medio === 'QR' || medio === 'ALIAS' || (medio === 'AMBOS' && restoPor !== 'TRANSFER')) && (
                <p className="text-xs text-muted-foreground">Cuando el pago se acredite, la salida se registra sola con «{etiquetaOpcion}».</p>
              )}
            </div>
          )}

          {opcion && devolver > 0 && !esperando && (
            <div role="group" aria-labelledby="se-fue-devolucion" className="space-y-2">
              <p id="se-fue-devolucion" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">¿Cómo se devuelve?</p>
              <div className="grid grid-cols-2 gap-2">
                {DEVOLUCIONES.map(({ id: valor, texto, Icono }) => (
                  <button key={valor} type="button" aria-pressed={devolucion === valor} disabled={enviando} onClick={() => setDevolucion(valor)}
                    className={cn('flex min-h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-50',
                      devolucion === valor ? 'border-gm-yellow bg-gm-yellow/[0.12]' : 'border-gm-line-strong bg-gm-surface-2 hover:border-gm-yellow/40')}>
                    <Icono className={cn('size-[18px]', devolucion === valor ? 'text-gm-yellow' : 'text-muted-foreground')} aria-hidden />
                    {texto}
                  </button>
                ))}
              </div>
            </div>
          )}
        </ActionDialogBody>
        {!esperando && (
          <ActionDialogFooter>
            <ActionDialogPrimaryButton disabled={!listo} onClick={() => void confirmar()} detail={detalleBoton}>
              {textoBoton}
            </ActionDialogPrimaryButton>
          </ActionDialogFooter>
        )}
      </ActionDialogContent>
    </ActionDialog>
  );
}
