'use client';
import LatticeLoader from '@/components/ui/lattice-loader';
import { DataLoading } from '@/components/ui/data-loading';

// Cobrarle a un inquilino, en el orden en que se piensa en el mostrador:
//   1. Qué paga: los cargos pendientes, arriba y ya marcados. El total sale de lo marcado.
//   2. Cuánto: ese total, que se puede cambiar si entrega otra cosa (una parte, o de más:
//      lo que sobra queda a favor). Cada cargo muestra cómo queda.
//   3. Cómo: efectivo, transferencia, o las dos; en ese caso se escribe el efectivo y la
//      transferencia es el resto, así el reparto siempre cierra. O un QR de MercadoPago: ahí no
//      se declara nada, el pago se asienta solo cuando MercadoPago confirma que la plata entró.
// La frase que importa —«Recibís $X. Quedan pendientes $Y»— va en el pie, junto al botón.

import { useEffect, useMemo, useState } from 'react';
import { Check, Pencil, QrCode } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { plata } from '@/components/plataforma/formato';
import { useTenant } from '@/components/tenant-provider';
import { getCuentaMostradorAction, registrarPagoAction } from '@/actions/cuentas/cuentas.action';
import { crearCobroMercadoPagoAction } from '@/actions/mercadopago/mercadopago.action';
import { DeudaCuenta, ResultadoPago, nombreMetodo } from '@/types/cuenta.type';
import { CobroMercadoPago } from '@/types/mercadopago.type';
import { CobroQrMercadoPago } from '@/app/(protected)/(user)/tickets/components/cobro-qr-mercadopago';
import { CampoImporte } from './campo-importe';
import { EntregaRecibo } from './entrega-recibo';
import { colorSaldo, fechaAR, leerImporte, nuevoId, simularImputacion, textoSaldo } from './util';

type Modo = 'CASH' | 'TRANSFER' | 'AMBOS' | 'QR';
const MODOS: { id: Modo; label: string }[] = [
  { id: 'CASH', label: 'Efectivo' },
  { id: 'TRANSFER', label: 'Transferencia' },
  { id: 'AMBOS', label: 'Las dos' },
  { id: 'QR', label: 'QR' },
];

const titulo = 'mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground';

const sumaDe = (ids: string[], lista: DeudaCuenta[]) =>
  lista.filter((r) => ids.includes(r.id)).reduce((s, r) => s + r.saldo, 0);

