"use client";
import { DataLoading } from '@/components/ui/data-loading';
import LatticeLoader from '@/components/ui/lattice-loader';

// Planes y cobros de la plataforma: cuánto entra por mes, a quién hay que cobrarle, en qué está
// cada cuenta, la lista de precios (con el mismo dibujo que la landing) y lo cobrado. El detalle
// de cada empresa está en la solapa «Plan» de su ficha.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EmpresaConDetalle } from "@/types/tenancy.type";
import { EstadoCuenta, PagoPlataforma, PeriodoPago, Plan, ResumenCuenta } from "@/types/suscripcion.type";
import { getEmpresasAction } from "@/actions/tenancy/tenancy.action";
import {
  editarPeriodoAction,
  editarPlanAction,
  getPagosPlataformaAction,
  getPeriodosAction,
  getPlanesAction,
  revisarVencimientosAction,
} from "@/actions/suscripciones/suscripciones.action";
import { Avatar, EJE, Leyenda, Pastilla, Rotulo, Segmentos, Tarjeta, Variacion } from "@/components/plataforma/mono";
import { Anillo } from "@/components/plataforma/graficos";
import { colorAvatar, corto, iniciales, numero, plural, variacion } from "@/components/plataforma/formato";
import {
  COLORES_CUENTA,
  ESTADOS_CUENTA,
  EstadoCuentaPill,
  GrupoPlan,
  MEDIOS_PAGO,
  agruparPlanes,
  diaAR,
  diasEntreAR,
  hoyAR,
  pesos,
  sufijoPeriodo,
} from "@/components/plataforma/cuenta";
import { GrillaPlanes, Selector, porPeriodo, precioEnPeriodo } from "@/components/plataforma/planes-landing";

// Lo que entra por mes de una cuenta: con un período largo, su importe repartido en los meses.
const porMes = (c: ResumenCuenta) => Math.round(c.importePeriodo / Math.max(1, c.periodo.meses));

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function moverMes(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1 + n, 1)).toISOString().slice(0, 7);
}
const nombreMes = (mes: string) => MESES[Number(mes.slice(5, 7)) - 1];

type Filtro = "todas" | "cobrar" | "prueba" | "alDia" | "sinActivar" | "otras";
const FILTROS: Record<Filtro, (c: ResumenCuenta) => boolean> = {
  todas: () => true,
  cobrar: (c) => c.estado === "VENCIDA" || (c.estado === "SUSPENDIDA" && c.motivoSuspension === "FALTA_DE_PAGO"),
  prueba: (c) => c.estado === "PRUEBA",
  alDia: (c) => c.estado === "AL_DIA",
  sinActivar: (c) => c.estado === "SIN_ACTIVAR",
  otras: (c) => ["BONIFICADA", "BAJA"].includes(c.estado) || (c.estado === "SUSPENDIDA" && c.motivoSuspension === "MANUAL"),
};

// Lo más urgente primero: las que deben (más atraso arriba), después lo que vence antes.
function urgencia(c: ResumenCuenta) {
  if (FILTROS.cobrar(c)) return [0, -c.diasDeAtraso];
  if (c.estado === "PRUEBA" || c.estado === "AL_DIA") return [1, c.diasParaVencer ?? 999];
  if (c.estado === "SIN_ACTIVAR") return [2, 0];
  return [3, 0];
}

