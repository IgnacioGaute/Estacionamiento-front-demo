"use client";

// Cobros del mes: las facturas de todas las empresas que vencen en el mes. Responde lo que el
// listado de cuentas no dice de un vistazo: cuánto se facturó, cuánto entró, qué falta y todavía
// no venció, y qué está vencido (con lo que ya pasó la gracia y se suspende). «Pagos recibidos»,
// más abajo, cuenta la plata por la fecha en que entró; esto, por la fecha en que vence.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getFacturasDelMesAction } from "@/actions/suscripciones/suscripciones.action";
import type { FacturaDelMes } from "@/types/suscripcion.type";
import { DIAS_DE_GRACIA, MEDIOS_PAGO, diaAR, pesos } from "@/components/plataforma/cuenta";
import { corto, numero, plural } from "@/components/plataforma/formato";
import { EJE, Segmentos } from "@/components/plataforma/mono";
import { FilasPlataformaCargando } from "@/components/plataforma/cargando";
import { DataLoading } from "@/components/ui/data-loading";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const nombreMes = (mes: string) => `${MESES[Number(mes.slice(5, 7)) - 1]} ${mes.slice(0, 4)}`;
const moverMes = (mes: string, n: number) => {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1 + n, 1)).toISOString().slice(0, 7);
};

// Los colores de la cuenta: pagada en verde, vencida en naranja y, pasada la gracia, en rojo.
const TRAMOS = [
  { id: "cobrado", label: "Cobrado", color: "#3DD68C" },
  { id: "sinVencer", label: "Sin vencer", color: "#8A8073" },
  { id: "atraso", label: `1 a ${DIAS_DE_GRACIA} días de atraso`, color: "#F0A43A" },
  { id: "grave", label: `Más de ${DIAS_DE_GRACIA} días · se suspende`, color: "#F2725B" },
] as const;

type Filtro = "todas" | "pendientes" | "vencidas" | "pagadas";

const vencida = (f: FacturaDelMes) => f.estado === "PENDIENTE" && f.diasDeAtraso > 0;
const FILTROS: Record<Filtro, (f: FacturaDelMes) => boolean> = {
  todas: () => true,
  pendientes: (f) => f.estado === "PENDIENTE" && !vencida(f),
  vencidas: vencida,
  pagadas: (f) => f.estado === "PAGADA",
};

function EstadoFactura({ f }: { f: FacturaDelMes }) {
  const [texto, color, fondo] =
    f.estado === "PAGADA"
      ? ["Pagada", "#3DD68C", "#3DD68C1F"]
      : f.estado === "ANULADA"
        ? ["Anulada", "#8A8073", "#221F1A"]
        : f.diasDeAtraso > DIAS_DE_GRACIA
          ? [`Vencida · ${plural(f.diasDeAtraso, "día", "días")}`, "#F2725B", "#F2725B24"]
          : f.diasDeAtraso > 0
            ? [`Vencida · ${plural(f.diasDeAtraso, "día", "días")}`, "#F0A43A", "#F0A43A24"]
            : ["Pendiente", "#C9BFB1", "#221F1A"];
  return (
    <span
      className="inline-flex w-fit items-center whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold"
      style={{ color, background: fondo }}
    >
      {texto}
    </span>
  );
}

