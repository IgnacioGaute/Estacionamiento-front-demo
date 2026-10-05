"use client";

// La prueba de transferencias del super admin. NO es la función comercial: sirve para averiguar
// con evidencia si las transferencias que recibe una cuenta conectada por OAuth se ven desde el
// sistema, con qué datos y con qué demora. El backend solo la corre sobre cuentas de MercadoPago
// autorizadas para probar (con cualquier otra contesta que no está autorizada) y solo devuelve
// plata que entró. Muestra cada respuesta tal cual, también los errores, porque eso es lo que se
// está probando. Ver docs/verificacion-transferencias.md en el backend.
//
// Dos vías, cada una con su sección: la búsqueda de pagos (inmediata, si las transferencias
// aparecen ahí) y el reporte «Todas las transacciones» (asíncrono: se pide y aparece después).

import { useState } from "react";
import { FileSearch, FileText, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Segmentos } from "@/components/plataforma/mono";
import {
  pruebaConfigurarReporteAction,
  pruebaLeerReporteAction,
  pruebaPagosAction,
  pruebaPedirReporteAction,
  pruebaReporteEstadoAction,
} from "@/actions/mercadopago/prueba-transferencias.action";
import type {
  ConsultaFallida,
  PagoDePrueba,
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

// Con segundos: la prueba mide demoras.
const horaAR = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

const plata = (n: number | null, moneda?: string | null) =>
  n === null ? "—" : `$${n.toLocaleString("es-AR")}${moneda && moneda !== "ARS" ? ` ${moneda}` : ""}`;

const boton =
  "inline-flex h-9 items-center gap-2 rounded-[10px] border border-border px-3.5 text-[13px] font-semibold transition-colors hover:border-gm-line-strong hover:bg-gm-surface-2 disabled:opacity-60";

function Falla({ r }: { r: ConsultaFallida | { error: string } }) {
  return (
    <p className="m-0 rounded-[10px] bg-[#FF7A4D]/10 px-3 py-2 text-[12.5px] text-[#FF7A4D]">
      {"estado" in r ? `MercadoPago contestó ${r.estado ?? "sin respuesta"}: ` : ""}
      {r.error}
    </p>
  );
}

function Datos({ valor }: { valor: unknown }) {
  return (
    <pre className="m-0 max-h-72 overflow-auto rounded-[10px] bg-[#15120E] p-3 text-[11.5px] leading-relaxed text-[#BDB4A6]">
      {JSON.stringify(valor, null, 2)}
    </pre>
  );
}

function Titulo({ children }: { children: React.ReactNode }) {
  return <h4 className="m-0 text-[13px] font-semibold">{children}</h4>;
}

function FilaPago({ p }: { p: PagoDePrueba }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <li className="border-t border-border first:border-t-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="grid w-full grid-cols-[120px_1fr_auto] items-center gap-3 px-4 py-3 text-left text-[13px] hover:bg-gm-surface-2"
      >
        <span className="text-[12px] text-muted-foreground">{horaAR(p.creado)}</span>
        <span className="min-w-0">
          <span className="block truncate font-semibold">{p.pagador.nombre ?? "Sin nombre del que pagó"}</span>
          <span className="block truncate text-[12px] text-muted-foreground">
            {[p.operacion, p.tipo, p.medio, p.origen?.tipo].filter(Boolean).join(" · ")}
            {p.recibido === null && " · sin dato de quién cobró"}
          </span>
        </span>
        <span className="text-right">
          <span className="block font-mono font-semibold">{plata(p.importe, p.moneda)}</span>
          <span
            className={cn("block text-[11.5px]", p.estado === "approved" ? "text-emerald-400" : "text-muted-foreground")}
          >
            {p.estado}
          </span>
        </span>
      </button>
      {abierto && (
        <div className="px-4 pb-3">
          <Datos valor={p} />
        </div>
      )}
    </li>
  );
}