export function PlanesPanel() {
  const [empresas, setEmpresas] = useState<EmpresaConDetalle[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoPago[]>([]);
  const [pagos, setPagos] = useState<PagoPlataforma[]>([]);
  const hoy = hoyAR();
  const mesActual = hoy.slice(0, 7);
  const [mes, setMes] = useState(mesActual);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [revisando, setRevisando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    // Seis meses de pagos alcanzan para el gráfico y para navegar los últimos meses.
    const desde = `${moverMes(mesActual, -5)}-01`;
    const [e, p, pg, pe] = await Promise.all([
      getEmpresasAction(),
      getPlanesAction(),
      getPagosPlataformaAction(desde, hoy),
      getPeriodosAction(),
    ]);
    if (e.empresas) setEmpresas(e.empresas);
    if (p.data) setPlanes(p.data);
    if (pg.data) setPagos(pg.data);
    if (pe.data) setPeriodos(pe.data);
    setError(e.error ?? p.error ?? pg.error ?? pe.error ?? "");
    setCargando(false);
  }, [mesActual, hoy]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cuentas = useMemo(
    () => empresas.filter((e) => e.suscripcion).map((e) => ({ empresa: e, cuenta: e.suscripcion! })),
    [empresas],
  );
  const pagan = cuentas.filter((c) => c.cuenta.estado === "AL_DIA" || c.cuenta.estado === "VENCIDA");
  const enPrueba = cuentas.filter((c) => c.cuenta.estado === "PRUEBA");
  const morosas = cuentas.filter((c) => FILTROS.cobrar(c.cuenta));
  const mensual = pagan.reduce((n, c) => n + porMes(c.cuenta), 0);
  const potencial = enPrueba.reduce((n, c) => n + porMes(c.cuenta), 0);
  const adeudado = morosas.reduce((n, c) => n + (c.cuenta.facturaPendiente?.importe ?? c.cuenta.importePeriodo), 0);
  const terminanSemana = enPrueba.filter((c) => (c.cuenta.diasParaVencer ?? 99) <= 7).length;

  const meses = Array.from({ length: 6 }, (_, i) => moverMes(mesActual, i - 5));
  const cobradoPorMes = meses.map((m) =>
    pagos.filter((p) => p.estado === "PAGADA" && p.pagadaEl.startsWith(m)).reduce((n, p) => n + p.importe, 0),
  );
  const cobradoMes = cobradoPorMes[5];
  const cobradoAnterior = cobradoPorMes[4];

  const porEstado = (Object.keys(ESTADOS_CUENTA) as EstadoCuenta[])
    .map((estado) => ({ estado, n: cuentas.filter((c) => c.cuenta.estado === estado).length }))
    .filter((e) => e.n > 0);

  const filtradas = cuentas
    .filter((c) => FILTROS[filtro](c.cuenta))
    .sort((a, b) => {
      const [ua, va] = urgencia(a.cuenta);
      const [ub, vb] = urgencia(b.cuenta);
      return ua - ub || va - vb || a.empresa.nombre.localeCompare(b.empresa.nombre);
    });

  async function revisar() {
    setRevisando(true);
    const r = await revisarVencimientosAction();
    setRevisando(false);
    if (r.error) return toast.error(r.error);
    const { suspendidas = 0, facturas = 0, bajas = 0 } = r.data ?? {};
    toast.success(
      suspendidas || facturas || bajas
        ? `Revisado: ${facturas} facturas emitidas, ${suspendidas} suspendidas, ${bajas} bajas.`
        : "Revisado: no había nada que hacer.",
    );
    void cargar();
  }

  const pagosDelMes = pagos.filter((p) => p.pagadaEl.startsWith(mes));

  if (cargando && !empresas.length && !error) return <DataLoading label="Cargando planes…" className="p-4" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="font-mono text-[11px] tracking-[0.14em] text-gm-yellow">
            PLATAFORMA · {cuentas.length} CUENTAS · {planes.filter((p) => p.activo !== false).length} PLANES VIGENTES
          </div>
          <h1 className="mt-2 font-display text-[34px] font-semibold leading-none tracking-[0.01em] sm:text-[40px]">
            Planes y cobros
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void revisar()}
          disabled={revisando}
          title="Corre ahora la revisión diaria: emite las facturas del día y suspende lo que pasó la gracia"
          className="flex h-11 items-center gap-2 rounded-xl border border-border bg-gm-surface px-4 text-[13.5px] font-semibold transition-colors hover:border-gm-line-strong hover:bg-gm-surface-2 disabled:opacity-50"
        >
          {revisando ? <LatticeLoader compact cellSize={4} gap={1} showTimer={false} /> : <RefreshCw className="size-4" />}
          Revisar vencimientos
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-2xl border border-destructive/60 p-4 text-sm">
          {error}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          rotulo="Ingreso mensual"
          valor={corto(mensual)}
          color="#F5C219"
          pie={`${plural(pagan.length, "empresa paga", "empresas pagan")}${potencial ? ` · +${corto(potencial)} en prueba` : ""}`}
        />
        <Kpi
          rotulo="Por cobrar"
          valor={corto(adeudado)}
          color={morosas.length ? "#FF7A4D" : undefined}
          pie={morosas.length ? `${plural(morosas.length, "cuenta con atraso", "cuentas con atraso")}` : "Nadie debe"}
          accion={morosas.length ? { label: "Ver", hacer: () => setFiltro("cobrar") } : undefined}
        />
        <Kpi
          rotulo={`Cobrado en ${nombreMes(mesActual)}`}
          valor={corto(cobradoMes)}
          derecha={<Variacion valor={variacion(cobradoMes, cobradoAnterior)} decimales={0} />}
          pie={`${plural(pagos.filter((p) => p.estado === "PAGADA" && p.pagadaEl.startsWith(mesActual)).length, "pago", "pagos")} · ${corto(cobradoAnterior)} en ${nombreMes(meses[4])}`}
        />
        <Kpi
          rotulo="En prueba"
          valor={numero(enPrueba.length)}
          pie={terminanSemana ? `${plural(terminanSemana, "termina", "terminan")} esta semana` : "Ninguna termina esta semana"}
          accion={enPrueba.length ? { label: "Ver", hacer: () => setFiltro("prueba") } : undefined}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Tarjeta className="min-h-[300px] lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Rotulo>Cobrado por mes</Rotulo>
              <div className="mt-2 flex items-baseline gap-2.5">
                <span className="font-display text-[30px] font-semibold leading-none tabular-nums">
                  {corto(cobradoPorMes.reduce((n, v) => n + v, 0))}
                </span>
                <span className="text-[12.5px] text-muted-foreground">últimos 6 meses</span>
              </div>
            </div>
            <Pastilla>Pagos registrados</Pastilla>
          </div>
          <Barras
            meses={meses}
            valores={cobradoPorMes}
            seleccionado={mes}
            onElegir={(m) => setMes(m)}
          />
        </Tarjeta>

        <Tarjeta className="min-h-[300px]">
          <Rotulo>Cuentas por estado</Rotulo>
          <div className="mt-3 flex flex-1 flex-col items-center gap-4">
            <Anillo
              tamano={150}
              ariaLabel={porEstado.map((e) => `${ESTADOS_CUENTA[e.estado].label} ${e.n}`).join(", ")}
              segmentos={porEstado.map((e) => ({ id: e.estado, valor: e.n, color: COLORES_CUENTA[e.estado] }))}
            >
              <span className="font-display text-[30px] font-semibold leading-none">{cuentas.length}</span>
              <span className="font-mono text-[10px] tracking-[0.1em]" style={{ color: EJE }}>
                CUENTAS
              </span>
            </Anillo>
            <Leyenda
              items={porEstado.map((e) => ({
                color: COLORES_CUENTA[e.estado],
                label: ESTADOS_CUENTA[e.estado].label.toLowerCase(),
                n: e.n,
              }))}
            />
          </div>
        </Tarjeta>
      </div>

      <section className="overflow-hidden rounded-[22px] border border-border bg-gm-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2E2A23] px-5 py-4">
          <div>
            <h2 className="font-display text-[22px] font-semibold">Cuentas</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Primero las que deben, con más atraso arriba; después lo que vence antes.
            </p>
          </div>
          <div className="overflow-x-auto">
            <Segmentos
              etiqueta="Estado"
              className="w-max"
              opciones={[
                { id: "todas" as Filtro, label: "Todas", cuenta: cuentas.length },
                { id: "cobrar" as Filtro, label: "Para cobrar", cuenta: morosas.length },
                { id: "prueba" as Filtro, label: "En prueba", cuenta: enPrueba.length },
                { id: "alDia" as Filtro, label: "Al día", cuenta: cuentas.filter((c) => FILTROS.alDia(c.cuenta)).length },
                { id: "sinActivar" as Filtro, label: "Sin activar", cuenta: cuentas.filter((c) => FILTROS.sinActivar(c.cuenta)).length },
                { id: "otras" as Filtro, label: "Otras", cuenta: cuentas.filter((c) => FILTROS.otras(c.cuenta)).length },
              ]}
              valor={filtro}
              onChange={setFiltro}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <div role="table" aria-label="Cuentas" className="min-w-[1040px]">
            <div
              role="row"
              className="grid h-11 grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_150px_minmax(0,1.2fr)_120px_120px_48px] items-center gap-3 bg-[#15120E] px-5 font-mono text-[10.5px] tracking-[0.1em]"
              style={{ color: EJE }}
            >
              <span role="columnheader">EMPRESA</span>
              <span role="columnheader">PLAN</span>
              <span role="columnheader">ESTADO</span>
              <span role="columnheader">VENCIMIENTO</span>
              <span role="columnheader">PAGA</span>
              <span role="columnheader">DEBE</span>
              <span role="columnheader" className="sr-only">
                Abrir
              </span>
            </div>
            {cargando && !cuentas.length && (
              <DataLoading label="Cargando cuentas…" className="border-t border-[#2B2620] p-4" />
            )}
            {!cargando && !filtradas.length && (
              <p className="border-t border-[#2B2620] px-5 py-12 text-center text-sm text-muted-foreground">
                No hay cuentas en este estado.
              </p>
            )}
            {filtradas.map(({ empresa, cuenta }) => {
              const debe = FILTROS.cobrar(cuenta) ? (cuenta.facturaPendiente?.importe ?? cuenta.importePeriodo) : 0;
              return (
                <div
                  key={empresa.id}
                  role="row"
                  className="grid min-h-[66px] grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_150px_minmax(0,1.2fr)_120px_120px_48px] items-center gap-3 border-t border-[#2B2620] px-5 py-2 text-[13.5px] transition-colors hover:bg-[#1E1A14]"
                >
                  <span role="cell" className="flex min-w-0 items-center gap-3">
                    <Avatar texto={iniciales(empresa.nombre)} fondo={colorAvatar(empresa.id)} />
                    <span className="min-w-0">
                      <Link
                        href={`/admin/empresas/${empresa.id}?tab=plan`}
                        className="block truncate font-semibold hover:text-gm-yellow"
                      >
                        {empresa.nombre}
                      </Link>
                      <span className="text-xs" style={{ color: EJE }}>
                        Alta {diaAR(cuenta.alta)}
                      </span>
                    </span>
                  </span>
                  <span role="cell" className="min-w-0">
                    <span className="block truncate">
                      {cuenta.planes.length === 1
                        ? cuenta.planes[0].plan
                        : cuenta.planes.length
                          ? plural(cuenta.planes.length, "playa", "playas")
                          : "Sin plan elegido"}
                    </span>
                    {cuenta.planes.length > 1 && (
                      <span className="block truncate text-xs" style={{ color: EJE }}>
                        {cuenta.planes.map((l) => l.plan.replace("Playa ", "")).join(" · ")}
                      </span>
                    )}
                  </span>
                  <span role="cell">
                    <EstadoCuentaPill cuenta={cuenta} />
                  </span>
                  <span role="cell" className="min-w-0 text-[12.5px]">
                    <Vencimiento cuenta={cuenta} hoy={hoy} />
                  </span>
                  <span role="cell" className="font-mono tabular-nums">
                    {cuenta.importePeriodo ? (
                      <>
                        {pesos(cuenta.importePeriodo)}
                        <span className="text-[11px] text-muted-foreground">{sufijoPeriodo(cuenta.periodo.meses)}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </span>
                  <span role="cell" className={`font-mono font-semibold tabular-nums ${debe ? "text-[#FF7A4D]" : ""}`}>
                    {debe ? pesos(debe) : "—"}
                  </span>
                  <span role="cell" className="flex justify-end">
                    <Link
                      href={`/admin/empresas/${empresa.id}?tab=plan`}
                      aria-label={`Abrir el plan de ${empresa.nombre}`}
                      className="flex size-[34px] items-center justify-center rounded-[10px] border border-border transition-colors hover:border-gm-line-strong hover:bg-gm-surface-2"
                    >
                      <ChevronRight className="size-4" />
                    </Link>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <ListaDePrecios planes={planes} periodos={periodos} alGuardarPlanes={setPlanes} alGuardarPeriodos={setPeriodos} />

      <section className="overflow-hidden rounded-[22px] border border-border bg-gm-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2E2A23] px-5 py-4">
          <div>
            <h2 className="font-display text-[22px] font-semibold">Pagos recibidos</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">Por fecha en que entró la plata. Los anulados quedan tachados.</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Mes anterior"
              disabled={mes <= meses[0]}
              onClick={() => setMes((m) => moverMes(m, -1))}
              className="flex size-9 items-center justify-center rounded-[10px] border border-border hover:bg-gm-surface-2 disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-[150px] text-center text-sm font-semibold capitalize">
              {nombreMes(mes)} {mes.slice(0, 4)} · {corto(pagosDelMes.filter((p) => p.estado === "PAGADA").reduce((n, p) => n + p.importe, 0))}
            </span>
            <button
              type="button"
              aria-label="Mes siguiente"
              disabled={mes >= mesActual}
              onClick={() => setMes((m) => moverMes(m, 1))}
              className="flex size-9 items-center justify-center rounded-[10px] border border-border hover:bg-gm-surface-2 disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
        {!pagosDelMes.length ? (
          <p className="p-10 text-center text-sm text-muted-foreground">Sin pagos registrados en este mes.</p>
        ) : (
          <div className="overflow-x-auto">
            <div role="table" aria-label="Pagos recibidos" className="min-w-[860px]">
              <div
                role="row"
                className="grid h-[42px] grid-cols-[90px_minmax(0,1fr)_130px_130px_200px_minmax(0,1fr)] items-center gap-3 bg-[#15120E] px-5 font-mono text-[10.5px] tracking-[0.1em]"
                style={{ color: EJE }}
              >
                <span role="columnheader">FECHA</span>
                <span role="columnheader">EMPRESA</span>
                <span role="columnheader">IMPORTE</span>
                <span role="columnheader">MEDIO</span>
                <span role="columnheader">CUBRE</span>
                <span role="columnheader">REFERENCIA</span>
              </div>
              {pagosDelMes.map((p) => (
                <div
                  key={p.id}
                  role="row"
                  className={`grid min-h-[52px] grid-cols-[90px_minmax(0,1fr)_130px_130px_200px_minmax(0,1fr)] items-center gap-3 border-t border-[#2B2620] px-5 py-2 text-[13.5px] ${p.estado === "ANULADA" ? "opacity-50" : ""}`}
                >
                  <span role="cell" className="tabular-nums">
                    {diaAR(p.pagadaEl, false)}
                  </span>
                  <span role="cell" className="truncate">
                    <Link href={`/admin/empresas/${p.empresaId}?tab=plan`} className="font-semibold hover:text-gm-yellow">
                      {p.empresa}
                    </Link>
                  </span>
                  <span role="cell" className={`font-mono font-semibold tabular-nums ${p.estado === "ANULADA" ? "line-through" : ""}`}>
                    {pesos(p.importe)}
                  </span>
                  <span role="cell">{p.medio ? MEDIOS_PAGO[p.medio] : "—"}</span>
                  <span role="cell" className="tabular-nums text-[12.5px] text-[#C9BFB1]">
                    {diaAR(p.desde, false)} al {diaAR(p.hasta)} · {p.meses} {p.meses === 1 ? "mes" : "meses"}
                  </span>
                  <span role="cell" className="truncate text-[12.5px]" style={{ color: EJE }}>
                    {p.referencia ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Kpi({
  rotulo,
  valor,
  pie,
  color,
  derecha,
  accion,
}: {
  rotulo: string;
  valor: string;
  pie: string;
  color?: string;
  derecha?: React.ReactNode;
  accion?: { label: string; hacer: () => void };
}) {
  return (
    <Tarjeta className="min-h-[150px] justify-between gap-3 pb-4 pt-4">
      <div className="flex items-center justify-between gap-2">
        <Rotulo>{rotulo}</Rotulo>
        {derecha}
        {accion && (
          <button type="button" onClick={accion.hacer} className="text-[12.5px] font-semibold text-gm-yellow hover:text-[#FFD84D]">
            {accion.label} →
          </button>
        )}
      </div>
      <span className="font-display text-[36px] font-semibold leading-none tabular-nums" style={{ color }}>
        {valor}
      </span>
      <span className="border-t border-[#2E2A23] pt-2 font-mono text-[11px]" style={{ color: EJE }}>
        {pie}
      </span>
    </Tarjeta>
  );
}

function Vencimiento({ cuenta, hoy }: { cuenta: ResumenCuenta; hoy: string }) {
  const fecha = cuenta.proximoVencimiento;
  if (!fecha || ["SIN_ACTIVAR", "BONIFICADA", "BAJA"].includes(cuenta.estado))
    return <span style={{ color: EJE }}>—</span>;
  const dias = diasEntreAR(hoy, fecha);
  const atrasado = cuenta.diasDeAtraso > 0;
  return (
    <>
      <span className={`block font-semibold tabular-nums ${atrasado ? "text-[#FF7A4D]" : ""}`}>
        {cuenta.estado === "PRUEBA" ? "Primera factura " : ""}
        {diaAR(fecha, false)}
      </span>
      <span className="block truncate text-xs" style={{ color: atrasado ? "#FF7A4D" : EJE }}>
        {atrasado
          ? cuenta.estado === "SUSPENDIDA"
            ? `Suspendida el ${cuenta.suspendidaEl ? diaAR(cuenta.suspendidaEl.slice(0, 10), false) : "—"}`
            : `Se suspende el ${diaAR(cuenta.suspendeEl, false)}`
          : dias === 0
            ? "Vence hoy"
            : dias === 1
              ? "Mañana"
              : `En ${dias} días`}
      </span>
    </>
  );
}

// Seis barras, una por mes, con el importe arriba. El mes elegido (el de la tabla de pagos) va en
// amarillo; un clic en otra barra la elige.
function Barras({
  meses,
  valores,
  seleccionado,
  onElegir,
}: {
  meses: string[];
  valores: number[];
  seleccionado: string;
  onElegir: (mes: string) => void;
}) {
  const maximo = Math.max(1, ...valores);
  return (
    <div className="mt-4 flex flex-1 items-end gap-3 rounded-2xl border border-[#26221C] bg-background px-4 pb-3 pt-6">
      {meses.map((m, i) => {
        const activo = m === seleccionado;
        return (
          <button
            key={m}
            type="button"
            onClick={() => onElegir(m)}
            className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
            aria-pressed={activo}
            aria-label={`${nombreMes(m)}: ${pesos(valores[i])}`}
          >
            <span className={`font-mono text-[11px] tabular-nums ${activo ? "text-gm-yellow" : "text-[#A59B8D]"}`}>
              {valores[i] ? corto(valores[i]) : "—"}
            </span>
            <span
              className="w-full max-w-[56px] rounded-t-lg transition-colors"
              style={{
                height: `${Math.max(4, (valores[i] / maximo) * 150)}px`,
                background: activo ? "#F5C219" : valores[i] ? "#E9E1D4" : "#2E2A23",
                opacity: activo ? 1 : 0.85,
              }}
            />
            <span className={`font-mono text-[10.5px] uppercase ${activo ? "text-gm-yellow" : ""}`} style={activo ? undefined : { color: EJE }}>
              {nombreMes(m).slice(0, 3)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Lista de precios ───────────────────────────────────────────────────────

const entero = (v: string) => v.replace(/\D/g, "");
const inputMono =
  "h-11 min-w-0 rounded-[10px] border border-[#3A342B] bg-[#14110D] px-3 font-mono text-[18px] font-medium text-[#F6F0E6] focus-visible:border-gm-yellow focus-visible:ring-0";

// La lista de precios con las tarjetas de la landing, editable en el lugar: el tamaño, el precio
// solo tickets y el precio con cocheras de cada tamaño, y el descuento de cada período. Es lo que
// publica la landing (GET /public/planes) y lo que se ofrece a las playas nuevas; lo que cada playa
// ya tiene pactado no cambia. Se guarda todo junto; «Se ofrece» se aplica en el momento.
function ListaDePrecios({
  planes,
  periodos,
  alGuardarPlanes,
  alGuardarPeriodos,
}: {
  planes: Plan[];
  periodos: PeriodoPago[];
  alGuardarPlanes: (p: Plan[]) => void;
  alGuardarPeriodos: (p: PeriodoPago[]) => void;
}) {
  const grupos = useMemo(() => agruparPlanes(planes), [planes]);
  const [cocheras, setCocheras] = useState(false);
  const [vista, setVista] = useState("MENSUAL");
  // Lo que se está editando, todavía sin guardar.
  const [precios, setPrecios] = useState<Record<string, string>>({});
  const [maximos, setMaximos] = useState<Record<string, string>>({});
  const [descuentos, setDescuentos] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const periodoVista = periodos.find((p) => p.codigo === vista) ?? { meses: 1, descuento: 0 };
  const precioDe = (p: Plan) => precios[p.id] ?? String(p.precioMensual);
  const maximoDe = (g: GrupoPlan) => maximos[g.tamano] ?? (g.maxActivos === null ? "" : String(g.maxActivos));
  const descuentoDe = (p: PeriodoPago) => descuentos[p.codigo] ?? String(p.descuento);

  // Lo que cambió, plan por plan y período por período.
  const cambiosPlanes = grupos.flatMap((g) =>
    [g.base, g.alquileres]
      .filter((p): p is Plan => !!p)
      .map((p) => {
        const cambios: { precioMensual?: number; maxActivos?: number | null } = {};
        const precio = Number(precioDe(p));
        const maximo = maximoDe(g).trim() ? Number(maximoDe(g)) : null;
        if (precio !== p.precioMensual) cambios.precioMensual = precio;
        if (maximo !== p.maxActivos) cambios.maxActivos = maximo;
        return { plan: p, cambios };
      })
      .filter((c) => Object.keys(c.cambios).length),
  );
  const cambiosPeriodos = periodos
    .filter((p) => p.meses > 1 && Number(descuentoDe(p)) !== p.descuento)
    .map((p) => ({ periodo: p, descuento: Number(descuentoDe(p)) }));
  const hayCambios = cambiosPlanes.length > 0 || cambiosPeriodos.length > 0;

  function descartar() {
    setPrecios({});
    setMaximos({});
    setDescuentos({});
  }

  async function guardar() {
    if (cambiosPlanes.some((c) => c.cambios.precioMensual !== undefined && !(c.cambios.precioMensual > 0)))
      return toast.error("Cada precio tiene que ser mayor a cero, en pesos enteros.");
    if (cambiosPeriodos.some((c) => c.descuento > 50)) return toast.error("El descuento va de 0 a 50%.");
    setGuardando(true);
    let planesNuevos: Plan[] | undefined;
    let periodosNuevos: PeriodoPago[] | undefined;
    for (const c of cambiosPlanes) {
      const r = await editarPlanAction(c.plan.id, c.cambios);
      if (r.error) {
        setGuardando(false);
        return toast.error(r.error);
      }
      planesNuevos = r.data;
    }
    for (const c of cambiosPeriodos) {
      const r = await editarPeriodoAction(c.periodo.codigo, { descuento: c.descuento });
      if (r.error) {
        setGuardando(false);
        return toast.error(r.error);
      }
      periodosNuevos = r.data;
    }
    setGuardando(false);
    if (planesNuevos) alGuardarPlanes(planesNuevos);
    if (periodosNuevos) alGuardarPeriodos(periodosNuevos);
    descartar();
    toast.success("Guardado. La landing lo muestra en unos minutos; lo pactado no cambia.");
  }

  // Un tamaño se ofrece o no con sus dos variantes juntas, como lo muestra la landing.
  async function ofrecerTamano(g: GrupoPlan, activo: boolean) {
    let ultimo: Plan[] | undefined;
    for (const p of [g.base, g.alquileres].filter((p): p is Plan => !!p)) {
      const r = await editarPlanAction(p.id, { activo });
      if (r.error) return toast.error(r.error);
      ultimo = r.data;
    }
    if (ultimo) alGuardarPlanes(ultimo);
    toast.success(activo ? "Vuelve a ofrecerse en la landing." : "Retirado: no se ofrece; quien lo tiene lo conserva.");
  }

  async function ofrecerPeriodo(p: PeriodoPago, activo: boolean) {
    const r = await editarPeriodoAction(p.codigo, { activo });
    if (r.error) return toast.error(r.error);
    if (r.data) alGuardarPeriodos(r.data);
    toast.success(activo ? "Vuelve a ofrecerse." : "Retirado: no se ofrece; quien lo tiene lo conserva.");
  }

  const ejemplo = planes.find((p) => p.codigo === "MEDIANA") ?? planes.find((p) => !p.incluyeCocheras) ?? null;
  const switchClase =
    "data-[state=checked]:bg-gm-yellow data-[state=unchecked]:bg-[#2E2A23]";

  return (
    <section className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-3xl space-y-1.5">
          <h2 className="font-display text-[22px] font-semibold">Lista de precios</h2>
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            Lo que cargues acá es lo que muestra la landing y lo que se ofrece a las playas nuevas. Lo que cada playa
            ya tiene pactado no cambia (para subirle a un cliente, cambiá su precio en su ficha). Las playas
            adicionales de una empresa pagan 30% menos.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-xl border border-[#2E2A23] bg-[#1B1915] px-4 py-3 text-[13px] text-[#BDB4A6]">
          <span aria-hidden className="size-[7px] rounded-full bg-[#4ADE9B]" />
          La landing toma estos precios: los cambios se ven ahí en unos minutos
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-x-8 gap-y-[18px]">
        <Selector
          etiqueta="Vista previa · qué incluye"
          opciones={[
            { valor: false, etiqueta: "Tickets y rotación" },
            { valor: true, etiqueta: "+ Cocheras mensuales" },
          ]}
          valor={cocheras}
          onChange={setCocheras}
        />
        <Selector
          etiqueta="Vista previa · período"
          opciones={periodos
            .filter((p) => p.activo !== false)
            .map((p) => ({ valor: p.codigo, etiqueta: p.nombre, descuento: Number(descuentoDe(p)) || undefined }))}
          valor={vista}
          onChange={setVista}
        />
      </div>

      <GrillaPlanes>
        {grupos.map((g) => {
          const variantes = [
            { plan: g.base, etiqueta: "Tickets y rotación" },
            { plan: g.alquileres, etiqueta: "+ Cocheras mensuales" },
          ].filter((v): v is { plan: Plan; etiqueta: string } => !!v.plan);
          const mostrada = (cocheras ? g.alquileres : g.base) ?? g.base ?? g.alquileres;
          const vistaPrecio = mostrada
            ? precioEnPeriodo(Number(precioDe(mostrada)) || 0, {
                meses: periodoVista.meses,
                descuento: Number(periodos.find((p) => p.codigo === vista) ? descuentoDe(periodos.find((p) => p.codigo === vista)!) : 0),
              })
            : null;
          const enUso = variantes.reduce((n, v) => n + (v.plan.playas ?? 0), 0);
          const ofrecido = variantes.some((v) => v.plan.activo !== false);
          const destacado = g.tamano === "MEDIANA";
          const maximo = maximoDe(g);
          return (
            <article
              key={g.tamano}
              className={`relative flex flex-col gap-[18px] rounded-2xl bg-[#1B1915] px-7 pb-[22px] pt-7 ${destacado ? "border-[1.5px] border-[#F6F0E6]" : "border border-[#2E2A23]"} ${ofrecido ? "" : "opacity-60"}`}
            >
              {destacado && (
                <span className="absolute -top-3 left-7 rounded-full bg-gm-yellow px-2.5 py-1 text-xs font-bold text-[#12100D]">
                  Más elegido
                </span>
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <h3 className="text-lg font-semibold text-[#F6F0E6]">{g.nombre}</h3>
                  <label className="flex flex-wrap items-center gap-2 text-sm text-[#BDB4A6]">
                    Hasta
                    <Input
                      inputMode="numeric"
                      value={maximo}
                      placeholder="sin límite"
                      aria-label={`Vehículos a la vez de ${g.nombre}`}
                      onChange={(e) => setMaximos((m) => ({ ...m, [g.tamano]: entero(e.target.value) }))}
                      className="h-8 w-[84px] rounded-lg border-[#3A342B] bg-[#14110D] px-2.5 font-mono text-sm"
                    />
                    {maximo ? "vehículos a la vez" : "· sin límite"}
                  </label>
                </div>
                <span className="flex-none rounded-full border border-[#3A342B] px-2.5 py-1 text-xs text-[#A79E8F]">
                  {enUso ? plural(enUso, "playa", "playas") : "Sin uso"}
                </span>
              </div>

              {vistaPrecio && (
                <div className="flex flex-col gap-1 rounded-xl bg-[#14110D] px-[18px] py-4">
                  <span className="text-xs text-[#8F8676]">Así se ve en la landing</span>
                  <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="whitespace-nowrap font-mono text-[34px] font-medium leading-[1.1] tracking-[-0.035em]">
                      {pesos(vistaPrecio.porMes)}
                    </span>
                    <span className="text-sm text-[#8F8676]">por mes</span>
                  </p>
                  <span className="min-h-[18px] text-[12.5px] text-[#BDB4A6]">
                    {periodoVista.meses > 1 && (
                      <>
                        <strong className="font-semibold text-[#F6F0E6]">
                          {pesos(vistaPrecio.total)} {porPeriodo(periodoVista.meses)}
                        </strong>
                        {vistaPrecio.ahorro > 0 && ` · Ahorrás ${pesos(vistaPrecio.ahorro)}`}
                      </>
                    )}
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {variantes.map(({ plan, etiqueta }) => (
                  <label key={plan.id} className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#E3DBCE]">
                    {etiqueta}
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-base text-[#8F8676]">$</span>
                      <Input
                        inputMode="numeric"
                        value={precioDe(plan)}
                        aria-label={`Precio de ${plan.nombre}`}
                        onChange={(e) => setPrecios((p) => ({ ...p, [plan.id]: entero(e.target.value) }))}
                        className={`${inputMono} flex-1`}
                      />
                      <span className="text-[13px] font-medium text-[#8F8676]">/mes</span>
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#2B2620] pt-4">
                <span className="text-sm text-[#BDB4A6]">Se ofrece en la landing</span>
                <Switch
                  checked={ofrecido}
                  onCheckedChange={(v) => void ofrecerTamano(g, v)}
                  aria-label={`${g.nombre} se ofrece en la landing`}
                  className={switchClase}
                />
              </div>
            </article>
          );
        })}
      </GrillaPlanes>

      <div className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <h3 className="text-[19px] font-semibold">Períodos de pago</h3>
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            El descuento por pagar el período completo: el «−10%» y el «−15%» de los botones de la landing. El de cada
            empresa se elige en su ficha y queda fijo aunque después lo cambies acá.
          </p>
        </div>
        <GrillaPlanes>
          {periodos.map((p) => {
            const base = p.meses === 1;
            const descuento = Number(descuentoDe(p)) || 0;
            const lista = ejemplo ? ejemplo.precioMensual * p.meses : 0;
            const total = Math.round((lista * (100 - descuento)) / 100);
            return (
              <article
                key={p.codigo}
                className={`flex flex-col gap-3.5 rounded-2xl border border-[#2E2A23] bg-[#1B1915] px-7 pb-5 pt-6 ${p.activo === false ? "opacity-60" : ""}`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h4 className="text-lg font-semibold text-[#F6F0E6]">{p.nombre}</h4>
                  <span className="text-[13px] text-[#8F8676]">
                    {base ? "Un pago por mes" : p.meses === 12 ? "Un pago por año" : `Un pago cada ${p.meses} meses`}
                  </span>
                </div>
                {base ? (
                  <p className="font-mono text-[26px] font-medium tracking-[-0.02em] text-[#BDB4A6]">Sin descuento</p>
                ) : (
                  <label className="flex items-center gap-2 text-sm text-[#BDB4A6]">
                    Descuento
                    <span className="flex items-center gap-1.5 font-mono text-[22px] text-[#F6F0E6]">
                      −
                      <Input
                        inputMode="numeric"
                        value={descuentoDe(p)}
                        aria-label={`Descuento ${p.nombre.toLowerCase()}`}
                        onChange={(e) => setDescuentos((d) => ({ ...d, [p.codigo]: entero(e.target.value) }))}
                        className={`${inputMono} w-16 text-center text-[22px]`}
                      />
                      %
                    </span>
                  </label>
                )}
                {ejemplo && (
                  <p className="text-[13px] leading-relaxed text-[#8F8676]">
                    {base
                      ? `${ejemplo.nombre}: ${pesos(ejemplo.precioMensual)} por mes. Es la base de los otros.`
                      : `${ejemplo.nombre}: ${pesos(total)} ${porPeriodo(p.meses)}${total < lista ? ` · ahorra ${pesos(lista - total)}` : ""}`}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#2B2620] pt-3.5 text-[13px] text-[#8F8676]">
                  <span>{p.empresas ? plural(p.empresas, "empresa", "empresas") : "Sin uso"}</span>
                  {base ? (
                    <span>Siempre se ofrece</span>
                  ) : (
                    <Switch
                      checked={p.activo !== false}
                      onCheckedChange={(v) => void ofrecerPeriodo(p, v)}
                      aria-label={`${p.nombre} se ofrece`}
                      className={switchClase}
                    />
                  )}
                </div>
              </article>
            );
          })}
        </GrillaPlanes>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3.5 rounded-[14px] border border-[#2E2A23] bg-[#1B1915] px-[22px] py-[18px]">
        <p className="text-sm leading-relaxed text-[#BDB4A6]">
          {hayCambios
            ? "Tenés cambios sin guardar. Rigen para las playas nuevas y se publican en la landing; a quien ya tiene plan no le cambia nada."
            : "Rige para las playas nuevas y se publica en la landing. A quien ya tiene plan no le cambia nada."}
        </p>
        <div className="flex gap-2.5">
          <button
            type="button"
            disabled={!hayCambios || guardando}
            onClick={descartar}
            className="h-11 rounded-[10px] border border-[#3A342B] px-4 text-sm font-semibold text-[#F6F0E6] transition-colors hover:border-[#F6F0E6] disabled:opacity-40"
          >
            Descartar
          </button>
          <button
            type="button"
            disabled={!hayCambios || guardando}
            onClick={() => void guardar()}
            className="h-11 rounded-[10px] bg-[#F6F0E6] px-[18px] text-sm font-semibold text-[#12100D] transition-colors hover:bg-white disabled:opacity-40"
          >
            {guardando ? "Guardando…" : "Guardar y publicar"}
          </button>
        </div>
      </div>
    </section>
  );
}