export function FacturasDelMes({
  mesActual,
  debito,
}: {
  mesActual: string;
  // Cuántas de las cuentas que pagan tienen el débito automático confirmado.
  debito: { activos: number; total: number };
}) {
  const [mes, setMes] = useState(mesActual);
  const [facturas, setFacturas] = useState<FacturaDelMes[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    void getFacturasDelMesAction(mes).then((r) => {
      if (!vigente) return;
      setFacturas(r.data ?? []);
      setError(r.error ?? "");
      setCargando(false);
    });
    return () => {
      vigente = false;
    };
  }, [mes]);

  const lista = facturas ?? [];
  const vigentes = lista.filter((f) => f.estado !== "ANULADA");
  const suma = (fs: FacturaDelMes[]) => fs.reduce((n, f) => n + f.importe, 0);
  const pagadas = vigentes.filter((f) => f.estado === "PAGADA");
  const sinVencer = vigentes.filter(FILTROS.pendientes);
  const atrasadas = vigentes.filter((f) => vencida(f) && f.diasDeAtraso <= DIAS_DE_GRACIA);
  const graves = vigentes.filter((f) => vencida(f) && f.diasDeAtraso > DIAS_DE_GRACIA);
  const facturado = suma(vigentes);
  const tramos = [suma(pagadas), suma(sinVencer), suma(atrasadas), suma(graves)];
  const visibles = lista.filter(FILTROS[filtro]);

  const cifras = [
    { rotulo: "Facturado", valor: facturado, pie: plural(vigentes.length, "factura", "facturas") },
    {
      rotulo: "Cobrado",
      valor: tramos[0],
      pie: `${facturado ? numero((tramos[0] / facturado) * 100) : 0} % · ${plural(pagadas.length, "factura", "facturas")}`,
      color: tramos[0] ? "#3DD68C" : undefined,
    },
    { rotulo: "Pendiente, sin vencer", valor: tramos[1], pie: plural(sinVencer.length, "factura", "facturas") },
    {
      rotulo: "Vencido",
      valor: tramos[2] + tramos[3],
      pie: graves.length
        ? `${plural(atrasadas.length + graves.length, "factura", "facturas")} · ${graves.length} ${graves.length === 1 ? "pasó" : "pasaron"} la gracia`
        : plural(atrasadas.length, "factura", "facturas"),
      color: atrasadas.length + graves.length ? "#F2725B" : undefined,
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-[#26231E] bg-[#161411]" aria-labelledby="facturas-mes">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#211F1B] px-5 py-4">
        <div>
          <h2 id="facturas-mes" className="text-[15px] font-semibold">
            Facturas que vencen en {nombreMes(mes)}
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            De todas las empresas. Débito automático en {debito.activos} de{" "}
            {plural(debito.total, "cuenta que paga", "cuentas que pagan")}.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {cargando && facturas && <DataLoading label="Cargando las facturas del mes…" className="w-auto" />}
          <button
            type="button"
            aria-label="Mes anterior"
            onClick={() => setMes((m) => moverMes(m, -1))}
            className="flex size-8 items-center justify-center rounded-md border border-[#2A2824] hover:border-[#3A362F] max-sm:size-11"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-[130px] text-center text-sm font-semibold first-letter:uppercase">{nombreMes(mes)}</span>
          {/* Hasta el mes que viene: las facturas se emiten antes de vencer. */}
          <button
            type="button"
            aria-label="Mes siguiente"
            disabled={mes >= moverMes(mesActual, 1)}
            onClick={() => setMes((m) => moverMes(m, 1))}
            className="flex size-8 items-center justify-center rounded-md border border-[#2A2824] hover:border-[#3A362F] disabled:opacity-40 max-sm:size-11"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="p-6 text-sm text-destructive">
          {error}
        </p>
      ) : !facturas ? (
        <FilasPlataformaCargando texto="Cargando las facturas del mes…" />
      ) : !lista.length ? (
        <p className="p-10 text-center text-sm text-muted-foreground">Ninguna factura vence en {nombreMes(mes)}.</p>
      ) : (
        <>
          <dl className="m-0 grid grid-cols-2 gap-px border-b border-[#211F1B] bg-[#211F1B] xl:grid-cols-4">
            {cifras.map((c) => (
              <div key={c.rotulo} className="flex flex-col gap-1.5 bg-[#161411] px-5 py-4">
                <dt className="text-[12.5px] text-muted-foreground">{c.rotulo}</dt>
                <dd className="m-0 font-mono text-[22px] font-medium leading-none tracking-[-0.03em] tabular-nums" style={{ color: c.color }}>
                  {corto(c.valor)}
                </dd>
                <dd className="m-0 text-[12px]" style={{ color: EJE }}>
                  {c.pie}
                </dd>
              </div>
            ))}
          </dl>
          {facturado > 0 && (
            <div className="space-y-2.5 border-b border-[#211F1B] px-5 py-4">
              <div
                className="flex h-2.5 overflow-hidden rounded-full bg-[#221F1A]"
                role="img"
                aria-label={TRAMOS.map((t, i) => `${t.label}: ${pesos(tramos[i])}`).join(", ")}
              >
                {TRAMOS.map((t, i) =>
                  tramos[i] ? (
                    <span key={t.id} style={{ flexGrow: tramos[i], background: t.color }} className="h-full min-w-1" />
                  ) : null,
                )}
              </div>
              <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-[12px]" style={{ color: EJE }}>
                {TRAMOS.map((t) => (
                  <li key={t.id} className="flex items-center gap-1.5">
                    <span aria-hidden className="size-2 rounded-full" style={{ background: t.color }} />
                    {t.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="px-5 pb-1 pt-4">
            <Segmentos
              etiqueta="Estado de la factura"
              redondo
              claro
              valor={filtro}
              onChange={setFiltro}
              opciones={[
                { id: "todas" as Filtro, label: "Todas", cuenta: lista.length },
                { id: "pendientes" as Filtro, label: "Sin vencer", cuenta: sinVencer.length },
                { id: "vencidas" as Filtro, label: "Vencidas", cuenta: atrasadas.length + graves.length },
                { id: "pagadas" as Filtro, label: "Pagadas", cuenta: pagadas.length },
              ]}
            />
          </div>
          <div className="overflow-x-auto">
            <div role="table" aria-label={`Facturas que vencen en ${nombreMes(mes)}`} className="min-w-[820px]">
              <div
                role="row"
                className="mt-3 grid h-[42px] grid-cols-[80px_minmax(0,1fr)_190px_150px_130px_120px] items-center gap-3 bg-[#12110E] px-5 text-[12px] font-medium"
                style={{ color: EJE }}
              >
                <span role="columnheader">Vence</span>
                <span role="columnheader">Empresa</span>
                <span role="columnheader">Período</span>
                <span role="columnheader">Estado</span>
                <span role="columnheader">Medio</span>
                <span role="columnheader" className="text-right">
                  Importe
                </span>
              </div>
              {!visibles.length && (
                <p className="border-t border-[#211F1B] px-5 py-8 text-center text-sm text-muted-foreground">
                  Ninguna factura en este estado.
                </p>
              )}
              {visibles.map((f) => (
                <div
                  key={f.id}
                  role="row"
                  className={`grid min-h-[52px] grid-cols-[80px_minmax(0,1fr)_190px_150px_130px_120px] items-center gap-3 border-t border-[#211F1B] px-5 py-2 text-[13.5px] ${f.estado === "ANULADA" ? "opacity-50" : ""}`}
                >
                  <span role="cell" className="font-mono tabular-nums">
                    {diaAR(f.desde, false)}
                  </span>
                  <span role="cell" className="min-w-0">
                    <Link href={`/admin/empresas/${f.empresaId}?tab=plan`} className="line-clamp-2 font-semibold hover:text-gm-yellow">
                      {f.empresa}
                    </Link>
                  </span>
                  <span role="cell" className="tabular-nums text-[12.5px] text-[#C9BFB1]">
                    {diaAR(f.desde, false)} al {diaAR(f.hasta)} · {plural(f.meses, "mes", "meses")}
                  </span>
                  <span role="cell">
                    <EstadoFactura f={f} />
                  </span>
                  <span role="cell" className="text-[12.5px]" style={f.medio ? undefined : { color: EJE }}>
                    {f.medio ? MEDIOS_PAGO[f.medio] : "—"}
                  </span>
                  <span role="cell" className={`text-right font-mono font-semibold tabular-nums ${f.estado === "ANULADA" ? "line-through" : ""}`}>
                    {pesos(f.importe)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
