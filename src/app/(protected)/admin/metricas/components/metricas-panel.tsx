"use client";

// Métricas de toda la plataforma. Los gráficos son SVG dibujados acá: son tres formas simples y
// no justifican sumar una librería de charts al bundle del panel.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chispa, completar, eje } from "@/utils/serie-diaria";
import {
  EmpresaConDetalle,
  MetricsDetalle,
  PlataformaMetrics,
} from "@/types/tenancy.type";
import {
  getEmpresasAction,
  getMetricsDetalleAction,
  getPlataformaMetricsAction,
} from "@/actions/tenancy/tenancy.action";

const plata = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const METODOS: Record<string, { label: string; color: string }> = {
  CASH: { label: "Efectivo", color: "hsl(var(--gm-yellow))" },
  TRANSFER: { label: "Transferencia", color: "#45B8A8" },
  CHECK: { label: "Cheque", color: "#8E9BFF" },
};

function camino(valores: number[], tope: number, ancho: number, alto: number) {
  if (!valores.length) return "";
  const x = (i: number) =>
    46 + (i / Math.max(1, valores.length - 1)) * (ancho - 56);
  const y = (v: number) => 12 + (1 - v / tope) * (alto - 38);
  return valores
    .map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
}

export function MetricasPanel() {
  const [dias, setDias] = useState(30);
  const [empresaId, setEmpresaId] = useState("");
  const [empresas, setEmpresas] = useState<EmpresaConDetalle[]>([]);
  const [detalle, setDetalle] = useState<MetricsDetalle | null>(null);
  const [metrics, setMetrics] = useState<PlataformaMetrics | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    void getEmpresasAction().then((r) => setEmpresas(r.empresas ?? []));
  }, []);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    void Promise.all([
      getMetricsDetalleAction(dias, empresaId || undefined),
      getPlataformaMetricsAction(dias),
    ]).then(([d, m]) => {
      if (!activo) return;
      if (d.detalle) {
        setDetalle(d.detalle);
        setError("");
      } else setError(d.error ?? "No se pudieron cargar las métricas.");
      setMetrics(m.metrics ?? null);
      setCargando(false);
    });
    return () => {
      activo = false;
    };
  }, [dias, empresaId]);

  const diasEje = eje(dias);
  // Las dos mitades se buscan sobre la unión, no cada una en su lista: el día del corte cae en
  // una o en otra según la hora, y buscándolo sólo en «anterior» el último punto de la línea de
  // comparación daba cero. Las fechas de las dos mitades no se pisan, así que unirlas es seguro.
  const porDia = [...(detalle?.serie ?? []), ...(detalle?.anterior ?? [])];
  const serie = completar(porDia, diasEje);
  const anterior = completar(porDia, diasEje, dias);
  const cierres = completar(detalle?.serieEstadias ?? [], diasEje);
  const tope = Math.max(1, ...serie, ...anterior) * 1.12;
  const totalActual = detalle?.totales.actual ?? 0;
  const totalAnterior = detalle?.totales.anterior ?? 0;
  const varia = (actual: number, previo: number) =>
    previo ? Math.round(((actual - previo) / previo) * 100) : null;
  const variacion = varia(totalActual, totalAnterior);
  const estadias = detalle?.totales.estadias ?? 0;
  const estadiasAnterior = detalle?.totales.estadiasAnterior ?? 0;
  // Ticket promedio por día: sólo donde hubo cierres, para que el sparkline no baje a cero los
  // días sin salidas y muestre una caída que no pasó.
  const promedios = cierres.map((c, i) => (c ? serie[i] / c : 0));

  // Cinco marcas en el eje, como el resto de los gráficos del panel: extremos y cuartos.
  const marcasX = [
    0,
    Math.floor((dias - 1) / 4),
    Math.floor((dias - 1) / 2),
    Math.floor(((dias - 1) * 3) / 4),
    dias - 1,
  ].filter((i, pos, todas) => todas.indexOf(i) === pos);

  const playasFiltradas = (metrics?.playas ?? []).filter(
    (p) => !empresaId || p.empresaId === empresaId,
  );
  const ranking = [...playasFiltradas]
    .sort((a, b) => b.cobrado - a.cobrado)
    .slice(0, 6);
  const topeRanking = Math.max(1, ...ranking.map((r) => r.cobrado));

  const totalMetodos = (detalle?.metodos ?? []).reduce(
    (n, m) => n + m.total,
    0,
  );
  const maxHora = Math.max(1, ...(detalle?.horas ?? []).map((h) => h.entradas));
  const entradasDe = (dia: number, hora: number) =>
    detalle?.horas.find((h) => h.dia === dia && h.hora === hora)?.entradas ?? 0;

  const ANCHO = 860;
  const ALTO = 240;

  // Arcos del anillo de medios de pago: el perímetro se reparte según el peso de cada uno.
  const PERIMETRO = 2 * Math.PI * 46;
  let recorrido = 0;
  const segmentos = (detalle?.metodos ?? [])
    .slice()
    .sort((a, b) => b.total - a.total)
    .map((m) => {
      const info = METODOS[m.metodo] ?? { label: m.metodo, color: "#A59B8D" };
      const pct = Math.round((m.total / Math.max(1, totalMetodos)) * 100);
      const largo = (m.total / Math.max(1, totalMetodos)) * PERIMETRO;
      const seg = {
        metodo: m.metodo,
        total: m.total,
        pct,
        label: info.label,
        color: info.color,
        dash: `${largo.toFixed(1)} ${(PERIMETRO - largo).toFixed(1)}`,
        offset: -recorrido,
      };
      recorrido += largo;
      return seg;
    });
  const mayor = segmentos[0] ?? { pct: 0, label: "—" };

  // El CSV sale de lo que se está viendo: mismo período y misma empresa.
  function exportar() {
    const filas = [
      ["Empresa", "Cobrado", "Período anterior", "Estadías cerradas"],
      ...(detalle?.empresas ?? []).map((e) => [
        e.nombre,
        String(e.cobrado),
        String(e.anterior),
        String(e.estadias),
      ]),
    ];
    const csv = filas
      .map((f) => f.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `metricas-${dias}-dias.csv`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="group"
          aria-label="Período"
          className="flex gap-1 rounded-xl border border-border bg-gm-surface-2 p-1"
        >
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={dias === d}
              onClick={() => setDias(d)}
              className={`h-9 rounded-lg px-4 text-sm font-semibold transition-colors ${
                dias === d
                  ? "bg-gm-yellow text-gm-ink"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {d} días
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2">
          <span className="sr-only">Empresa</span>
          <select
            value={empresaId}
            onChange={(e) => setEmpresaId(e.target.value)}
            className="h-11 rounded-xl border border-border bg-gm-surface-2 px-3 text-sm"
          >
            <option value="">Todas las empresas</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="outline"
          className="h-11"
          disabled={!detalle?.empresas.length}
          onClick={exportar}
        >
          <Download className="mr-2 size-4" />
          Exportar
        </Button>
        {cargando && (
          <span role="status" className="text-sm text-muted-foreground">
            Actualizando…
          </span>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-destructive p-4 text-sm">
          {error}
          <Button
            variant="outline"
            className="ml-3"
            onClick={() => setDias((d) => d)}
          >
            Reintentar
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: `Cobrado · ${dias} días`,
            valor: plata.format(totalActual),
            pie:
              variacion === null
                ? "Sin período anterior para comparar"
                : `vs ${plata.format(totalAnterior)} el período anterior`,
            delta: variacion,
            destacado: true,
            spark: serie,
            color: "hsl(var(--gm-yellow))",
          },
          {
            label: "Estadías cerradas",
            valor: estadias.toLocaleString("es-AR"),
            pie: estadiasAnterior
              ? `vs ${estadiasAnterior.toLocaleString("es-AR")} el período anterior`
              : `Promedio ${Math.round(estadias / dias)} por día`,
            delta: varia(estadias, estadiasAnterior),
            spark: cierres,
            color: "#45B8A8",
          },
          {
            label: "Ticket promedio",
            valor: estadias
              ? plata.format(Math.round(totalActual / estadias))
              : "—",
            pie: "Por estadía cobrada",
            spark: promedios,
            color: "#8E9BFF",
          },
          {
            label: "Estadías abiertas",
            valor: String(
              playasFiltradas.reduce((n, p) => n + p.estadiasAbiertas, 0),
            ),
            pie: `${playasFiltradas.reduce((n, p) => n + p.turnosAbiertos, 0)} turnos en curso`,
            spark: [],
            color: "#45B8A8",
          },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-border bg-gm-surface-2 p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">{k.label}</span>
              {typeof k.delta === "number" && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    k.delta >= 0
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-gm-orange/15 text-gm-orange"
                  }`}
                >
                  {k.delta >= 0 ? "+" : ""}
                  {k.delta}%
                </span>
              )}
            </div>
            <div
              className={`mt-3 font-display text-[34px] font-semibold leading-none tabular-nums ${k.destacado ? "text-gm-yellow" : ""}`}
            >
              {k.valor}
            </div>
            {k.spark.length > 1 && (
              <svg
                viewBox="0 0 220 40"
                preserveAspectRatio="none"
                className="mt-3 block h-8 w-full"
                aria-hidden
              >
                <path
                  d={chispa(k.spark)}
                  fill="none"
                  stroke={k.color}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            )}
            <div className="mt-2 text-xs text-muted-foreground">{k.pie}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-gm-surface-2 p-5 lg:col-span-2">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold tracking-tight">Cobrado por día</h2>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 rounded bg-gm-yellow" />
                Este período
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 rounded bg-muted-foreground" />
                Anterior
              </span>
            </div>
          </div>
          <svg
            viewBox={`0 0 ${ANCHO} ${ALTO}`}
            className="mt-4 block h-60 w-full"
            role="img"
            aria-label={`Cobrado por día en los últimos ${dias} días`}
          >
            {[0, 0.25, 0.5, 0.75, 1].map((f) => {
              const valor = tope * (1 - f);
              const y = 12 + f * (ALTO - 38);
              return (
                <g key={f}>
                  <line
                    x1="46"
                    y1={y}
                    x2={ANCHO - 10}
                    y2={y}
                    stroke="hsl(var(--border))"
                    strokeWidth="1"
                  />
                  <text
                    x="38"
                    y={y + 4}
                    textAnchor="end"
                    fill="hsl(var(--muted-foreground))"
                    fontSize="11"
                  >
                    {valor >= 1000 ? `${Math.round(valor / 1000)}k` : "0"}
                  </text>
                </g>
              );
            })}
            <path
              d={camino(anterior, tope, ANCHO, ALTO)}
              fill="none"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <path
              d={`${camino(serie, tope, ANCHO, ALTO)} L${ANCHO - 10},${ALTO - 26} L46,${ALTO - 26} Z`}
              fill="hsl(var(--gm-yellow) / 0.14)"
              stroke="none"
            />
            <path
              d={camino(serie, tope, ANCHO, ALTO)}
              fill="none"
              stroke="hsl(var(--gm-yellow))"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Fechas del eje: sin ellas no se sabe si el pico fue ayer o hace tres semanas. */}
            {marcasX.map((i) => (
              <text
                key={i}
                x={46 + (i / Math.max(1, dias - 1)) * (ANCHO - 56)}
                y={ALTO - 6}
                textAnchor={i === 0 ? "start" : i === dias - 1 ? "end" : "middle"}
                fill="hsl(var(--muted-foreground))"
                fontSize="11"
              >
                {diasEje[i]?.format("DD/MM")}
              </text>
            ))}
          </svg>
        </div>

        <div className="rounded-2xl border border-border bg-gm-surface-2 p-6">
          <h2 className="text-[15px] font-semibold tracking-tight">Cómo pagan</h2>
          {!totalMetodos && (
            <p className="mt-3 text-sm text-muted-foreground">
              Sin cobros en el período.
            </p>
          )}
          {!!totalMetodos && (
            <div className="mt-3">
              <div className="flex items-center gap-5">
                {/* Anillo: cada medio es un arco del mismo círculo, corrido por el largo de los
                    anteriores. En el centro, el que más pesa. */}
                <svg
                  viewBox="0 0 120 120"
                  className="size-[132px] shrink-0"
                  role="img"
                  aria-label="Distribución por medio de pago"
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="46"
                    fill="none"
                    stroke="hsl(var(--gm-surface-3))"
                    strokeWidth="18"
                  />
                  {segmentos.map((s) => (
                    <circle
                      key={s.metodo}
                      cx="60"
                      cy="60"
                      r="46"
                      fill="none"
                      stroke={s.color}
                      strokeWidth="18"
                      strokeDasharray={s.dash}
                      strokeDashoffset={s.offset}
                      transform="rotate(-90 60 60)"
                    />
                  ))}
                  <text
                    x="60"
                    y="57"
                    textAnchor="middle"
                    className="fill-foreground font-display"
                    fontSize="19"
                    fontWeight="700"
                  >
                    {mayor.pct}%
                  </text>
                  <text
                    x="60"
                    y="73"
                    textAnchor="middle"
                    className="fill-muted-foreground"
                    fontSize="10"
                  >
                    {mayor.label.toLowerCase()}
                  </text>
                </svg>
                <div className="min-w-0 space-y-3">
                  {segmentos.map((s) => (
                    <div key={s.metodo}>
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className="size-2.5 shrink-0 rounded-sm"
                          style={{ background: s.color }}
                        />
                        {s.label}
                      </div>
                      <div className="ml-[18px] text-sm tabular-nums text-muted-foreground">
                        {s.pct}% · {plata.format(s.total)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                El efectivo es lo único que se arquea en caja. Transferencias y
                cheques quedan fuera del conteo del turno.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-gm-surface-2 p-5 lg:col-span-2">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold tracking-tight">Entradas por hora y día</h2>
            <span className="text-xs text-muted-foreground">
              Acumulado de los últimos {dias} días
            </span>
          </div>
          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="ml-10 grid gap-[3px] text-[10px] text-muted-foreground" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
                {Array.from({ length: 24 }, (unused, h) => (
                  <div key={h} className="text-center">
                    {h % 3 === 0 ? h : ""}
                  </div>
                ))}
              </div>
              <div className="mt-1 space-y-[3px]">
                {DIAS_SEMANA.map((nombre, i) => (
                  <div key={nombre} className="flex items-center gap-2">
                    <span className="w-8 text-[11px] text-muted-foreground">
                      {nombre}
                    </span>
                    <div className="grid flex-1 gap-[3px]" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
                      {Array.from({ length: 24 }, (unused, h) => {
                        const entradas = entradasDe(i + 1, h);
                        const intensidad = entradas / maxHora;
                        return (
                          <div
                            key={h}
                            title={`${nombre} ${h}:00 — ${entradas} entradas`}
                            className="h-5 rounded"
                            style={{
                              background: entradas
                                ? `hsl(var(--gm-yellow) / ${(0.14 + intensidad * 0.86).toFixed(2)})`
                                : "hsl(var(--gm-surface-3))",
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
            Menos
            <span className="h-2.5 w-4 rounded bg-gm-surface-3" />
            <span className="h-2.5 w-4 rounded bg-gm-yellow/30" />
            <span className="h-2.5 w-4 rounded bg-gm-yellow/60" />
            <span className="h-2.5 w-4 rounded bg-gm-yellow" />
            Más
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-gm-surface-2 p-6">
          <h2 className="text-[15px] font-semibold tracking-tight">Ranking de playas</h2>
          <div className="mt-4 space-y-3">
            {!ranking.length && (
              <p className="text-sm text-muted-foreground">
                Sin playas para mostrar.
              </p>
            )}
            {ranking.map((p, i) => (
              <div key={p.playaId} className="flex items-center gap-3">
                <span className="w-5 text-sm text-muted-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.nombre}</div>
                  <div className="mt-1 h-1.5 rounded-full bg-gm-surface-3">
                    <div
                      className={`h-1.5 rounded-full ${i === 0 ? "bg-gm-yellow" : "bg-gm-yellow-deep/60"}`}
                      style={{
                        width: `${Math.max(2, Math.round((p.cobrado / topeRanking) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                  {plata.format(p.cobrado)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-gm-surface-2">
        <div className="border-b border-border p-5">
          <h2 className="text-[15px] font-semibold tracking-tight">
            Comparativa por empresa
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-5 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">Cobrado</th>
                <th className="px-4 py-3 font-medium">vs. anterior</th>
                <th className="px-4 py-3 font-medium">Estadías cerradas</th>
                <th className="px-4 py-3 font-medium">Ticket promedio</th>
                <th className="px-5 py-3 font-medium">Participación</th>
              </tr>
            </thead>
            <tbody>
              {!detalle?.empresas.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-muted-foreground"
                  >
                    Sin cobros en el período.
                  </td>
                </tr>
              )}
              {(detalle?.empresas ?? []).map((e) => {
                const delta = e.anterior
                  ? Math.round(((e.cobrado - e.anterior) / e.anterior) * 100)
                  : null;
                const parte = Math.round(
                  (e.cobrado / Math.max(1, totalActual)) * 100,
                );
                return (
                  <tr key={e.empresaId} className="border-t border-border">
                    <td className="px-5 py-4 font-semibold">
                      <Link
                        href={`/admin/empresas/${e.empresaId}`}
                        className="hover:text-gm-yellow"
                      >
                        {e.nombre}
                      </Link>
                    </td>
                    <td className="px-4 py-4 tabular-nums">
                      {plata.format(e.cobrado)}
                    </td>
                    <td className="px-4 py-4">
                      {delta === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            delta >= 0
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-gm-orange/15 text-gm-orange"
                          }`}
                        >
                          {delta >= 0 ? "+" : ""}
                          {delta}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 tabular-nums">{e.estadias}</td>
                    <td className="px-4 py-4 tabular-nums">
                      {e.estadias
                        ? plata.format(Math.round(e.cobrado / e.estadias))
                        : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-28 rounded-full bg-gm-surface-3">
                          <div
                            className="h-1.5 rounded-full bg-gm-yellow"
                            style={{ width: `${Math.max(2, parte)}%` }}
                          />
                        </div>
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {parte}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
