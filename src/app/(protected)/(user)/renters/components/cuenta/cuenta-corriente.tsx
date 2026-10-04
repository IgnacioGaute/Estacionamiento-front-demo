'use client';
import { DataLoading } from '@/components/ui/data-loading';

// La cuenta de un inquilino, en tres vistas:
//   · Resumen: el estado de cuenta (cargos, pagos y ajustes con su saldo acumulado).
//   · Cargos: lo que se le fue agregando a la cuenta (abonos, recargos, saldo inicial), cuánto
//     se pagó de cada uno, cuánto se descontó y cuánto queda, con su vencimiento.
//   · Pagos: la plata recibida, con su recibo para entregar (QR, WhatsApp o impresión).
// Nada se edita ni se borra: lo que se corrige se ajusta y queda a la vista. Lo anulado (un error
// de carga) se oculta, porque suma cero y confunde; el administrador lo puede ver, y el control
// está en el listado de anulaciones de la playa. Ajustes, saldo inicial, devoluciones y
// anulaciones quedan dentro de las acciones de administración.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Archive,
  ArrowLeft,
  CircleDollarSign,
  Eye,
  EyeOff,
  HandCoins,

  MoreHorizontal,
  Phone,
  Printer,
  Scale,
  Wallet,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getEstadoCuentaAction } from '@/actions/cuentas/cuentas.action';
import { useTenant } from '@/components/tenant-provider';
import { Customer } from '@/types/cutomer.type';
import { CargoCuenta, EstadoCuenta, MovimientoCuenta, ResultadoPago, Tramo, nombreMetodo } from '@/types/cuenta.type';
import { EJE, Pastilla, Rotulo, Segmentos, Tarjeta } from '@/components/plataforma/mono';
import { colorAvatar, iniciales, plata } from '@/components/plataforma/formato';
import { UpdateRenterDialog } from '../update-renter-dialog';
import { SoftDeleteRenterDialog } from '../soft-delete-renter-dialog';
import { RestoredRenterDialog } from '../restored-renter-dialog';
import { CobrarDialog } from './cobrar-dialog';
import { SaldoInicialDialog } from './saldo-inicial';
import { AAnular, AjusteDialog, AnularDialog, DevolucionDialog, MenuAnular } from './acciones';
import { EntregaRecibo } from './entrega-recibo';
import {
  TRAMOS,
  abrirImpresion,
  colorSaldo,
  diaDeInstanteAR,
  escapar,
  fechaAR,
  textoSaldo,
} from './util';

type Tab = 'resumen' | 'cargos' | 'pagos';

const TIPOS: Record<MovimientoCuenta['tipo'], string> = {
  SALDO_INICIAL: 'Saldo inicial',
  CARGO: 'Cargo',
  PAGO: 'Pago',
  AJUSTE: 'Ajuste',
  ANULACION: 'Anulación',
  DEVOLUCION: 'Devolución',
};

const botonSec =
  'flex h-11 items-center gap-2 rounded-xl border border-border px-3.5 text-[13.5px] font-semibold transition-colors hover:border-gm-line-strong hover:bg-gm-surface-2';
// Igual que el botón chico de «Editar inquilino» y «Dar de baja», que viven en sus propios diálogos.
const itemMenu =
  'flex h-8 w-full items-center gap-2 rounded-sm px-3 text-[12px] font-semibold tracking-tight text-muted-foreground transition-colors hover:bg-gm-surface-2 hover:text-foreground [&_svg]:size-4 [&_svg]:shrink-0';