export function PruebaTransferencias({ empresaId }: { empresaId: string }) {
  const [minutos, setMinutos] = useState<VentanaPrueba>(5);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pagos, setPagos] = useState<PruebaPagos | null>(null);
  const [reporte, setReporte] = useState<PruebaReporteEstado | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [lectura, setLectura] = useState<PruebaReporteLectura | null>(null);

  // Corre una acción mostrando qué se está haciendo; un error del backend (cuenta no autorizada,
  // sin MercadoPago) queda a la vista en vez de un toast que se va.
  async function correr<T>(que: string, accion: () => Promise<{ datos?: T; error?: string }>, listo: (d: T) => void) {
    setOcupado(que);
    setError(null);
    const r = await accion();
    setOcupado(null);
    if (r.error) setError(r.error);
    else if (r.datos) listo(r.datos);
  }

  const verReporte = () => correr("estado", () => pruebaReporteEstadoAction(empresaId), setReporte);

  const sinConfig = reporte && !reporte.config.ok && reporte.config.estado === 404;

  return (
    <section className="overflow-hidden rounded-[22px] border border-border bg-gm-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold tracking-[0.12em] text-gm-yellow">PRUEBA · NO ES LA FUNCIÓN COMERCIAL</div>
          <h3 className="m-0 mt-1 text-[15px] font-semibold">Transferencias recibidas en MercadoPago</h3>
          <p className="m-0 mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            Solo funciona con cuentas de MercadoPago autorizadas para probar. Muestra únicamente plata que entró; no
            guarda nada ni toca cobros.
          </p>
        </div>
        <Segmentos etiqueta="Ventana" claro opciones={VENTANAS} valor={minutos} onChange={setMinutos} />
      </div>

      <div className="flex flex-col gap-6 px-5 py-4">
        {error && <Falla r={{ error }} />}

        {/* Vía 1: la búsqueda de pagos. Si las transferencias aparecen acá, sirve en el mostrador. */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <Titulo>Búsqueda de pagos</Titulo>
            <button
              type="button"
              className={boton}
              disabled={!!ocupado}
              onClick={() => void correr("pagos", () => pruebaPagosAction(empresaId, minutos), setPagos)}
            >
              {ocupado === "pagos" ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              Consultar pagos
            </button>
          </div>
          {pagos && (
            <>
              <p className="m-0 text-[12px] text-muted-foreground">
                Cuenta {pagos.cuenta.nickname ?? "—"} (id {pagos.cuenta.mpUserId}) · del {horaAR(pagos.desde)} al{" "}
                {horaAR(pagos.hasta)} · consultado {horaAR(pagos.consultadoEl)}
                {pagos.pagos.ok && pagos.pagos.egresosOmitidos > 0 &&
                  ` · ${pagos.pagos.egresosOmitidos} pago(s) que hizo la cuenta no se muestran`}
              </p>
              {!pagos.pagos.ok ? (
                <Falla r={pagos.pagos} />
              ) : pagos.pagos.items.length === 0 ? (
                <p className="m-0 text-[12.5px] text-muted-foreground">
                  MercadoPago no informa ingresos en esta ventana. Que no aparezca no prueba que no llegó: probá una
                  ventana más larga o el reporte.
                </p>
              ) : (
                <ul className="m-0 list-none overflow-hidden rounded-[12px] border border-border p-0">
                  {pagos.pagos.items.map((p) => (
                    <FilaPago key={p.id} p={p} />
                  ))}
                </ul>
              )}
              {pagos.pagos.ok && pagos.pagos.truncado && (
                <p className="m-0 text-[12px] text-[#FF7A4D]">Hay más resultados que los 100 que trae: acortá la ventana.</p>
              )}
            </>
          )}
        </div>

        {/* Vía 2: el reporte «Todas las transacciones». Asíncrono: sirve para conciliar después. */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <Titulo>Reporte «Todas las transacciones»</Titulo>
            <button type="button" className={boton} disabled={!!ocupado} onClick={() => void verReporte()}>
              {ocupado === "estado" ? <Loader2 className="size-4 animate-spin" /> : <FileSearch className="size-4" />}
              Ver estado
            </button>
            <button
              type="button"
              className={boton}
              disabled={!!ocupado}
              onClick={() =>
                void correr("pedir", () => pruebaPedirReporteAction(empresaId, minutos), (d) => {
                  setAviso(
                    d.respuesta.ok
                      ? `Pedido a las ${horaAR(d.pedidoEl)} (MercadoPago contestó ${d.respuesta.estado}). Tocá «Ver estado» en un rato para ver si ya está.`
                      : `MercadoPago contestó ${d.respuesta.estado ?? "sin respuesta"}: ${d.respuesta.error}`,
                  );
                })
              }
            >
              {ocupado === "pedir" ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
              Pedir reporte de la ventana
            </button>
            {sinConfig && (
              <button
                type="button"
                className={boton}
                disabled={!!ocupado}
                onClick={() =>
                  void correr("config", () => pruebaConfigurarReporteAction(empresaId), (d) => {
                    setAviso(
                      d.creada
                        ? "Configuración creada."
                        : `No se pudo crear: ${d.respuesta.ok ? d.respuesta.estado : d.respuesta.error}`,
                    );
                    void verReporte();
                  })
                }
              >
                Crear configuración del reporte
              </button>
            )}
          </div>
          {aviso && <p className="m-0 text-[12.5px] text-muted-foreground">{aviso}</p>}
          {reporte && (
            <>
              {reporte.config.ok ? (
                <p className="m-0 text-[12px] text-muted-foreground">
                  Configuración: {reporte.config.columnas.length} columnas
                  {reporte.config.faltan.length > 0 && ` · faltan ${reporte.config.faltan.join(", ")}`}
                </p>
              ) : (
                <Falla r={reporte.config} />
              )}
              {!reporte.reportes.ok ? (
                <Falla r={reporte.reportes} />
              ) : reporte.reportes.items.length === 0 ? (
                <p className="m-0 text-[12.5px] text-muted-foreground">Todavía no hay reportes generados.</p>
              ) : (
                <ul className="m-0 list-none overflow-hidden rounded-[12px] border border-border p-0">
                  {reporte.reportes.items.map((r, i) => {
                    const nombre = typeof r.file_name === "string" ? r.file_name : null;
                    return (
                      <li
                        key={nombre ?? i}
                        className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-2.5 text-[12.5px] first:border-t-0"
                      >
                        <span className="min-w-0 flex-1 truncate font-mono">{nombre ?? "sin archivo"}</span>
                        <span className="text-muted-foreground">
                          {String(r.status ?? "")} · creado {horaAR(typeof r.date_created === "string" ? r.date_created : null)}
                        </span>
                        {nombre && (
                          <button
                            type="button"
                            className={boton}
                            disabled={!!ocupado}
                            onClick={() =>
                              void correr("leer", () => pruebaLeerReporteAction(empresaId, nombre), setLectura)
                            }
                          >
                            Leer
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
          {lectura && (
            <div className="flex flex-col gap-2">
              <p className="m-0 text-[12px] text-muted-foreground">
                {lectura.archivo} · leído {horaAR(lectura.leidoEl)}
              </p>
              {!lectura.respuesta.ok ? (
                <Falla r={lectura.respuesta} />
              ) : !lectura.respuesta.reconocible ? (
                <p className="m-0 text-[12.5px] text-[#FF7A4D]">
                  El reporte no trae TRANSACTION_TYPE y TRANSACTION_AMOUNT con esos nombres, así que no se puede separar lo
                  que entró. Columnas: {lectura.respuesta.columnas.join(", ")}
                </p>
              ) : lectura.respuesta.ingresos.length === 0 ? (
                <p className="m-0 text-[12.5px] text-muted-foreground">
                  {lectura.respuesta.totalFilas} fila(s), ninguna es un ingreso aprobado.
                </p>
              ) : (
                <Datos valor={lectura.respuesta.ingresos} />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
