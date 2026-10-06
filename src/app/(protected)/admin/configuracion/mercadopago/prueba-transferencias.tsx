"use client";

// La prueba de transferencias, en la configuración de MercadoPago de la empresa y sobre su propia
// cuenta. NO es la función comercial: sirve para averiguar con evidencia si las transferencias que
// recibe la cuenta se ven desde el sistema, con qué datos y con qué demora. Se muestra solo con las
// condiciones aceptadas, y el backend además lo exige (y deja afuera al super admin). Solo devuelve
// plata que entró. Ver docs/verificacion-transferencias.md en el backend.
//
// Cada ingreso se muestra como lo leería una persona (quién, cuánto, cuándo, por qué medio, con
// qué descripción); los códigos de MercadoPago quedan en el detalle, porque son lo que la prueba
// necesita comparar. El reporte «Todas las transacciones» va aparte y plegado: es asíncrono y
// sirve para conciliar después, no para el mostrador.

import { useState } from "react";
import {
  ArrowDownLeft,
  ChevronDown,
  CircleHelp,
  FileSearch,
  FileText,
  Inbox,
  Landmark,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Segmentos } from "@/components/plataforma/mono";
import {
  pruebaConfigurarReporteAction,
  pruebaDetallePagoAction,
  pruebaLeerReporteAction,
  pruebaPagosAction,
  pruebaPedirReporteAction,
  pruebaReporteEstadoAction,
} from "@/actions/mercadopago/prueba-transferencias.action";
import type {
  ConsultaFallida,
  PagoDePrueba,
  PruebaDetallePago,
  PruebaPagos,
  PruebaReporteEstado,
  PruebaReporteLectura,
  VentanaPrueba,
} from "@/types/prueba-transferencias.type";

const VENTANAS: { id: VentanaPrueba; label: string }[] = [
  { id: 5, label: "5 min" },
  { id: 30, label: "30 min" },
  { id: 120, label: "2 h" },
  { id: 1440, label: "24 h" },
];

const ZONA = "America/Argentina/Buenos_Aires";