function EstadoCargo({ r }: { r: CargoCuenta }) {
  const [texto, clase] =
    r.situacion === 'SALDADO'
      ? ['Saldado', 'bg-emerald-400/[0.12] text-emerald-400']
      : r.vencido
        ? [r.situacion === 'PARCIAL' ? 'Vencido · pago parcial' : 'Vencido', 'bg-[#FF5C4D]/[0.16] text-[#FF7A4D]']
        : r.situacion === 'PARCIAL'
          ? ['Pago parcial', 'bg-gm-yellow/[0.14] text-gm-yellow']
          : ['Pendiente', 'bg-[#221F1A] text-[#E9E1D4]'];
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${clase}`}>{texto}</span>;
}

export function CuentaCorriente({
  customerId,
  customer,
}: {
  customerId: string;
  customer: Customer | null;
}) {
  const { data: session } = useSession();
  const esAdmin = session?.user?.role === 'ADMIN';
  const { context, playaId } = useTenant();
  const [estado, setEstado] = useState<EstadoCuenta | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState<Tab>('resumen');
  const [cobrar, setCobrar] = useState<{ preseleccion?: string } | null>(null);
  const [saldoInicial, setSaldoInicial] = useState(false);
  const [ajuste, setAjuste] = useState(false);
  const [devolucion, setDevolucion] = useState(false);
  const [anular, setAnular] = useState<AAnular | null>(null);
  const [verAnulados, setVerAnulados] = useState(false);
  const [recibo, setRecibo] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const r = await getEstadoCuentaAction(customerId);
    setCargando(false);
    if (r.data) {
      setEstado(r.data);
      setError('');
    } else setError(r.error ?? 'No se pudo cargar la cuenta.');
  }, [customerId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const conceptoDeCargo = useMemo(() => new Map((estado?.recibos ?? []).map((r) => [r.id, r.concepto])), [estado]);

  if (error)
    return (
      <div role="alert" className="rounded-2xl border border-destructive/60 p-6">
        <p>{error}</p>
        <Link href="/renters" className="mt-3 inline-block text-sm underline">
          Volver a inquilinos
        </Link>
      </div>
    );
  if (!estado)
    return (
      <DataLoading label="Cargando la cuenta…" />
    );

  const c = estado.cliente;
  const nombre = `${c.nombre ?? ''} ${c.apellido ?? ''}`.trim() || 'Sin nombre';
  const nombreFormal = `${c.apellido ?? ''} ${c.nombre ?? ''}`.trim() || 'Sin nombre';
  const pendientes = estado.recibos.filter((r) => r.estado === 'PENDING' && r.saldo > 0);
  const playa = context.playas.find((p) => p.id === playaId)?.nombre;

  // Sin los anulados ni sus anulaciones (salvo que el administrador pida verlos): suman cero.
  const limpio = (m: MovimientoCuenta) => !m.anulado && m.tipo !== 'ANULACION';
  const mostrarAnulados = esAdmin && verAnulados;
  const movimientos = mostrarAnulados ? estado.movimientos : estado.movimientos.filter(limpio);
  const pagos = mostrarAnulados ? estado.comprobantes : estado.comprobantes.filter((p) => !p.anulado);
  // Cuántas anulaciones hubo, no cuántas filas: un pago con dos medios se anula una sola vez.
  const ocultos = new Set(estado.movimientos.filter((m) => m.tipo === 'ANULACION').map((m) => m.numero ?? m.id)).size;

  // El estado de cuenta que se le entrega al inquilino: cargos, pagos y ajustes, nunca anulados.
  function imprimirEstado() {
    const filas = estado!.movimientos
      .filter(limpio)
      .reverse()
      .map(
        (m) =>
          `<tr><td>${fechaAR(m.fecha)}</td><td>${escapar(m.concepto)}${m.motivo ? `<br><small>${escapar(m.motivo)}</small>` : ''}</td><td class="n">${m.debe ? plata(m.debe) : ''}</td><td class="n">${m.haber ? plata(m.haber) : ''}</td><td class="n">${plata(m.saldoSinAnulados)}</td></tr>`,
      )
      .join('');
    const hoy = new Date().toLocaleDateString('es-AR');
    const ok = abrirImpresion(`Estado de cuenta · ${nombre}`, `
      <header><div class="marca">${escapar(playa ?? 'Estacionamiento')}</div><h1>Estado de cuenta</h1>
      <div class="meta">${escapar(nombreFormal)} · al ${hoy}</div></header>
      <table><thead><tr><th>Fecha</th><th>Concepto</th><th class="n">Cargos</th><th class="n">Pagos y ajustes</th><th class="n">Saldo</th></tr></thead><tbody>${filas}</tbody></table>
      <div class="saldo"><span>Saldo al ${hoy}</span><strong>${textoSaldo(estado!.saldo)}</strong></div>
      ${estado!.vencido ? `<p>De ese saldo, ${plata(estado!.vencido)} está vencido.</p>` : ''}
      <p class="leyenda">Documento no válido como factura.</p>`);
    if (!ok) toast.error('El navegador bloqueó la ventana de impresión.');
  }

  // El pago como recibo, para imprimirlo en hoja sin pasar por el sitio de comprobantes.
  function comoRecibo(pagoId: string): ResultadoPago | null {
    const p = estado!.comprobantes.find((x) => x.id === pagoId);
    if (!p) return null;
    return {
      id: p.id,
      numero: p.numero ?? '—',
      fecha: p.fecha,
      cliente: nombreFormal,
      total: p.total,
      medios: p.medios.map((m) => ({ metodo: m.metodo ?? 'TRANSFER', importe: m.importe })),
      // Lo guardado al cobrar; el estado de hoy sólo para cobros migrados, que no lo tienen.
      imputaciones: p.imputaciones.map((i) => ({
        receiptId: i.receiptId,
        concepto: conceptoDeCargo.get(i.receiptId) ?? 'Cargo',
        aplicado: i.aplicado,
        saldoRecibo: i.resta ?? estado!.recibos.find((r) => r.id === i.receiptId)?.saldo ?? 0,
      })),
      aFavor: Math.max(0, p.total - p.imputaciones.reduce((s, i) => s + i.aplicado, 0)),
      saldoAnterior: 0,
      saldo: p.saldoDespues ?? estado!.saldo,
      nota: p.nota,
    };
  }
  const reciboAbierto = recibo ? comoRecibo(recibo) : null;

  return (
    <div className="space-y-5">
      <Link href="/renters" className={`${botonSec} h-9 w-fit rounded-[10px] px-3 text-[13px]`}>
        <ArrowLeft className="size-[15px]" /> Inquilinos
      </Link>

      {c.baja && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#FF7A4D]/40 bg-[#FF7A4D]/[0.06] px-4 py-3 text-sm">
          <Archive className="size-4 text-[#FF7A4D]" />
          <span>
            Dado de baja el <strong>{diaDeInstanteAR(c.baja)}</strong>: no se le cargan más abonos.
            {estado.saldo > 0 ? ' Todavía tiene saldo pendiente y se le puede cobrar.' : ''}
            {estado.saldo < 0 ? ' Tiene saldo a favor: se le puede devolver.' : ''}
          </span>
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-border bg-gm-surface">
        <div aria-hidden className="gm-stripes h-1.5" />
        <div className="flex flex-col gap-5 p-5 sm:px-6 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <span
              aria-hidden
              className="flex size-16 shrink-0 items-center justify-center rounded-[18px] border border-gm-line-strong font-display text-2xl font-semibold text-gm-yellow"
              style={{ background: colorAvatar(c.id) }}
            >
              {iniciales(nombreFormal)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="min-w-0 font-display text-[30px] font-semibold leading-none [overflow-wrap:anywhere] sm:text-[34px]">
                  {nombreFormal}
                </h1>
                {c.baja && (
                  <span className="rounded-full bg-[#FF7A4D]/[0.14] px-2.5 py-1 text-xs font-bold text-[#FF7A4D]">De baja</span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
                {c.telefono && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="size-3.5" /> {c.telefono}
                  </span>
                )}
                {!c.baja && <span>Abono mensual {plata(c.abono)}</span>}
                <span>Alta {diaDeInstanteAR(c.alta)}</span>
              </div>
              {c.cocheras.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.cocheras.map((x, i) => (
                    <span key={i} className="rounded-full border border-border px-2.5 py-0.5 text-[11.5px] text-[#C9BFB1]">
                      {x.numero ? `Cochera ${x.numero}` : 'Cochera'}
                      {x.duenio ? ` · ${x.duenio}` : ''} · {plata(x.importe)}
                      {c.baja ? ' (liberada)' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="lg:text-right">
              <Rotulo>{estado.saldo < 0 ? 'Saldo a favor' : 'Saldo pendiente'}</Rotulo>
              <div className={`font-display text-[36px] font-semibold leading-tight tabular-nums ${colorSaldo(estado.saldo)}`}>
                {estado.saldo === 0 ? 'Al día' : plata(Math.abs(estado.saldo))}
              </div>
              {estado.vencido > 0 && <div className="text-sm font-semibold text-[#FF7A4D]">{plata(estado.vencido)} vencido</div>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCobrar({})}
                className="flex h-11 items-center gap-2 rounded-xl bg-gm-yellow px-5 text-[13.5px] font-bold text-gm-ink hover:bg-[#FFD23A]"
              >
                <Wallet className="size-4" /> Cobrar
              </button>
              <button type="button" onClick={imprimirEstado} className={botonSec} aria-label="Imprimir estado de cuenta">
                <Printer className="size-4" />
                <span className="hidden sm:inline">Estado de cuenta</span>
              </button>
              {esAdmin && customer && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" aria-label="Acciones de administración" className={`${botonSec} w-11 justify-center px-0`}>
                      <MoreHorizontal className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60 border border-border bg-gm-surface p-1">
                    <button type="button" onClick={() => setAjuste(true)} className={itemMenu}>
                      <Scale className="size-4" /> Cargar un ajuste
                    </button>
                    {estado.saldo < 0 && (
                      <button type="button" onClick={() => setDevolucion(true)} className={itemMenu}>
                        <HandCoins className="size-4" /> Devolver saldo a favor
                      </button>
                    )}
                    {estado.tieneSaldoInicial ? (
                      // Se carga una sola vez: cambiarlo sin rastro borraría cómo arrancó la cuenta.
                      <div className="px-3 py-1.5">
                        <div className="flex items-center gap-2 text-[12px] font-semibold text-muted-foreground opacity-60">
                          <CircleDollarSign className="size-4" /> Saldo inicial ya cargado
                        </div>
                        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                          Para cambiarlo, anulalo (desde su fila en Resumen o sus cargos, en el mismo mes en que se cargó) y
                          cargalo de nuevo. Después de ese mes, corregilo con un ajuste.
                        </p>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setSaldoInicial(true)} className={itemMenu}>
                        <CircleDollarSign className="size-4" /> Cargar saldo inicial
                      </button>
                    )}
                    {!c.baja && (
                      <UpdateRenterDialog
                        customer={customer}
                        nuevoImporteDesde={estado.proximoAbono}
                        onGuardado={() => void cargar()}
                      />
                    )}
                    {c.baja ? (
                      <RestoredRenterDialog customer={customer} onHecho={() => void cargar()} />
                    ) : (
                      <SoftDeleteRenterDialog customer={customer} onHecho={() => void cargar()} />
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {(Object.keys(TRAMOS) as Tramo[]).map((t) => (
          <Tarjeta key={t} className="gap-1 py-3.5">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span aria-hidden className="size-2 rounded-full" style={{ background: TRAMOS[t].color }} />
              {TRAMOS[t].label}
            </span>
            <span className={`font-display text-2xl font-semibold tabular-nums ${estado.antiguedad[t] ? '' : 'text-muted-foreground'}`}>
              {plata(estado.antiguedad[t])}
            </span>
          </Tarjeta>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmentos
          etiqueta="Vista"
          opciones={[
            { id: 'resumen' as Tab, label: 'Resumen', cuenta: movimientos.length },
            { id: 'cargos' as Tab, label: 'Cargos', cuenta: estado.recibos.length },
            { id: 'pagos' as Tab, label: 'Pagos', cuenta: pagos.length },
          ]}
          valor={tab}
          onChange={setTab}
        />
        <div className="flex items-center gap-3">
          {cargando && <DataLoading label="Actualizando cuenta…" className="w-auto" />}
          {esAdmin && ocultos > 0 && tab !== 'cargos' && (
            <button
              type="button"
              onClick={() => setVerAnulados((v) => !v)}
              aria-pressed={verAnulados}
              className="flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-[12.5px] font-semibold text-muted-foreground hover:bg-gm-surface-2 hover:text-foreground"
            >
              {verAnulados ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              {verAnulados ? 'Ocultar anulados' : `Ver anulados (${ocultos})`}
            </button>
          )}
        </div>
      </div>

      {tab === 'resumen' && (
        <section className="overflow-hidden rounded-[22px] border border-border bg-gm-surface">
          {/* En el teléfono, lista: la tabla de seis columnas obligaba a desplazarse de costado. */}
          <ul aria-label="Estado de cuenta" className="divide-y divide-[#2B2620] md:hidden">
            {!movimientos.length && (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">Todavía no hay movimientos.</li>
            )}
            {movimientos.map((m) => {
              const saldo = mostrarAnulados ? m.saldo : m.saldoSinAnulados;
              return (
                <li key={m.id} className={`flex items-start gap-3 px-4 py-3 ${m.anulado ? 'opacity-55' : ''}`}>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[13.5px] font-semibold leading-snug [overflow-wrap:anywhere] ${m.anulado ? 'line-through' : ''}`}>
                      {m.concepto}
                    </span>
                    <span className="mt-0.5 block text-xs" style={{ color: EJE }}>
                      {[fechaAR(m.fecha), TIPOS[m.tipo], m.metodo ? nombreMetodo(m.metodo) : null, m.anulado ? 'ANULADO' : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className={`block text-sm font-semibold tabular-nums ${m.haber ? 'text-emerald-400' : ''}`}>
                      {m.debe ? `+ ${plata(m.debe)}` : `− ${plata(m.haber)}`}
                    </span>
                    <span className={`block text-[11px] tabular-nums ${colorSaldo(saldo)}`}>saldo {plata(Math.abs(saldo))}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <div role="table" aria-label="Estado de cuenta" className="min-w-[860px]">
              <div
                role="row"
                className="grid h-11 grid-cols-[100px_minmax(0,1fr)_120px_130px_130px_60px] items-center bg-[#15120E] px-5 font-mono text-[10.5px] tracking-[0.1em]"
                style={{ color: EJE }}
              >
                <span role="columnheader">FECHA</span>
                <span role="columnheader">CONCEPTO</span>
                <span role="columnheader" className="text-right">CARGOS</span>
                <span role="columnheader" className="text-right">PAGOS Y AJUSTES</span>
                <span role="columnheader" className="text-right">SALDO</span>
                <span role="columnheader" className="sr-only">Acciones</span>
              </div>
              {!movimientos.length && (
                <p className="border-t border-[#2B2620] px-5 py-10 text-center text-sm text-muted-foreground">
                  Todavía no hay movimientos. El primero aparece al cargar su abono o su saldo inicial.
                </p>
              )}
              {movimientos.map((m) => {
                const saldo = mostrarAnulados ? m.saldo : m.saldoSinAnulados;
                return (
                  <div
                    key={m.id}
                    role="row"
                    className={`grid min-h-[58px] grid-cols-[100px_minmax(0,1fr)_120px_130px_130px_60px] items-center border-t border-[#2B2620] px-5 py-2 text-[13.5px] ${
                      m.anulado ? 'opacity-55' : ''
                    }`}
                  >
                    <span role="cell" className="font-mono text-[12px] text-[#C9BFB1]">{fechaAR(m.fecha)}</span>
                    <span role="cell" className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={`font-semibold ${m.anulado ? 'line-through' : ''}`}>{m.concepto}</span>
                        <Pastilla tono={m.tipo === 'PAGO' ? 'verde' : m.tipo === 'ANULACION' || m.tipo === 'DEVOLUCION' ? 'naranja' : 'amarillo'}>
                          {TIPOS[m.tipo]}
                        </Pastilla>
                        {m.anulado && <span className="text-[11px] font-bold text-[#FF7A4D]">ANULADO</span>}
                      </span>
                      <span className="mt-0.5 block truncate text-xs" style={{ color: EJE }}>
                        {[m.metodo ? nombreMetodo(m.metodo) : null, m.motivo, m.usuario ? `por ${m.usuario}` : null, m.migrado ? 'traído del sistema anterior' : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    <span role="cell" className="text-right tabular-nums">{m.debe ? plata(m.debe) : ''}</span>
                    <span role="cell" className="text-right tabular-nums text-emerald-400">{m.haber ? plata(m.haber) : ''}</span>
                    <span role="cell" className={`text-right font-semibold tabular-nums ${colorSaldo(saldo)}`}>
                      {plata(Math.abs(saldo))}
                      <span className="ml-1 text-[10px] font-normal" style={{ color: EJE }}>
                        {saldo > 0 ? 'P' : saldo < 0 ? 'F' : ''}
                      </span>
                    </span>
                    <span role="cell" className="flex justify-end">
                      {/* Cargos y pagos se anulan desde su pestaña; acá, lo que no tiene ninguna de
                          las dos: ajustes, saldo a favor inicial y devoluciones. */}
                      {esAdmin && !m.anulado && (m.tipo === 'AJUSTE' || m.tipo === 'DEVOLUCION' || (m.tipo === 'SALDO_INICIAL' && m.haber > 0)) && (
                        <MenuAnular
                          etiqueta={m.tipo === 'DEVOLUCION' ? 'Anular esta devolución' : 'Anular este ajuste'}
                          anulable={m.anulable}
                          onAnular={() =>
                            setAnular({
                              id: m.id,
                              titulo: `Anular: ${m.concepto}`,
                              detalle:
                                m.tipo === 'DEVOLUCION'
                                  ? 'Es para una devolución registrada por error: si fue en efectivo, vuelve a entrar a la caja del turno abierto.'
                                  : m.haber
                                    ? 'Es para un ajuste cargado por error: los cargos vuelven a quedar como estaban antes.'
                                    : 'Es para un ajuste cargado por error: la cuenta vuelve a quedar como estaba antes.',
                              importe: m.debe || m.haber,
                              efecto: m.debe ? -m.debe : m.haber,
                              saldoActual: estado.saldo,
                            })
                          }
                        />
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-[#2B2620] bg-[#15120E] px-5 py-2.5 text-[12px] text-muted-foreground">
            <span className="hidden md:inline">P = pendiente · F = a favor</span>
            <span>
              Saldo: <strong className="text-foreground">{textoSaldo(estado.saldo)}</strong>
            </span>
          </div>
        </section>
      )}

      {tab === 'cargos' && (
        <section className="grid gap-3 md:grid-cols-2">
          {!estado.recibos.length && (
            <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground md:col-span-2">
              Todavía no tiene cargos.
            </p>
          )}
          {estado.recibos.map((r) => {
            const aplicado = r.pagado + r.bonificado + r.aFavorAplicado;
            const pct = r.total ? Math.round((aplicado / r.total) * 100) : 0;
            return (
              <Tarjeta key={r.id} className="gap-3 py-4" as="div">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{r.concepto}</div>
                    <div className="mt-0.5 text-[11.5px]" style={{ color: EJE }}>
                      <span className="font-mono">{r.numero ?? 'Sin número'}</span>
                      {' · '}
                      {r.situacion === 'SALDADO' ? (
                        `vencía el ${fechaAR(r.vencimiento)}`
                      ) : r.vencido ? (
                        <strong className="text-[#FF7A4D]">venció el {fechaAR(r.vencimiento)}</strong>
                      ) : (
                        `vence el ${fechaAR(r.vencimiento)}`
                      )}
                    </div>
                  </div>
                  <EstadoCargo r={r} />
                </div>
                {!aplicado ? (
                  // Sin nada aplicado, importe y pendiente son lo mismo: una sola línea.
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground">Pendiente</span>
                    <span className={`font-display text-xl font-semibold tabular-nums ${r.vencido ? 'text-[#FF7A4D]' : ''}`}>{plata(r.saldo)}</span>
                  </div>
                ) : (
                <div>
                  <div className="h-2 rounded-full bg-[#221F1A]">
                    <div
                      className={`h-2 rounded-full ${r.situacion === 'SALDADO' ? 'bg-emerald-400' : 'bg-gm-yellow'}`}
                      style={{ width: `${Math.max(3, pct)}%` }}
                    />
                  </div>
                  {/* Lo pagado es plata recibida; un descuento o un saldo a favor usado van aparte. */}
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                    <dt className="text-muted-foreground">Importe del cargo</dt>
                    <dd className="text-right tabular-nums">{plata(r.total)}</dd>
                    {r.pagado > 0 && (
                      <>
                        <dt className="text-muted-foreground">Pagado</dt>
                        <dd className="text-right tabular-nums">{plata(r.pagado)}</dd>
                      </>
                    )}
                    {r.bonificado > 0 && (
                      <>
                        <dt className="text-muted-foreground">Descuento</dt>
                        <dd className="text-right tabular-nums">{plata(r.bonificado)}</dd>
                      </>
                    )}
                    {r.aFavorAplicado > 0 && (
                      <>
                        <dt className="text-muted-foreground">Saldo a favor aplicado</dt>
                        <dd className="text-right tabular-nums">{plata(r.aFavorAplicado)}</dd>
                      </>
                    )}
                    <dt className="font-semibold">Pendiente</dt>
                    <dd className={`text-right font-semibold tabular-nums ${r.saldo ? 'text-[#FF7A4D]' : 'text-emerald-400'}`}>
                      {plata(r.saldo)}
                    </dd>
                  </dl>
                </div>
                )}
                {r.pagos.length > 0 && (
                  <ul className="space-y-1 border-t border-[#2B2620] pt-2 text-xs">
                    {r.pagos.map((p, i) => (
                      <li key={i} className="flex justify-between gap-2 text-[#C9BFB1]">
                        <span>
                          {fechaAR(p.fecha)} · {nombreMetodo(p.tipo)}
                        </span>
                        <span className="tabular-nums">{plata(p.importe)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {(r.saldo > 0 || (esAdmin && r.origen)) && (
                  <div className="flex justify-end gap-2">
                    {r.saldo > 0 && (
                      <button
                        type="button"
                        onClick={() => setCobrar({ preseleccion: r.id })}
                        className="h-9 rounded-[10px] bg-gm-yellow px-3.5 text-[13px] font-bold text-gm-ink hover:bg-[#FFD23A]"
                      >
                        Cobrar este cargo
                      </button>
                    )}
                    {esAdmin && r.origen && (
                      <MenuAnular
                        etiqueta="Anular el cargo"
                        anulable={r.origen.anulable}
                        onAnular={() =>
                          setAnular({
                            id: r.origen!.id,
                            titulo: `Anular el cargo «${r.concepto}»`,
                            detalle:
                              'Es para un cargo cargado por error: se elimina y su importe sale de la cuenta. Si el cargo correspondía y se le perdona, usá una bonificación.',
                            importe: r.origen!.importe,
                            efecto: -r.origen!.importe,
                            saldoActual: estado.saldo,
                          })
                        }
                      />
                    )}
                  </div>
                )}
              </Tarjeta>
            );
          })}
        </section>
      )}

      {tab === 'pagos' && (
        <section className="overflow-hidden rounded-[22px] border border-border bg-gm-surface">
          {!pagos.length && <p className="px-5 py-10 text-center text-sm text-muted-foreground">Todavía no registró pagos.</p>}
          <ul>
            {pagos.map((p) => (
              <li
                key={p.id}
                className={`flex flex-wrap items-center gap-4 border-b border-[#2B2620] px-5 py-3.5 last:border-b-0 ${p.anulado ? 'opacity-55' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-semibold ${p.anulado ? 'line-through' : ''}`}>
                      {p.numero ? `Pago N° ${p.numero}` : 'Pago anterior al sistema'}
                    </span>
                    {p.anulado && <span className="text-[11px] font-bold text-[#FF7A4D]">ANULADO</span>}
                  </div>
                  <div className="mt-0.5 text-xs" style={{ color: EJE }}>
                    {fechaAR(p.fecha)} · {p.medios.map((m) => `${nombreMetodo(m.metodo)} ${plata(m.importe)}`).join(' + ')}
                    {p.usuario ? ` · por ${p.usuario}` : ''}
                    {p.nota ? ` · ${p.nota}` : ''}
                  </div>
                </div>
                <span className="font-display text-xl font-semibold tabular-nums text-emerald-400">{plata(p.total)}</span>
                <div className="flex gap-1.5">
                  {p.numero && !p.anulado && (
                    <button type="button" onClick={() => setRecibo(p.id)} className="h-9 rounded-[10px] border border-border px-3 text-[13px] font-semibold hover:bg-gm-surface-2">
                      <Printer className="mr-1 inline size-3.5" /> Recibo
                    </button>
                  )}
                  {esAdmin && !p.anulado && (
                    <MenuAnular
                      etiqueta="Anular el pago"
                      anulable={p.anulable}
                      onAnular={() =>
                        setAnular({
                          id: p.id,
                          titulo: `Anular el pago ${p.numero ? `N° ${p.numero}` : `del ${fechaAR(p.fecha)}`}`,
                          detalle:
                            'Es para un pago registrado por error: la deuda vuelve a los cargos que había cubierto y, si fue en efectivo, sale del turno abierto. Si la plata se le devuelve de verdad, registrá una devolución.',
                          importe: p.total,
                          efecto: p.total,
                          saldoActual: estado.saldo,
                        })
                      }
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {cobrar && (
        <CobrarDialog
          customerId={customerId}
          nombre={nombre}
          open={!!cobrar}
          preseleccion={cobrar.preseleccion}
          onOpenChange={(v) => !v && setCobrar(null)}
          onCobrado={() => void cargar()}
        />
      )}
      <SaldoInicialDialog
        customerId={customerId}
        nombre={nombre}
        abono={c.abono}
        open={saldoInicial}
        onOpenChange={setSaldoInicial}
        onGuardado={() => void cargar()}
      />
      <AjusteDialog
        customerId={customerId}
        nombre={nombre}
        pendientes={pendientes}
        open={ajuste}
        onOpenChange={setAjuste}
        onGuardado={() => void cargar()}
      />
      <DevolucionDialog
        customerId={customerId}
        nombre={nombre}
        aFavor={Math.max(0, -estado.saldo)}
        open={devolucion}
        onOpenChange={setDevolucion}
        onGuardado={() => void cargar()}
      />
      <AnularDialog movimiento={anular} onOpenChange={(v) => !v && setAnular(null)} onAnulado={() => void cargar()} />
      <Dialog open={!!reciboAbierto} onOpenChange={(v) => !v && setRecibo(null)}>
        <DialogContent className="w-full max-w-lg">
          <DialogHeader>
            <DialogTitle className="pr-8 font-display text-2xl">Recibo de pago N° {reciboAbierto?.numero}</DialogTitle>
            <DialogDescription>
              {reciboAbierto &&
                `${fechaAR(reciboAbierto.fecha)} · ${plata(reciboAbierto.total)} · ${reciboAbierto.medios.map((m) => nombreMetodo(m.metodo)).join(' + ')}`}
            </DialogDescription>
          </DialogHeader>
          {reciboAbierto && <EntregaRecibo pagoId={reciboAbierto.id} resultado={reciboAbierto} playa={playa} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