export function CobrarDialog({
  customerId,
  nombre,
  open,
  onOpenChange,
  preseleccion,
  onCobrado,
}: {
  customerId: string;
  nombre: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  // Cargo con el que abrir, solo (desde «Cobrar este cargo»).
  preseleccion?: string;
  onCobrado?: () => void;
}) {
  const { context, playaId } = useTenant();
  const [cargando, setCargando] = useState(false);
  const [pendientes, setPendientes] = useState<DeudaCuenta[]>([]);
  const [saldo, setSaldo] = useState(0);
  const [vencido, setVencido] = useState(0);
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [texto, setTexto] = useState('');
  const [editandoTotal, setEditandoTotal] = useState(false);
  const [modo, setModo] = useState<Modo>('CASH');
  const [efectivoTexto, setEfectivoTexto] = useState('');
  const [nota, setNota] = useState('');
  const [conNota, setConNota] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoPago | null>(null);
  const [error, setError] = useState('');
  const [cobroQr, setCobroQr] = useState<CobroMercadoPago | null>(null);
  // Uno por cobro: si la respuesta se pierde y se reintenta, el servidor reconoce el mismo cobro.
  const [solicitud, setSolicitud] = useState('');

  useEffect(() => {
    if (!open) return;
    setResultado(null);
    setCobroQr(null);
    setError('');
    setNota('');
    setConNota(false);
    setModo('CASH');
    setEfectivoTexto('');
    setEditandoTotal(false);
    setSolicitud(nuevoId());
    setCargando(true);
    // Lo mismo que ve el operador: deudas y saldo, sin el libro.
    void getCuentaMostradorAction(customerId).then((r) => {
      setCargando(false);
      if (!r.data) {
        setError(r.error ?? 'No se pudo cargar la cuenta.');
        return;
      }
      const lista = r.data.deudas
        .filter((x) => x.saldo > 0)
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
      setPendientes(lista);
      setSaldo(r.data.saldo);
      setVencido(r.data.vencido);
      // Por defecto, todo lo pendiente; desde «Cobrar este cargo», solo ese.
      const inicial = preseleccion && lista.some((x) => x.id === preseleccion) ? [preseleccion] : lista.map((x) => x.id);
      setElegidos(inicial);
      const suma = sumaDe(inicial, lista);
      setTexto(suma ? String(suma) : '');
    });
  }, [open, customerId, preseleccion]);

  // Marcar o desmarcar un cargo recalcula el total: lo marcado es lo que paga.
  const cambiarSeleccion = (ids: string[]) => {
    setElegidos(ids);
    const suma = sumaDe(ids, pendientes);
    setTexto(suma ? String(suma) : '');
    setEditandoTotal(false);
  };
  const alternar = (id: string) =>
    cambiarSeleccion(elegidos.includes(id) ? elegidos.filter((x) => x !== id) : [...elegidos, id]);

  const lecturaTotal = leerImporte(texto);
  const total = lecturaTotal.valor;
  const sumaMarcada = sumaDe(elegidos, pendientes);
  // Los marcados primero (del más viejo al más nuevo), como lo aplica el servidor.
  const ordenElegidos = useMemo(
    () => pendientes.filter((r) => elegidos.includes(r.id)).map((r) => r.id),
    [pendientes, elegidos],
  );
  const simulacion = useMemo(() => simularImputacion(pendientes, ordenElegidos, total), [pendientes, ordenElegidos, total]);

  const lecturaEfectivo = leerImporte(efectivoTexto);
  const efectivo = lecturaEfectivo.valor;
  const transferencia = Math.max(0, total - efectivo);
  const errorReparto =
    modo !== 'AMBOS'
      ? null
      : lecturaEfectivo.error
        ? lecturaEfectivo.error
        : !efectivo
          ? 'Ingresá cuánto entrega en efectivo.'
          : efectivo >= total
            ? 'El efectivo cubre todo: elegí «Efectivo».'
            : null;

  const pagos: { metodo: 'CASH' | 'TRANSFER'; importe: number }[] =
    !total || modo === 'QR'
    ? []
    : modo === 'AMBOS'
      ? [
          { metodo: 'CASH' as const, importe: efectivo },
          { metodo: 'TRANSFER' as const, importe: transferencia },
        ].filter((p) => p.importe > 0)
      : [{ metodo: modo, importe: total }];

  const saldoNuevo = saldo - total;
  const listo = total > 0 && !lecturaTotal.error && !errorReparto && !enviando && !cargando && !error;

  async function confirmar() {
    if (!listo) return;
    setEnviando(true);
    if (modo === 'QR') {
      const q = await crearCobroMercadoPagoAction(customerId, 'INQUILINO', {
        monto: total,
        receiptIds: ordenElegidos.length ? ordenElegidos : undefined,
        nota: nota.trim() || undefined,
      });
      setEnviando(false);
      if (!q.cobro) {
        toast.error(q.error ?? 'No se pudo generar el QR.');
        return;
      }
      setCobroQr(q.cobro);
      return;
    }
    const r = await registrarPagoAction(customerId, {
      pagos,
      receiptIds: ordenElegidos.length ? ordenElegidos : undefined,
      nota: nota.trim() || undefined,
      solicitudId: solicitud,
    });
    setEnviando(false);
    if (!r.data) {
      toast.error(r.error ?? 'No se pudo registrar el cobro. Podés reintentar: no se cobra dos veces.');
      return;
    }
    setResultado(r.data);
    toast.success(
      r.data.repetido
        ? `Ese cobro ya estaba registrado (recibo N° ${r.data.numero}): no se cobró de nuevo.`
        : `Cobro registrado · recibo N° ${r.data.numero}`,
    );
    onCobrado?.();
  }

  // MercadoPago confirmó el pago: el servidor ya lo asentó y devuelve su recibo.
  function acreditado(cobro: CobroMercadoPago) {
    setCobroQr(cobro);
    if (cobro.recibo) setResultado(cobro.recibo);
    toast.success(cobro.recibo ? `Pago acreditado · recibo N° ${cobro.recibo.numero}` : 'Pago acreditado.');
    onCobrado?.();
  }
  const esperandoQr = cobroQr?.estado === 'PENDIENTE';

  const playa = context.playas.find((p) => p.id === playaId)?.nombre;
  const comoPaga =
    modo === 'AMBOS' && !errorReparto
      ? `(${plata(efectivo)} en efectivo y ${plata(transferencia)} por transferencia)`
      : modo === 'AMBOS'
        ? 'en efectivo y por transferencia'
        : modo === 'QR'
          ? 'con MercadoPago (QR)'
          : modo === 'CASH'
          ? 'en efectivo'
          : 'por transferencia';
  const despues =
    saldoNuevo > 0
      ? `Quedan pendientes ${plata(saldoNuevo)}.`
      : saldoNuevo < 0
        ? `Quedan ${plata(-saldoNuevo)} a favor.`
        : 'La cuenta queda al día.';
  const distintoDeLoMarcado = total > 0 && total !== sumaMarcada;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        // Con el QR esperando, cerrar dejaría un pago que nadie consulta: se cancela primero.
        if (!v && esperandoQr) {
          toast.error('Cancelá el QR antes de cerrar, o esperá a que se acredite.');
          return;
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="w-full max-w-xl">
        <DialogHeader>
          <DialogTitle className="pr-8 font-display text-2xl">{resultado ? 'Pago registrado' : `Cobrar a ${nombre}`}</DialogTitle>
          <DialogDescription>
            {resultado ? (
              `Recibo de pago N° ${resultado.numero}. Entregáselo ahora o más tarde desde la pestaña Pagos.`
            ) : (
              <>
                Saldo de la cuenta: <strong className={colorSaldo(saldo)}>{textoSaldo(saldo)}</strong>
                {vencido > 0 && <span className="text-[#FF7A4D]"> · {plata(vencido)} vencido</span>}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {cargando && (
          <DataLoading label="Cargando la cuenta…" />
        )}
        {error && <p className="py-4 text-sm text-destructive">{error}</p>}

        {cobroQr && !resultado && (
          <CobroQrMercadoPago cobro={cobroQr} onAcreditado={acreditado} onCancelar={() => setCobroQr(null)} />
        )}

        {!cargando && !error && !resultado && !cobroQr && (
          <>
            {/* 1 · Qué paga */}
            <section>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className={titulo}>Qué paga</h3>
                {pendientes.length > 1 && elegidos.length < pendientes.length && (
                  <button
                    type="button"
                    onClick={() => cambiarSeleccion(pendientes.map((r) => r.id))}
                    className="text-xs font-semibold text-gm-yellow hover:text-[#FFD84D]"
                  >
                    Marcar todo
                  </button>
                )}
              </div>

              {pendientes.length ? (
                <div className="overflow-hidden rounded-xl border border-border">
                  {pendientes.map((r) => {
                    const marcado = elegidos.includes(r.id);
                    const linea = simulacion.lineas.find((l) => l.recibo.id === r.id);
                    return (
                      <label
                        key={r.id}
                        className={`flex cursor-pointer items-center gap-3 border-b border-border px-3.5 py-3 transition-colors last:border-b-0 ${
                          marcado ? 'bg-gm-yellow/[0.05]' : 'hover:bg-gm-surface-2'
                        }`}
                      >
                        <input type="checkbox" checked={marcado} onChange={() => alternar(r.id)} className="size-[18px] shrink-0 accent-[#F5C219]" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{r.concepto}</span>
                          <span className={`block text-xs ${r.vencido ? 'font-semibold text-[#FF7A4D]' : 'text-muted-foreground'}`}>
                            {r.vencido ? `Venció el ${fechaAR(r.vencimiento)}` : `Vence el ${fechaAR(r.vencimiento)}`}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-sm font-semibold tabular-nums">{plata(r.saldo)}</span>
                          {/* Solo cuando el importe no coincide con lo marcado hace falta ver cómo queda cada uno. */}
                          {distintoDeLoMarcado && (
                            <span
                              className={`block text-[11px] font-semibold ${
                                !linea ? 'text-muted-foreground' : linea.queda ? 'text-gm-yellow' : 'text-emerald-400'
                              }`}
                            >
                              {!linea ? 'No se cubre' : linea.queda ? `Paga ${plata(linea.aplicado)}` : 'Queda saldado'}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                  No tiene cargos pendientes. Lo que pague queda como saldo a favor para los próximos cargos.
                </p>
              )}

              {/* 2 · Cuánto: sale de lo marcado; se cambia si entrega otra cosa. */}
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-gm-surface-2/60 px-4 py-3">
                <span className="text-sm font-semibold">Total a cobrar</span>
                {editandoTotal || !pendientes.length ? (
                  <CampoImporte
                    className="w-48"
                    grande
                    autoFocus={editandoTotal}
                    ariaLabel="Total a cobrar"
                    texto={texto}
                    onTexto={setTexto}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditandoTotal(true)}
                    className="group flex items-center gap-2"
                    aria-label="Cambiar el total a cobrar"
                  >
                    <span className="font-display text-[26px] font-semibold tabular-nums">{plata(total)}</span>
                    <Pencil className="size-4 text-muted-foreground group-hover:text-foreground" />
                  </button>
                )}
              </div>
              {distintoDeLoMarcado && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {total < sumaMarcada
                    ? 'Paga una parte: se aplica primero a lo marcado, del cargo más viejo al más nuevo.'
                    : simulacion.aFavor > 0
                      ? `Paga de más: ${plata(simulacion.aFavor)} quedan a favor para los próximos cargos.`
                      : 'Paga más que lo marcado: el resto se aplica a los otros cargos pendientes.'}
                </p>
              )}
            </section>

            {/* 3 · Cómo paga */}
            <section>
              <h3 className={titulo}>Cómo paga</h3>
              <div role="radiogroup" aria-label="Medio de pago" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {MODOS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={modo === o.id}
                    onClick={() => setModo(o.id)}
                    className={`flex h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-[13px] font-semibold transition-colors sm:text-sm ${
                      modo === o.id
                        ? 'border-gm-yellow bg-gm-yellow text-gm-ink'
                        : 'border-border text-muted-foreground hover:bg-gm-surface-2 hover:text-foreground'
                    }`}
                  >
                    {o.id === 'QR' && <QrCode className="size-4" />}
                    {o.label}
                  </button>
                ))}
              </div>
              {modo === 'AMBOS' && (
                <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-border p-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">En efectivo</span>
                    <CampoImporte ariaLabel="Importe en efectivo" texto={efectivoTexto} onTexto={setEfectivoTexto} />
                  </label>
                  <div>
                    <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Por transferencia (el resto)</span>
                    <span className="flex h-11 items-center rounded-xl border border-dashed border-border px-3 text-sm font-semibold tabular-nums">
                      {plata(transferencia)}
                    </span>
                  </div>
                  {errorReparto && efectivoTexto && <p className="text-xs text-[#FF7A4D] sm:col-span-2">{errorReparto}</p>}
                </div>
              )}
              {modo === 'QR' && (
                <p className="mt-3 rounded-xl border border-border px-3.5 py-3 text-sm text-muted-foreground">
                  Se genera un código de MercadoPago por el total. El inquilino lo escanea y paga desde el celular;
                  el pago se registra solo cuando MercadoPago confirma que la plata entró.
                </p>
              )}
            </section>

            <section>
              {conNota ? (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Nota (opcional)</span>
                  <input
                    autoFocus
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    maxLength={255}
                    placeholder="Ej.: transferencia desde la cuenta de la hermana"
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gm-yellow"
                  />
                </label>
              ) : (
                <button type="button" onClick={() => setConNota(true)} className="text-sm font-semibold text-muted-foreground hover:text-foreground">
                  + Agregar una nota
                </button>
              )}
            </section>
          </>
        )}

        {resultado && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.06] px-4 py-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-emerald-400/15">
                <Check className="size-5 text-emerald-400" />
              </span>
              <div>
                <div className="font-display text-xl font-semibold">Recibiste {plata(resultado.total)}</div>
                <div className="text-xs text-muted-foreground">
                  {resultado.medios.map((m) => `${nombreMetodo(m.metodo)} ${plata(m.importe)}`).join(' · ')}
                </div>
              </div>
            </div>
            {resultado.repetido && (
              <p className="rounded-xl border border-gm-yellow/40 px-4 py-2.5 text-sm">
                Este cobro ya se había registrado: se muestra el mismo recibo y no se cobró de nuevo.
              </p>
            )}
            {resultado.imputaciones.length > 0 && (
              <ul className="divide-y divide-border rounded-2xl border border-border">
                {resultado.imputaciones.map((i, n) => (
                  <li key={`${i.receiptId}-${n}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span>{i.concepto}</span>
                    <span className="tabular-nums">
                      {plata(i.aplicado)}{' '}
                      <span className={i.saldoRecibo ? 'text-muted-foreground' : 'text-emerald-400'}>
                        {i.saldoRecibo ? `· quedan ${plata(i.saldoRecibo)}` : '· saldado'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-between rounded-2xl border border-border bg-background px-4 py-3 text-sm">
              <span className="text-muted-foreground">Saldo de la cuenta</span>
              <strong className={colorSaldo(resultado.saldo)}>{textoSaldo(resultado.saldo)}</strong>
            </div>
            <EntregaRecibo pagoId={resultado.id} resultado={resultado} playa={playa} />
          </div>
        )}

        {/* Pie fijo abajo del área que se desplaza (compensa el relleno del cuerpo del diálogo): la
            frase del cobro y el botón siempre a la vista, aunque la lista de cargos sea larga. */}
        {(!cobroQr || resultado) && (
        <div className="sticky bottom-[-24px] z-10 -mx-6 -mb-6 border-t border-border bg-card px-6 py-4">
          {resultado ? (
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => onOpenChange(false)} className="h-11 rounded-xl bg-gm-yellow px-5 text-sm font-bold text-gm-ink hover:bg-[#FFD23A]">
                Listo
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="min-w-0 flex-1 text-sm leading-snug" role="status">
                {total > 0 && !lecturaTotal.error ? (
                  <>
                    <strong>
                      Recibís {plata(total)} {comoPaga}.
                    </strong>{' '}
                    <span className={colorSaldo(saldoNuevo)}>{despues}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Marcá qué paga o escribí el total.</span>
                )}
              </p>
              <div className="flex shrink-0 justify-end gap-2">
                <button type="button" onClick={() => onOpenChange(false)} className="h-11 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-gm-surface-2">
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!listo}
                  onClick={() => void confirmar()}
                  className="flex h-11 items-center gap-2 rounded-xl bg-gm-yellow px-5 text-sm font-bold text-gm-ink hover:bg-[#FFD23A] disabled:opacity-50"
                >
                  {enviando ? <LatticeLoader compact label="Procesando…" showTimer={false} cellSize={4} gap={1} /> : modo === 'QR' && <QrCode className="size-4" />}
                  {modo === 'QR' ? 'Generar QR' : total ? `Cobrar ${plata(total)}` : 'Cobrar'}
                </button>
              </div>
            </div>
          )}
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