// Con segundos: la prueba mide demoras.
const hora = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleTimeString("es-AR", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

const fechaHora = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("es-AR", {
        timeZone: ZONA,
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

function haceCuanto(iso: string | null, ahora: string) {
  if (!iso) return null;
  const s = Math.max(0, Math.round((new Date(ahora).getTime() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `hace ${s} s`;
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return `hace ${Math.round(s / 86400)} d`;
}

const plata = (n: number | null, moneda?: string | null) =>
  n === null ? "—" : `$${n.toLocaleString("es-AR")}${moneda && moneda !== "ARS" ? ` ${moneda}` : ""}`;

// Lo que MercadoPago dice con códigos, en palabras.
const ESTADOS: Record<string, { label: string; clase: string }> = {
  approved: { label: "Acreditado", clase: "bg-emerald-400/[0.12] text-emerald-400" },
  pending: { label: "Pendiente", clase: "bg-gm-yellow/[0.14] text-gm-yellow" },
  in_process: { label: "En proceso", clase: "bg-gm-yellow/[0.14] text-gm-yellow" },
  rejected: { label: "Rechazado", clase: "bg-[#E5484D]/[0.16] text-[#FF8A8D]" },
  cancelled: { label: "Cancelado", clase: "bg-[#221F1A] text-muted-foreground" },
  refunded: { label: "Devuelto", clase: "bg-[#221F1A] text-muted-foreground" },
  charged_back: { label: "Contracargo", clase: "bg-[#E5484D]/[0.16] text-[#FF8A8D]" },
};

const TIPOS: Record<string, string> = {
  bank_transfer: "Transferencia bancaria",
  account_money: "Dinero en cuenta de MercadoPago",
  credit_card: "Tarjeta de crédito",
  debit_card: "Tarjeta de débito",
  prepaid_card: "Tarjeta prepaga",
  ticket: "Efectivo en un local",
};

function comoEntro(p: PagoDePrueba) {
  if (p.origen?.tipo === "PSP_TRANSFER" || p.medio === "cvu") return "Transferencia a tu CVU o alias";
  if (p.operacion === "money_transfer") return "Transferencia desde otra cuenta de MercadoPago";
  if (p.referencia) return "Cobro generado por el sistema";
  return (p.tipo && TIPOS[p.tipo]) ?? "Pago recibido";
}

function Falla({ r }: { r: ConsultaFallida | { error: string } }) {
  return (
    <p role="alert" className="m-0 rounded-[12px] border border-[#FF7A4D]/30 bg-[#FF7A4D]/10 px-4 py-3 text-[13px] text-[#FFB59C]">
      {"estado" in r ? `MercadoPago contestó ${r.estado ?? "sin respuesta"}: ` : ""}
      {r.error}
    </p>
  );
}

function Dato({ etiqueta, valor, mono }: { etiqueta: string; valor: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{etiqueta}</dt>
      <dd className={cn("m-0 mt-0.5 break-words text-[13px]", mono && "font-mono text-[12.5px]")}>{valor ?? "—"}</dd>
    </div>
  );
}

function TarjetaIngreso({ p, ahora }: { p: PagoDePrueba; ahora: string }) {
  const [abierto, setAbierto] = useState(false);
  const estado = (p.estado ? ESTADOS[p.estado] : undefined) ?? {
    label: p.estado ?? "—",
    clase: "bg-[#221F1A] text-muted-foreground",
  };
  const dudoso = p.recibido === null;
  return (
    <li className="overflow-hidden rounded-[16px] border border-border bg-[#17140F]">
      <div className="flex gap-4 p-4 sm:p-5">
        <span
          aria-hidden
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            dudoso ? "bg-[#221F1A] text-muted-foreground" : "bg-emerald-400/[0.12] text-emerald-400",
          )}
        >
          {dudoso ? <CircleHelp className="size-5" /> : <ArrowDownLeft className="size-5" />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
            <div className="min-w-0">
              <p className="m-0 truncate text-[15px] font-semibold">
                {p.pagador.nombre ?? <span className="text-muted-foreground">Nombre no informado por MercadoPago</span>}
              </p>
              <p className="m-0 mt-0.5 text-[13px] text-muted-foreground">
                {comoEntro(p)}
                {p.pagador.entidad && ` · desde ${p.pagador.entidad}`}
              </p>
            </div>
            <div className="text-right">
              <p className="m-0 font-mono text-[20px] font-semibold leading-tight tracking-[-0.02em]">
                {plata(p.importe, p.moneda)}
              </p>
              <p className="m-0 mt-0.5 text-[12px] text-muted-foreground">
                {hora(p.creado)} · {haceCuanto(p.creado, ahora)}
              </p>
            </div>
          </div>

          {p.descripcion && (
            <p className="m-0 mt-3 rounded-[10px] bg-secondary/40 px-3 py-2 text-[13px] text-[#D9D0C2]">
              <span className="text-muted-foreground">Descripción: </span>
              {p.descripcion}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2.5 py-1 text-[11.5px] font-bold", estado.clase)}>{estado.label}</span>
            {dudoso && (
              <span className="rounded-full bg-[#221F1A] px-2.5 py-1 text-[11.5px] font-semibold text-muted-foreground">
                MercadoPago no dice si entró o salió
              </span>
            )}
            <span className="font-mono text-[11.5px] text-muted-foreground">Operación {p.id}</span>
            <button
              type="button"
              onClick={() => setAbierto((v) => !v)}
              aria-expanded={abierto}
              className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              {abierto ? "Ocultar detalle" : "Ver detalle"}
              <ChevronDown className={cn("size-3.5 transition-transform", abierto && "rotate-180")} />
            </button>
          </div>
        </div>
      </div>

      {abierto && (
        <dl className="m-0 grid gap-x-6 gap-y-3 border-t border-border bg-[#15120E] px-5 py-4 [grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr))]">
          <Dato etiqueta="Creado" valor={fechaHora(p.creado)} />
          <Dato etiqueta="Acreditado" valor={fechaHora(p.aprobado)} />
          <Dato etiqueta="Neto recibido" valor={plata(p.neto, p.moneda)} />
          <Dato etiqueta="Documento" valor={p.pagador.documento} />
          <Dato etiqueta="Nº de transferencia" valor={p.idTransferencia} mono />
          <Dato etiqueta="Referencia del sistema" valor={p.referencia} mono />
          <Dato
            etiqueta="Códigos de MercadoPago"
            valor={[p.operacion, p.tipo, p.medio, p.origen?.tipo, p.detalle].filter(Boolean).join(" · ")}
            mono
          />
          {p.origen?.banco && (
            <Dato
              etiqueta="Datos bancarios del origen"
              valor={Object.entries(p.origen.banco.pagador)
                .map(([k, v]) => `${k}: ${v}`)
                .join(" · ") || "—"}
              mono
            />
          )}
          <div className="[grid-column:1/-1]">
            <BuscarNombre operacionId={String(p.id)} />
          </div>
        </dl>
      )}
    </li>
  );
}

// Trae el pago completo de MercadoPago y muestra en qué campos viene quién pagó: es para saber de
// dónde leer el nombre en la verificación. Solo campos de nombre, documento y banco de origen.
function BuscarNombre({ operacionId }: { operacionId: string }) {
  const [cargando, setCargando] = useState(false);
  const [detalle, setDetalle] = useState<PruebaDetallePago | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buscar() {
    setCargando(true);
    setError(null);
    const r = await pruebaDetallePagoAction(operacionId);
    setCargando(false);
    if (r.error) setError(r.error);
    else setDetalle(r.datos ?? null);
  }

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => void buscar()}
        disabled={cargando}
        className="inline-flex h-8 items-center gap-2 rounded-[9px] border border-border px-3 text-[12.5px] font-semibold transition-colors hover:border-gm-line-strong hover:bg-gm-surface-2 disabled:opacity-60"
      >
        {cargando ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
        Buscar el nombre en el detalle del pago
      </button>
      {error && <Falla r={{ error }} />}
      {detalle &&
        (!detalle.respuesta.ok ? (
          <Falla r={detalle.respuesta} />
        ) : (
          <div className="space-y-2 text-[12.5px]">
            <p className="m-0">
              <span className="text-muted-foreground">Nombre: </span>
              <strong>{detalle.respuesta.pagador.nombre ?? "MercadoPago no lo manda en el detalle"}</strong>
              {detalle.respuesta.pagador.documento && ` · ${detalle.respuesta.pagador.documento}`}
              {detalle.respuesta.pagador.entidad && ` · ${detalle.respuesta.pagador.entidad}`}
            </p>
            {detalle.respuesta.campos.length > 0 ? (
              <ul className="m-0 list-none space-y-1 rounded-[10px] bg-secondary/30 p-3 font-mono text-[11.5px]">
                {detalle.respuesta.campos.map((c) => (
                  <li key={c.ruta} className="break-all">
                    <span className="text-muted-foreground">{c.ruta}</span>: {c.valor}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-muted-foreground">Ningún campo del pago habla de quien pagó.</p>
            )}
            <p className="m-0 break-all text-[11px] text-muted-foreground">
              Campos que manda MercadoPago: {detalle.respuesta.claves.join(", ")}
            </p>
          </div>
        ))}
    </div>
  );
}

function Reporte() {
  const [abierto, setAbierto] = useState(false);
  const [minutos, setMinutos] = useState<VentanaPrueba>(120);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<PruebaReporteEstado | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [lectura, setLectura] = useState<PruebaReporteLectura | null>(null);

  async function correr<T>(que: string, accion: () => Promise<{ datos?: T; error?: string }>, listo: (d: T) => void) {
    setOcupado(que);
    setError(null);
    const r = await accion();
    setOcupado(null);
    if (r.error) setError(r.error);
    else if (r.datos) listo(r.datos);
  }
  const verEstado = () => correr("estado", () => pruebaReporteEstadoAction(), setEstado);
  const sinConfig = estado && !estado.config.ok && estado.config.estado === 404;
  const boton =
    "inline-flex h-9 items-center gap-2 rounded-[10px] border border-border px-3.5 text-[13px] font-semibold transition-colors hover:border-gm-line-strong hover:bg-gm-surface-2 disabled:opacity-60";

  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.02] sm:px-6"
      >
        <FileText className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold">Reporte «Todas las transacciones»</span>
          <span className="block text-[12.5px] text-muted-foreground">
            Lo genera MercadoPago y tarda: sirve para conciliar después, no para el mostrador.
          </span>
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", abierto && "rotate-180")} />
      </button>

      {abierto && (
        <div className="space-y-4 px-5 pb-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <Segmentos etiqueta="Período del reporte" claro opciones={VENTANAS} valor={minutos} onChange={setMinutos} />
            <button type="button" className={boton} disabled={!!ocupado} onClick={() => void verEstado()}>
              {ocupado === "estado" ? <Loader2 className="size-4 animate-spin" /> : <FileSearch className="size-4" />}
              Ver estado
            </button>
            <button
              type="button"
              className={boton}
              disabled={!!ocupado}
              onClick={() =>
                void correr("pedir", () => pruebaPedirReporteAction(minutos), (d) =>
                  setAviso(
                    d.respuesta.ok
                      ? `Pedido a las ${hora(d.pedidoEl)}. Tocá «Ver estado» en unos minutos para ver si ya está.`
                      : `MercadoPago contestó ${d.respuesta.estado ?? "sin respuesta"}: ${d.respuesta.error}`,
                  ),
                )
              }
            >
              {ocupado === "pedir" ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
              Pedir reporte
            </button>
            {sinConfig && (
              <button
                type="button"
                className={boton}
                disabled={!!ocupado}
                onClick={() =>
                  void correr("config", () => pruebaConfigurarReporteAction(), (d) => {
                    setAviso(d.creada ? "Configuración creada." : `No se pudo crear: ${d.respuesta.ok ? d.respuesta.estado : d.respuesta.error}`);
                    void verEstado();
                  })
                }
              >
                Crear configuración
              </button>
            )}
          </div>

          {error && <Falla r={{ error }} />}
          {aviso && <p className="m-0 text-[13px] text-muted-foreground">{aviso}</p>}

          {estado && (
            <div className="space-y-2">
              {estado.config.ok ? (
                <p className="m-0 text-[12.5px] text-muted-foreground">
                  Configuración con {estado.config.columnas.length} columnas
                  {estado.config.faltan.length > 0 && ` · faltan ${estado.config.faltan.join(", ")}`}
                </p>
              ) : (
                <Falla r={estado.config} />
              )}
              {!estado.reportes.ok ? (
                <Falla r={estado.reportes} />
              ) : estado.reportes.items.length === 0 ? (
                <p className="m-0 text-[13px] text-muted-foreground">Todavía no hay reportes generados.</p>
              ) : (
                <ul className="m-0 list-none divide-y divide-border overflow-hidden rounded-[12px] border border-border p-0">
                  {estado.reportes.items.map((r, i) => {
                    const nombre = typeof r.file_name === "string" ? r.file_name : null;
                    return (
                      <li key={nombre ?? `sin-archivo-${i}`} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-[12.5px]">
                        <span className="min-w-0 flex-1 truncate font-mono">{nombre ?? "sin archivo"}</span>
                        <span className="text-muted-foreground">
                          creado {fechaHora(typeof r.date_created === "string" ? r.date_created : null)}
                        </span>
                        {nombre && (
                          <button
                            type="button"
                            className={boton}
                            disabled={!!ocupado}
                            onClick={() => void correr("leer", () => pruebaLeerReporteAction(nombre), setLectura)}
                          >
                            Leer
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {lectura?.respuesta.ok && (
            <div role="status" className="space-y-1 rounded-[12px] border border-border p-3 text-[13px]">
              <p className="m-0 font-semibold">Prueba del nombre del pagador (PAYER_NAME)</p>
              <p className="m-0 text-muted-foreground">
                {lectura.respuesta.columnas.includes("PAYER_NAME")
                  ? 'La columna está presente en el CSV. Ingresos mostrados con nombre: ' + lectura.respuesta.ingresos.filter((f) => Boolean(f.PAYER_NAME?.trim())).length + ' de ' + lectura.respuesta.ingresos.length + '.'
                  : "El CSV no contiene la columna PAYER_NAME. Revisá las columnas de la configuración y generá un reporte nuevo."}
              </p>
              <p className="m-0 break-words text-xs text-muted-foreground">
                Columnas recibidas: {lectura.respuesta.columnas.join(", ")}
              </p>
            </div>
          )}

          {lectura &&
            (!lectura.respuesta.ok ? (
              <Falla r={lectura.respuesta} />
            ) : !lectura.respuesta.reconocible ? (
              <p className="m-0 text-[13px] text-[#FFB59C]">
                El reporte no trae TRANSACTION_TYPE y TRANSACTION_AMOUNT con esos nombres. Columnas:{" "}
                {lectura.respuesta.columnas.join(", ")}
              </p>
            ) : lectura.respuesta.ingresos.length === 0 ? (
              <p className="m-0 text-[13px] text-muted-foreground">
                {lectura.respuesta.totalFilas} fila(s), ninguna es un ingreso acreditado.
              </p>
            ) : (
              <ul className="m-0 list-none space-y-2 p-0">
                {lectura.respuesta.ingresos.map((f, i) => (
                  <li key={f.SOURCE_ID ?? i} className="rounded-[12px] border border-border bg-[#17140F] px-4 py-3 text-[13px]">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-semibold">{f.PAYER_NAME || (Object.prototype.hasOwnProperty.call(f, "PAYER_NAME") ? "Nombre vacío en el reporte de MercadoPago" : "Columna de nombre ausente en el reporte")}</span>
                      <span className="font-mono font-semibold">${f.TRANSACTION_AMOUNT}</span>
                    </div>
                    <p className="m-0 mt-1 text-[12px] text-muted-foreground">
                      {[f.TRANSACTION_DATE, f.PAYMENT_METHOD_TYPE, f.PAYMENT_METHOD, f.POI_BANK_NAME || f.POI_WALLET_NAME, f.DESCRIPTION]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="m-0 mt-1 font-mono text-[11.5px] text-muted-foreground">
                      Operación {f.SOURCE_ID}
                      {f.PAY_BANK_TRANSFER_ID && ` · Nº de transferencia ${f.PAY_BANK_TRANSFER_ID}`}
                      {f.PAYER_ID_NUMBER && ` · ${f.PAYER_ID_TYPE ?? ""} ${f.PAYER_ID_NUMBER}`}
                    </p>
                  </li>
                ))}
              </ul>
            ))}
        </div>
      )}
    </div>
  );
}

export function PruebaTransferencias() {
  const [minutos, setMinutos] = useState<VentanaPrueba>(5);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagos, setPagos] = useState<PruebaPagos | null>(null);

  async function consultar() {
    setCargando(true);
    setError(null);
    const r = await pruebaPagosAction(minutos);
    setCargando(false);
    if (r.error) setError(r.error);
    else if (r.datos) setPagos(r.datos);
  }

  const resultado = pagos?.pagos;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="space-y-1.5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-gm-yellow/[0.14] px-2.5 py-0.5 text-[11px] font-bold tracking-[0.08em] text-gm-yellow">
            PRUEBA
          </span>
          <span className="text-[12px] text-muted-foreground">Todavía no es la función de verificación</span>
        </div>
        <h3 className="m-0 text-[17px] font-semibold">Transferencias recibidas</h3>
        <p className="m-0 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
          Mandá una transferencia chica al alias de esta cuenta y consultá. Muestra solo la plata que entró; lo que
          pagaste con la cuenta no aparece. No guarda nada ni toca cobros.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 border-y border-border bg-secondary/20 px-5 py-3 sm:px-6">
        <span className="text-[12.5px] text-muted-foreground">Últimos</span>
        <Segmentos etiqueta="Período de búsqueda" claro opciones={VENTANAS} valor={minutos} onChange={setMinutos} />
        <button
          type="button"
          onClick={() => void consultar()}
          disabled={cargando}
          className="ml-auto inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#F6F0E6] px-4 text-[13.5px] font-semibold text-[#12100D] transition-colors hover:bg-white disabled:opacity-60"
        >
          {cargando ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {pagos ? "Volver a consultar" : "Consultar"}
        </button>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        {error && <Falla r={{ error }} />}

        {!pagos && !error && (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
            <Landmark className="size-6" />
            <p className="m-0 text-[13.5px]">Elegí el período y tocá Consultar.</p>
          </div>
        )}

        {pagos && resultado && (
          <>
            <p className="m-0 text-[12.5px] text-muted-foreground">
              Consultado a las {hora(pagos.consultadoEl)} · desde {fechaHora(pagos.desde)}
              {resultado.ok &&
                resultado.egresosOmitidos > 0 &&
                ` · ${resultado.egresosOmitidos} pago(s) que hizo la cuenta no se muestran`}
            </p>
            {!resultado.ok ? (
              <Falla r={resultado} />
            ) : resultado.items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-[16px] border border-dashed border-border py-8 text-center">
                <Inbox className="size-6 text-muted-foreground" />
                <p className="m-0 text-[14px] font-semibold">No entró plata en este período</p>
                <p className="m-0 max-w-md text-[13px] text-muted-foreground">
                  Que no aparezca no prueba que no llegó: probá un período más largo o volvé a consultar en un rato.
                </p>
              </div>
            ) : (
              <ul className="m-0 list-none space-y-3 p-0">
                {resultado.items.map((p) => (
                  <TarjetaIngreso key={p.id} p={p} ahora={pagos.consultadoEl} />
                ))}
              </ul>
            )}
            {resultado.ok && resultado.truncado && (
              <p className="m-0 text-[12.5px] text-[#FFB59C]">Hay más de 100 movimientos: acortá el período.</p>
            )}
          </>
        )}
      </div>

      <Reporte />
    </section>
  );
}
