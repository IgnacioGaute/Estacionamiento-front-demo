"use client";
import { DataLoading } from '@/components/ui/data-loading';

// Métricas de toda la plataforma. El período (7/30/90 días) y la empresa recalculan todo: KPIs,
// curva, medios de pago, mapa de calor, ranking y comparativa salen de la misma consulta, así que
// nunca muestran ventanas distintas a la vez.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import { ArrowUpRight, Download } from "lucide-react";
import { completar, eje } from "@/utils/serie-diaria";
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
import {
  Encabezado,
  Escenario,
  Pastilla,
  Pie,
  PuntoVivo,
  Rotulo,
  Segmentos,
  Selector,
  Tarjeta,
  Variacion,
  Avatar,
  EJE,
} from "@/components/plataforma/mono";
import {
  AMARILLO,
  CREMA,
  Anillo,
  Anillos,
  Chispa,
  Curva,
  Espejo,
  FilaTooltip,
  LeyendaNiveles,
  MapaCalor,
  Medidor,
  Pilares,
} from "@/components/plataforma/graficos";
import {
  DIAS_SEMANA,
  DIAS_SEMANA_LARGO,
  colorAvatar,
  corto,
  haceCuanto,
  iniciales,
  numero,
  plata,
  plural,
  resumir,
  variacion,
} from "@/components/plataforma/formato";
import { alertasDePlataforma } from "@/components/plataforma/alertas";

// Colores de medio de pago validados contra el fondo oscuro (lightness, croma y separación para
// daltonismo). El efectivo va en dorado y no en el amarillo de marca: el amarillo ya significa
// «este período» en toda la pantalla.
const METODOS: Record<string, { label: string; color: string }> = {
  CASH: { label: "Efectivo", color: "#BA8B0C" },
  TRANSFER: { label: "Transferencia", color: "#20A28F" },
  MERCADOPAGO: { label: "MercadoPago QR", color: "#7E86F0" },
  CHECK: { label: "Cheque", color: "#6E6457" },
};
const ORDEN_METODOS = ["CASH", "TRANSFER", "MERCADOPAGO", "CHECK"];
const DIAS_ISO = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const PERIODOS = [7, 30, 90];
const TIPOS_ABONO = [
  { id: "DIA", label: "Por día" },
  { id: "SEMANA", label: "Por semana" },
  { id: "MES", label: "Por mes" },
] as const;
// Los temas que clasifica el backend (src/assistant/temas.ts), en palabras del panel.
const TEMAS: Record<string, string> = {
  mercadopago: "MercadoPago",
  caja: "Caja y turnos",
  comprobantes: "Comprobantes",
  abonos: "Día, semana y mes",
  tarifas: "Tarifas y precios",
  cobros: "Cobros y saldos",
  vehiculos: "Vehículos y patentes",
  sistema: "Acceso y sistema",
  otros: "Otras consultas",
};

const etiqueta = (d: dayjs.Dayjs) => `${DIAS_SEMANA[d.day()]} ${d.format("DD/MM")}`;
const dos = (n: number) => String(n).padStart(2, "0");

// Rótulos del eje Y: «3 M», «1,5 M», «800 k».
function formatoEje(v: number) {
  if (v >= 1e6) {
    const m = v / 1e6;
    return `${numero(m, Number.isInteger(m) ? 0 : 1)} M`;
  }
  if (v >= 1e3) return `${numero(v / 1e3)} k`;
  return numero(v);
}

function puntos(fraccion: number | null) {
  if (fraccion === null) return "—";
  return `${fraccion >= 0 ? "+" : "−"}${numero(Math.abs(fraccion) * 100, 1)} pts`;
}

export function MetricasPanel() {
  const [dias, setDias] = useState(30);
  const [empresaId, setEmpresaId] = useState("");
  const [dual, setDual] = useState(true);
  const [celda, setCelda] = useState<{ d: number; h: number } | null>(null);
  const [empresas, setEmpresas] = useState<EmpresaConDetalle[]>([]);
  const [detalle, setDetalle] = useState<MetricsDetalle | null>(null);
  const [metrics, setMetrics] = useState<PlataformaMetrics | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [intento, setIntento] = useState(0);

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
  }, [dias, empresaId, intento]);

  const diasEje = useMemo(() => eje(dias), [dias]);

  // Las dos mitades se buscan sobre la unión, no cada una en su lista: el día del corte cae en
  // una o en otra según la hora, y buscándolo sólo en «anterior» el último punto de la línea de
  // comparación daba cero. Las fechas de las dos mitades no se pisan, así que unirlas es seguro.
  const porDia = [...(detalle?.serie ?? []), ...(detalle?.anterior ?? [])];
  const serie = completar(porDia, diasEje);
  const anterior = completar(porDia, diasEje, dias);
  const estadiasPorDia = [
    ...(detalle?.serieEstadias ?? []),
    ...(detalle?.serieEstadiasAnterior ?? []),
  ];
  const cierres = completar(estadiasPorDia, diasEje);
  const cierresPrevios = completar(estadiasPorDia, diasEje, dias);

  const total = detalle?.totales.actual ?? 0;
  const totalPrevio = detalle?.totales.anterior ?? 0;
  const estadias = detalle?.totales.estadias ?? 0;
  const estadiasPrevias = detalle?.totales.estadiasAnterior ?? 0;
  const ticket = estadias ? total / estadias : 0;
  const ticketPrevio = estadiasPrevias ? totalPrevio / estadiasPrevias : 0;

  const empresasVista = empresas.filter((e) => !empresaId || e.id === empresaId);
  const playas = (metrics?.playas ?? []).filter(
    (p) => !empresaId || p.empresaId === empresaId,
  );
  const abiertas = playas.reduce((n, p) => n + p.estadiasAbiertas, 0);
  const turnos = playas.reduce((n, p) => n + p.turnosAbiertos, 0);
  const playasConTurno = playas.filter((p) => p.turnosAbiertos > 0).length;
  const nombreEmpresa = new Map(empresas.map((e) => [e.id, e.nombre]));

  // Ticket promedio por día: sólo donde hubo cierres, para que el sparkline no baje a cero los
  // días sin salidas y muestre una caída que no pasó.
  const promedios = cierres
    .map((c, i) => (c ? serie[i] / c : null))
    .filter((v): v is number => v !== null);

  const kpis = [
    {
      label: "Cobrado",
      valor: corto(total),
      unidad: "ARS",
      destacado: true,
      delta: variacion(total, totalPrevio),
      chispa: resumir(serie),
      color: AMARILLO,
      pie: ["Período anterior", corto(totalPrevio)],
    },
    {
      label: "Estadías cerradas",
      valor: numero(estadias),
      unidad: "estadías",
      delta: variacion(estadias, estadiasPrevias),
      chispa: resumir(cierres),
      color: CREMA,
      pie: ["Promedio por día", numero(estadias / dias)],
    },
    {
      label: "Ticket promedio",
      valor: estadias ? plata(ticket) : "—",
      unidad: "por estadía",
      delta: ticketPrevio ? variacion(ticket, ticketPrevio) : null,
      chispa: resumir(promedios),
      color: CREMA,
      pie: ["Sin cortesías", ticketPrevio ? `antes ${plata(ticketPrevio)}` : "—"],
    },
    {
      label: "Estadías abiertas",
      valor: numero(abiertas),
      unidad: "ahora",
      vivo: true,
      chispa: (detalle?.abiertas24h ?? []).map((a) => a.abiertas),
      color: CREMA,
      pie: [
        "Turnos en curso",
        turnos ? `${turnos} en ${plural(playasConTurno, "playa", "playas")}` : "Ninguno",
      ],
    },
  ];

  const indicePico = serie.reduce((max, v, i) => (v > serie[max] ? i : max), 0);

  // Medios de pago.
  const ordenar = (lista: { metodo: string; total: number }[] = []) =>
    [...lista].sort(
      (a, b) =>
        (ORDEN_METODOS.indexOf(a.metodo) + 1 || 99) -
        (ORDEN_METODOS.indexOf(b.metodo) + 1 || 99),
    );
  const metodos = ordenar(detalle?.metodos).filter((m) => m.total > 0);
  const totalMetodos = metodos.reduce((n, m) => n + m.total, 0);
  const principal =
    metodos.find((m) => m.metodo === "CASH") ??
    [...metodos].sort((a, b) => b.total - a.total)[0];
  const totalMetodosPrevio = (detalle?.metodosAnterior ?? []).reduce(
    (n, m) => n + m.total,
    0,
  );
  const qr = metodos.find((m) => m.metodo === "MERCADOPAGO")?.total ?? 0;
  const fraccionQr = totalMetodos ? qr / totalMetodos : 0;
  const qrPrevio =
    detalle?.metodosAnterior?.find((m) => m.metodo === "MERCADOPAGO")?.total ?? 0;
  const cambioQr = totalMetodosPrevio
    ? fraccionQr - qrPrevio / totalMetodosPrevio
    : null;
  const conectadas = empresasVista.filter((e) => e.mercadoPago?.estado === "ACTIVA");

  // Mapa de calor: `dia` llega en ISODOW (1 = lunes).
  const matriz = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
  for (const h of detalle?.horas ?? []) matriz[h.dia - 1][h.hora] = h.entradas;
  const entradas = matriz.flat().reduce((n, v) => n + v, 0);
  let pico = { d: 0, h: 0 };
  matriz.forEach((fila, d) =>
    fila.forEach((v, h) => {
      if (v > matriz[pico.d][pico.h]) pico = { d, h };
    }),
  );
  const lectura = celda
    ? `${DIAS_ISO[celda.d]} ${dos(celda.h)}:00–${dos((celda.h + 1) % 24)}:00 · ${numero(matriz[celda.d][celda.h])} entradas`
    : "Pasá el cursor por la grilla";

  // Salud: lo mismo que cuenta la pantalla de empresas.
  const operando = empresasVista.filter(
    (e) => e.estado === "ACTIVA" && e.playas.length > 0,
  ).length;
  const conTarifas = playas.filter((p) => p.tieneTarifas).length;
  const operadores = empresasVista.flatMap((e) => e.usuarios.filter((u) => u.role === "USER"));
  const operadoresConPlaya = operadores.filter((u) => u.playaIds.length).length;
  const temas = alertasDePlataforma(empresasVista, metrics?.playas ?? []).length;

  const ranking = [...playas].sort((a, b) => b.cobrado - a.cobrado).slice(0, 6);
  const topeRanking = Math.max(1, ranking[0]?.cobrado ?? 0);

  // Estadías por día de la semana, este período contra el anterior.
  const porDiaActual = Array(7).fill(0) as number[];
  const porDiaPrevio = Array(7).fill(0) as number[];
  diasEje.forEach((d, i) => {
    porDiaActual[d.day()] += cierres[i];
    porDiaPrevio[d.day()] += cierresPrevios[i];
  });
  const mejorDia = porDiaActual.some(Boolean)
    ? porDiaActual.indexOf(Math.max(...porDiaActual))
    : -1;
  const pilares = [1, 2, 3, 4, 5, 6, 0].map((dw) => ({
    nombre: DIAS_SEMANA[dw],
    actual: porDiaActual[dw],
    anterior: porDiaPrevio[dw],
    destacado: dw === mejorDia,
    titulo: `${DIAS_SEMANA_LARGO[dw]}: ${numero(porDiaActual[dw])} estadías (antes ${numero(porDiaPrevio[dw])})`,
  }));

  // Tendencia de cada empresa: la suma de sus playas día por día.
  const empresaDePlaya = new Map((metrics?.playas ?? []).map((p) => [p.playaId, p.empresaId]));
  const seriePorEmpresa = new Map<string, { dia: string; total: number }[]>();
  for (const f of detalle?.seriePlayas ?? []) {
    const id = empresaDePlaya.get(f.playaId);
    if (!id) continue;
    const lista = seriePorEmpresa.get(id) ?? [];
    const dia = lista.find((x) => x.dia === f.dia);
    if (dia) dia.total += f.total;
    else lista.push({ dia: f.dia, total: f.total });
    seriePorEmpresa.set(id, lista);
  }
  const comparativa = (detalle?.empresas ?? []).slice(0, empresaId ? undefined : 8);
  const topeComparativa = Math.max(1, detalle?.empresas[0]?.cobrado ?? 0);

  // Movimiento de vehículos: entradas por día de apertura, salidas por día de cierre.
  const ingresos = completar(detalle?.entradas ?? [], diasEje);
  const ingresosPrevios = completar(detalle?.entradas ?? [], diasEje, dias);
  const egresos = completar(detalle?.salidas ?? [], diasEje);
  const egresosPrevios = completar(detalle?.salidas ?? [], diasEje, dias);
  const sumar = (v: number[]) => v.reduce((n, x) => n + x, 0);
  const totalIngresos = sumar(ingresos);
  const totalEgresos = sumar(egresos);
  const balance = totalIngresos - totalEgresos;

  // Estadías por día, semana o mes.
  const abonos = TIPOS_ABONO.map((t) => {
    const fila = detalle?.abonos?.find((a) => a.tipo === t.id);
    return {
      ...t,
      vendidos: fila?.vendidos ?? 0,
      anteriores: fila?.anteriores ?? 0,
      importe: fila?.importe ?? 0,
      pendientes: fila?.pendientes ?? 0,
      vigentes: fila?.vigentes ?? 0,
    };
  });
  const abonosVendidos = abonos.reduce((n, a) => n + a.vendidos, 0);
  const abonosPrevios = abonos.reduce((n, a) => n + a.anteriores, 0);
  const abonosVigentes = abonos.reduce((n, a) => n + a.vigentes, 0);
  const abonosPendientes = abonos.reduce((n, a) => n + a.pendientes, 0);
  const abonosImporte = abonos.reduce((n, a) => n + a.importe, 0);
  const topeAbonos = Math.max(1, ...abonos.map((a) => a.vendidos));

  // Lo que le preguntan al asistente.
  const temasAsistente = [...(detalle?.asistente?.temas ?? [])]
    .filter((t) => t.total > 0)
    .sort((a, b) => b.total - a.total);
  const preguntas = temasAsistente.reduce((n, t) => n + t.total, 0);
  const preguntasPrevias = (detalle?.asistente?.temas ?? []).reduce((n, t) => n + t.anterior, 0);
  const sinRespuesta = temasAsistente.reduce((n, t) => n + t.sinRespuesta, 0);
  const topeTemas = Math.max(1, temasAsistente[0]?.total ?? 0);

  // El CSV sale de lo que se está viendo: mismo período y misma empresa.
  function exportar() {
    const filas = [
      ["Empresa", "Cobrado", "Período anterior", "Estadías cerradas", "Ticket promedio"],
      ...(detalle?.empresas ?? []).map((e) => [
        e.nombre,
        String(e.cobrado),
        String(e.anterior),
        String(e.estadias),
        e.estadias ? String(Math.round(e.cobrado / e.estadias)) : "",
      ]),
    ];
    const csv = filas
      .map((f) => f.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `metricas-${dias}-dias.csv`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  if (cargando && !detalle && !error) return <DataLoading label="Cargando métricas…" className="p-4" />;

  return (
    <div className="space-y-5">
      {/* Si no entran en una línea, los controles bajan enteros: partir el título se ve peor. */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <div className="font-mono text-[11px] tracking-[0.14em] text-gm-yellow">
            PLATAFORMA · {diasEje[0].format("DD/MM")} → {diasEje[dias - 1].format("DD/MM/YYYY")}
          </div>
          <h1 className="mt-2 font-display text-[34px] font-semibold leading-none tracking-[0.01em] sm:whitespace-nowrap sm:text-[40px]">
            Métricas de la plataforma
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Segmentos
            etiqueta="Período"
            opciones={PERIODOS.map((d) => ({ id: d, label: `${d} días` }))}
            valor={dias}
            onChange={(d) => {
              setDias(d);
              setCelda(null);
            }}
          />
          <Selector
            etiqueta="EMPRESA"
            ariaLabel="Empresa"
            className="max-w-[300px]"
            valor={empresaId || "todas"}
            opciones={[
              { id: "todas", label: "Todas las empresas" },
              ...empresas.map((e) => ({ id: e.id, label: e.nombre })),
            ]}
            onChange={(id) => setEmpresaId(id === "todas" ? "" : id)}
          />
          <button
            type="button"
            onClick={exportar}
            disabled={!detalle?.empresas.length}
            className="flex h-[46px] items-center gap-2 rounded-[13px] border border-border bg-gm-surface px-4 text-[13.5px] font-semibold transition-colors hover:border-gm-line-strong hover:bg-gm-surface-2 disabled:opacity-50"
          >
            <Download className="size-4" />
            Exportar CSV
          </button>
          {cargando && (
            <DataLoading label="Actualizando métricas…" className="w-auto" />
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/60 p-4 text-sm">
          {error}
          <button
            type="button"
            onClick={() => setIntento((n) => n + 1)}
            className="h-9 rounded-lg border border-border px-3 font-semibold hover:bg-gm-surface-2"
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Tarjeta key={k.label} className="min-h-[190px] overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {k.label}
                </span>
                {/* El período ya está en el encabezado: se repite solo en el primero, así los
                    rótulos largos entran en una línea junto a su variación. */}
                {k.vivo ? (
                  <Pastilla tono="verde" vivo>
                    En vivo
                  </Pastilla>
                ) : (
                  k.destacado && <Pastilla>{dias} d</Pastilla>
                )}
              </div>
              {!k.vivo && <Variacion valor={k.delta ?? null} />}
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span
                className={`font-display text-[34px] font-semibold leading-none tabular-nums ${k.destacado ? "text-gm-yellow" : ""}`}
              >
                {k.valor}
              </span>
              <span className="text-[12.5px] text-muted-foreground">{k.unidad}</span>
            </div>
            <div className="mt-auto pt-3">
              <Chispa valores={k.chispa} color={k.color} />
            </div>
            <Pie izquierda={k.pie[0]} derecha={k.pie[1]} />
          </Tarjeta>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Tarjeta className="min-h-[380px] lg:col-span-2">
          <div className="flex items-center gap-2">
            <Rotulo>Entradas y salidas</Rotulo>
            <Pastilla>Espejo</Pastilla>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 sm:flex sm:gap-8">
            {[
              { label: "Entradas", valor: totalIngresos, previo: sumar(ingresosPrevios), color: AMARILLO },
              { label: "Salidas", valor: totalEgresos, previo: sumar(egresosPrevios), color: CREMA },
            ].map((d) => (
              <div key={d.label} className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span aria-hidden className="size-2 rounded-full" style={{ background: d.color }} />
                  {d.label}
                </div>
                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                  <span className="font-display text-[28px] font-semibold leading-none tabular-nums">
                    {numero(d.valor)}
                  </span>
                  <Variacion valor={variacion(d.valor, d.previo)} decimales={0} />
                </div>
              </div>
            ))}
            <div className="min-w-0 sm:border-l sm:border-border sm:pl-8">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <PuntoVivo />
                Adentro ahora
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-[28px] font-semibold leading-none tabular-nums">
                  {numero(abiertas)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {abonosVigentes ? `+ ${numero(abonosVigentes)} por día/sem/mes` : "vehículos"}
                </span>
              </div>
            </div>
          </div>
          <Escenario className="px-3 pt-3">
            <Espejo
              arriba={ingresos}
              abajo={egresos}
              ejeX={diasEje.map(etiqueta)}
              ariaLabel={`Entradas y salidas por día en los últimos ${dias} días: ${numero(totalIngresos)} entradas y ${numero(totalEgresos)} salidas`}
              tooltip={(i) => (
                <>
                  <div className="border-b border-border pb-1.5 font-mono text-[10.5px] text-muted-foreground">
                    {etiqueta(diasEje[i])}
                  </div>
                  <FilaTooltip color={AMARILLO} label="Entradas" valor={numero(ingresos[i])} />
                  <FilaTooltip color={CREMA} label="Salidas" valor={numero(egresos[i])} />
                </>
              )}
            />
          </Escenario>
          <Pie
            izquierda={
              balance === 0
                ? "Entró lo mismo que salió"
                : `Balance del período: ${balance > 0 ? "+" : "−"}${numero(Math.abs(balance))} ${balance > 0 ? "quedaron adentro" : "más salidas que entradas"}`
            }
            derecha={`${numero(totalIngresos / dias, totalIngresos / dias < 10 ? 1 : 0)} entradas por día`}
          />
        </Tarjeta>

        <Tarjeta className="min-h-[380px]">
          <Encabezado
            rotulo="Día · semana · mes"
            pastilla={<Pastilla>Estadías largas</Pastilla>}
            valor={numero(abonosVendidos)}
            unidad={`${abonosVendidos === 1 ? "vendida" : "vendidas"} en ${dias} días`}
            derecha={<Variacion valor={variacion(abonosVendidos, abonosPrevios)} decimales={0} />}
          />
          <Escenario className="flex flex-col justify-center gap-4 px-4 py-4">
            {abonos.map((a, i) => (
              <div key={a.id}>
                <div className="flex items-baseline justify-between gap-2 text-[13px]">
                  <span className="font-semibold">{a.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    <span className="font-display text-lg font-semibold text-foreground">{numero(a.vendidos)}</span>
                    {a.importe > 0 && <span className="ml-2 text-xs">{corto(a.importe)}</span>}
                  </span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-[#221F1A]">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${a.vendidos ? Math.max(3, (a.vendidos / topeAbonos) * 100) : 0}%`,
                      background: i === 0 ? AMARILLO : CREMA,
                    }}
                  />
                </div>
                <div className="mt-1 font-mono text-[10.5px]" style={{ color: EJE }}>
                  {a.vigentes ? `${numero(a.vigentes)} vigente${a.vigentes === 1 ? "" : "s"} ahora` : "Ninguna vigente"}
                  {a.pendientes > 0 && (
                    <span className="text-[#FF7A4D]"> · {numero(a.pendientes)} sin cobrar</span>
                  )}
                </div>
              </div>
            ))}
          </Escenario>
          <Pie
            izquierda={`${numero(abonosVigentes)} vigentes · ${numero(abonosPendientes)} sin cobrar`}
            derecha={corto(abonosImporte)}
          />
        </Tarjeta>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Tarjeta className="min-h-[410px] lg:col-span-2">
          <Encabezado
            rotulo="Cobrado por día"
            pastilla={<Pastilla>Curva</Pastilla>}
            valor={corto(total)}
            unidad={`en ${dias} días · vs ${corto(totalPrevio)} el período anterior`}
            derecha={
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden className="h-[3px] w-3.5 rounded-sm bg-gm-yellow" />
                    Este período
                  </span>
                  <span className={`flex items-center gap-1.5 ${dual ? "" : "opacity-35"}`}>
                    <span aria-hidden className="w-3.5 border-t-2 border-dashed border-muted-foreground" />
                    Anterior
                  </span>
                </div>
                <Segmentos
                  etiqueta="Comparación"
                  redondo
                  claro
                  opciones={[
                    { id: "dual", label: "Dual" },
                    { id: "simple", label: "Simple" },
                  ]}
                  valor={dual ? "dual" : "simple"}
                  onChange={(v) => setDual(v === "dual")}
                />
              </div>
            }
          />
          <Escenario className="pl-1.5 pr-[18px] pt-4">
            <Curva
              serie={serie}
              comparacion={dual ? anterior : null}
              ejeX={diasEje.map(etiqueta)}
              formatoEje={formatoEje}
              ariaLabel={`Cobrado por día en los últimos ${dias} días: ${corto(total)}, contra ${corto(totalPrevio)} el período anterior`}
              tooltip={(i) => {
                const cambio = variacion(serie[i], anterior[i]);
                return (
                  <>
                    <div className="border-b border-border pb-1.5 font-mono text-[10.5px] text-muted-foreground">
                      {etiqueta(diasEje[i])}
                      {dual ? ` · vs ${etiqueta(diasEje[i].subtract(dias, "day"))}` : ""}
                    </div>
                    <FilaTooltip color={AMARILLO} label="Cobrado" valor={plata(serie[i])} />
                    {dual && (
                      <FilaTooltip color="#A59B8D" hueco label="Anterior" valor={plata(anterior[i])} tenue />
                    )}
                    <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                      <span>{numero(cierres[i])} estadías</span>
                      {dual && cambio !== null && (
                        <span className={`font-bold ${cambio >= 0 ? "text-emerald-400" : "text-[#FF7A4D]"}`}>
                          {cambio >= 0 ? "↑" : "↓"} {numero(Math.abs(cambio), 1)}%
                        </span>
                      )}
                    </div>
                  </>
                );
              }}
            />
          </Escenario>
          <Pie
            izquierda={
              serie[indicePico]
                ? `Día más alto · ${DIAS_SEMANA_LARGO[diasEje[indicePico].day()].toLowerCase()} ${diasEje[indicePico].format("DD/MM")}`
                : "Sin cobros en el período"
            }
            derecha={serie[indicePico] ? plata(serie[indicePico]) : ""}
          />
        </Tarjeta>

        <Tarjeta className="min-h-[410px]">
          <Encabezado
            rotulo="Medios de pago"
            pastilla={<Pastilla>Anillo</Pastilla>}
            valor={corto(totalMetodos)}
            unidad={`cobrados por ${metodos.length} ${metodos.length === 1 ? "medio" : "medios"}`}
          />
          <Escenario className="flex flex-col items-center gap-3.5 p-4">
            {totalMetodos ? (
              <>
                <Anillo
                  ariaLabel={`Medios de pago: ${metodos
                    .map((m) => `${METODOS[m.metodo]?.label ?? m.metodo} ${Math.round((m.total / totalMetodos) * 100)}%`)
                    .join(", ")}`}
                  segmentos={metodos.map((m) => ({
                    id: m.metodo,
                    valor: m.total,
                    color: METODOS[m.metodo]?.color ?? "#6E6457",
                  }))}
                >
                  <span className="font-display text-[28px] font-semibold leading-none">
                    {principal ? `${Math.round((principal.total / totalMetodos) * 100)}%` : "—"}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {(METODOS[principal?.metodo ?? ""]?.label ?? "").toLowerCase()}
                  </span>
                </Anillo>
                <div className="flex w-full flex-col gap-2.5">
                  {metodos.map((m) => (
                    <div key={m.metodo} className="flex items-center gap-2.5 text-[13px]">
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-[3px]"
                        style={{ background: METODOS[m.metodo]?.color ?? "#6E6457" }}
                      />
                      <span className="flex-1">{METODOS[m.metodo]?.label ?? m.metodo}</span>
                      <span className="font-mono text-[11.5px]">
                        {Math.round((m.total / totalMetodos) * 100)}%
                      </span>
                      <span className="w-[72px] text-right text-xs tabular-nums text-muted-foreground">
                        {corto(m.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="m-auto text-sm text-muted-foreground">Sin cobros en el período.</p>
            )}
          </Escenario>
          <Pie izquierda="Solo el efectivo se arquea" derecha={`QR ${puntos(cambioQr)}`} />
        </Tarjeta>

        <Tarjeta className="min-h-[360px] lg:col-span-2">
          <Encabezado
            rotulo="Entradas por hora y día"
            pastilla={<Pastilla>7 × 24</Pastilla>}
            valor={numero(entradas)}
            unidad={`entradas en ${dias} días`}
            derecha={
              <div
                role="status"
                className="flex h-[30px] items-center rounded-full border border-border bg-background px-3 font-mono text-[11px]"
                style={{ color: celda ? "#F2ECE3" : EJE }}
              >
                {lectura}
              </div>
            }
          />
          <Escenario className="overflow-x-auto px-4 py-3">
            <MapaCalor matriz={matriz} dias={DIAS_ISO} seleccion={celda} onSeleccion={setCelda} />
          </Escenario>
          <Pie
            izquierda={entradas ? `Pico · ${DIAS_ISO[pico.d].toLowerCase()} ${dos(pico.h)} h` : "Sin entradas en el período"}
            derecha={<LeyendaNiveles />}
          />
        </Tarjeta>

        <Tarjeta className="min-h-[360px]">
          <Encabezado
            rotulo="Salud de la plataforma"
            pastilla={<Pastilla>Anillos</Pastilla>}
            valor={temas}
            unidad={temas === 1 ? "tema para revisar" : "temas para revisar"}
          />
          <Escenario className="flex items-center gap-3.5 p-3.5">
            <Anillos
              ariaLabel={`Empresas operando ${operando} de ${empresasVista.length}, playas con tarifas ${conTarifas} de ${playas.length}, operadores con playa ${operadoresConPlaya} de ${operadores.length}`}
              anillos={[
                { fraccion: empresasVista.length ? operando / empresasVista.length : 0, color: AMARILLO },
                { fraccion: playas.length ? conTarifas / playas.length : 0, color: CREMA },
                { fraccion: operadores.length ? operadoresConPlaya / operadores.length : 0, color: EJE },
              ]}
            />
            <div className="flex min-w-0 flex-col gap-3">
              {[
                { color: AMARILLO, label: "Empresas operando", n: operando, de: empresasVista.length },
                { color: CREMA, label: "Playas con tarifas", n: conTarifas, de: playas.length },
                { color: EJE, label: "Operadores con playa", n: operadoresConPlaya, de: operadores.length },
              ].map((a) => (
                <div key={a.label}>
                  <div className="flex items-center gap-[7px] text-xs text-muted-foreground">
                    <span aria-hidden className="size-[9px] rounded-[3px]" style={{ background: a.color }} />
                    {a.label}
                  </div>
                  <div className="mt-0.5 font-display text-[19px] font-semibold">
                    {a.n} <span className="text-[13px]" style={{ color: EJE }}>/ {a.de}</span>
                  </div>
                </div>
              ))}
            </div>
          </Escenario>
          <Pie
            izquierda="Tarifas · accesos · estado"
            derecha={
              <Link href="/admin/empresas?filtro=alertas" className="font-semibold text-gm-yellow hover:text-[#FFD84D]">
                Revisar →
              </Link>
            }
          />
        </Tarjeta>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Tarjeta className="min-h-[350px]">
          <Encabezado
            rotulo="Ranking de playas"
            pastilla={<Pastilla>Top {Math.max(1, ranking.length)}</Pastilla>}
            valor={ranking[0] ? corto(ranking[0].cobrado) : "—"}
            unidad={ranking[0] ? `${ranking[0].nombre} lidera` : "sin playas"}
          />
          <Escenario className="flex flex-col justify-between gap-2 px-3.5 py-3">
            {!ranking.length && <p className="m-auto text-sm text-muted-foreground">Sin playas para mostrar.</p>}
            {ranking.map((p, i) => (
              <div key={p.playaId} className="grid grid-cols-[20px_minmax(0,1fr)] items-center gap-2">
                <span className="font-mono text-[10.5px]" style={{ color: EJE }}>
                  {dos(i + 1)}
                </span>
                <div className="min-w-0">
                  <div className="flex justify-between gap-2 text-[12.5px]">
                    <span className="truncate">
                      <span className="font-semibold">{p.nombre}</span>
                      <span style={{ color: EJE }}> · {nombreEmpresa.get(p.empresaId) ?? ""}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-[#C9BFB1]">{corto(p.cobrado)}</span>
                  </div>
                  <div className="mt-[5px] h-[7px] rounded-full bg-[#221F1A]">
                    <div
                      className="h-[7px] rounded-full"
                      style={{
                        width: `${Math.max(2, (p.cobrado / topeRanking) * 100)}%`,
                        background: i === 0 ? AMARILLO : CREMA,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </Escenario>
          <Pie
            izquierda={`${plural(playas.length, "playa", "playas")} en total`}
            derecha={
              <Link href="/admin/empresas" className="font-semibold text-gm-yellow hover:text-[#FFD84D]">
                Ver todas →
              </Link>
            }
          />
        </Tarjeta>

        <Tarjeta className="min-h-[350px]">
          <Encabezado
            rotulo="Estadías por día"
            pastilla={<Pastilla>Pilares</Pastilla>}
            valor={mejorDia >= 0 ? DIAS_SEMANA_LARGO[mejorDia] : "—"}
            unidad={mejorDia >= 0 ? "es el día más fuerte" : "sin estadías cerradas"}
          />
          <Escenario className="px-3 pb-2.5 pt-3.5">
            <Pilares columnas={pilares} />
          </Escenario>
          <Pie
            izquierda={
              <span className="flex items-center gap-3 text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="size-2 rounded-full" style={{ background: CREMA }} />
                  Este período
                </span>
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="size-2 rounded-full bg-[#3A342B]" />
                  Anterior
                </span>
              </span>
            }
            derecha={`${numero(estadias)} estadías`}
          />
        </Tarjeta>

        <Tarjeta className="min-h-[350px]">
          <Encabezado
            rotulo="Cobros con QR"
            pastilla={<Pastilla tono="lavanda">MercadoPago</Pastilla>}
            valor={corto(qr)}
            unidad="cobrados con QR"
          />
          <Escenario className="flex flex-col items-center px-4 pb-3.5 pt-2.5">
            <Medidor
              fraccion={fraccionQr}
              color="#7E86F0"
              ariaLabel={`Cobros con QR: ${numero(fraccionQr * 100, 1)}% de lo cobrado`}
            >
              <span className="font-display text-[30px] font-semibold leading-none">
                {numero(fraccionQr * 100, 1)}%
              </span>
              <span className="font-mono text-[10.5px] text-muted-foreground">del cobrado</span>
            </Medidor>
            <div className="mt-auto w-full">
              <div className="mb-[7px] flex justify-between text-xs text-muted-foreground">
                <span>Empresas conectadas</span>
                <span className="font-semibold text-foreground">
                  {conectadas.length} de {empresasVista.length}
                </span>
              </div>
              {empresasVista.length <= 30 ? (
                <div
                  className="grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${Math.max(1, empresasVista.length)}, minmax(0, 1fr))` }}
                >
                  {empresasVista.map((e) => {
                    const ok = e.mercadoPago?.estado === "ACTIVA";
                    return (
                      <span
                        key={e.id}
                        title={`${e.nombre}: ${ok ? "conectada" : "sin conectar"}`}
                        className="h-2 rounded-full"
                        style={{ background: ok ? "#7E86F0" : "#2B2620" }}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="h-2 rounded-full bg-[#2B2620]">
                  <div
                    className="h-2 rounded-full bg-[#7E86F0]"
                    style={{ width: `${(conectadas.length / empresasVista.length) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </Escenario>
          <Pie izquierda="vs período anterior" derecha={puntos(cambioQr)} />
        </Tarjeta>
      </div>

      <Tarjeta className={preguntas ? "min-h-[340px]" : ""}>
        <Encabezado
          rotulo="Lo que le preguntan al asistente"
          pastilla={<Pastilla tono="lavanda">IA</Pastilla>}
          valor={numero(preguntas)}
          unidad={`${preguntas === 1 ? "pregunta" : "preguntas"} en ${dias} días`}
          derecha={
            <div className="flex items-center gap-2">
              {sinRespuesta > 0 && (
                <span
                  title="Preguntas que el asistente no pudo contestar"
                  className="rounded-full bg-[#FF7A4D]/[0.14] px-2.5 py-[3px] text-[11.5px] font-bold text-[#FF7A4D]"
                >
                  {numero(sinRespuesta)} sin respuesta
                </span>
              )}
              {preguntas > 0 && (
                <Variacion valor={variacion(preguntas, preguntasPrevias)} decimales={0} />
              )}
            </div>
          }
        />
        {!preguntas ? (
          <Escenario className="flex flex-none items-center justify-center p-8">
            <p className="max-w-md text-center text-sm text-muted-foreground">
              Todavía no hay preguntas en el período. Cada consulta al asistente se registra con
              su tema, así que acá vas a ver qué se pregunta más y qué no sabe contestar.
            </p>
          </Escenario>
        ) : (
          <div className="mt-3.5 grid flex-1 gap-4 lg:grid-cols-3">
            <div className="flex flex-col rounded-2xl border border-[#26221C] bg-background p-4">
              <span className="font-mono text-[10.5px] tracking-[0.12em]" style={{ color: EJE }}>
                POR TEMA
              </span>
              <div className="mt-3 flex flex-1 flex-col gap-3">
                {temasAsistente.slice(0, 6).map((t, i) => (
                  <div key={t.tema}>
                    <div className="flex justify-between gap-2 text-[12.5px]">
                      <span className="font-semibold">{TEMAS[t.tema] ?? t.tema}</span>
                      <span className="tabular-nums text-[#C9BFB1]">
                        {numero(t.total)}{" "}
                        <span style={{ color: EJE }}>· {Math.round((t.total / preguntas) * 100)}%</span>
                      </span>
                    </div>
                    <div className="mt-[5px] h-[7px] rounded-full bg-[#221F1A]">
                      <div
                        className="h-[7px] rounded-full"
                        style={{
                          width: `${Math.max(3, (t.total / topeTemas) * 100)}%`,
                          background: i === 0 ? AMARILLO : CREMA,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col rounded-2xl border border-[#26221C] bg-background p-4">
              <span className="font-mono text-[10.5px] tracking-[0.12em]" style={{ color: EJE }}>
                SE REPITEN
              </span>
              {detalle?.asistente?.frecuentes.length ? (
                <ol className="mt-3 flex flex-col gap-2.5">
                  {detalle.asistente.frecuentes.map((f) => (
                    <li key={f.pregunta} className="flex items-start gap-2.5">
                      <span className="mt-0.5 shrink-0 rounded-full bg-gm-yellow/[0.14] px-2 py-0.5 font-mono text-[11px] font-semibold text-gm-yellow">
                        ×{f.veces}
                      </span>
                      <span className="min-w-0">
                        <span className="line-clamp-2 text-[13px] leading-snug">«{f.pregunta}»</span>
                        <span className="font-mono text-[10.5px]" style={{ color: EJE }}>
                          {TEMAS[f.tema] ?? f.tema}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="m-auto py-6 text-center text-[13px] text-muted-foreground">
                  Ninguna pregunta se repitió todavía.
                </p>
              )}
            </div>

            <div className="flex flex-col rounded-2xl border border-[#26221C] bg-background p-4">
              <span className="font-mono text-[10.5px] tracking-[0.12em]" style={{ color: EJE }}>
                ÚLTIMAS
              </span>
              <ol className="mt-3 flex flex-col gap-2.5">
                {(detalle?.asistente?.recientes ?? []).map((r) => (
                  <li key={`${r.fecha}-${r.pregunta}`} className="min-w-0">
                    <span className="line-clamp-2 text-[13px] leading-snug">«{r.pregunta}»</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 font-mono text-[10.5px]" style={{ color: EJE }}>
                      {!r.respondida && <span className="text-[#FF7A4D]">sin respuesta ·</span>}
                      {r.empresa} · {r.playa} · {haceCuanto(r.fecha)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </Tarjeta>

      <section className="overflow-hidden rounded-[22px] border border-border bg-gm-surface">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2E2A23] px-5 py-[18px]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Comparativa
              </span>
              <Pastilla>{dias} días</Pastilla>
            </div>
            <h2 className="mt-1.5 font-display text-2xl font-semibold leading-tight">
              Empresas por cobrado
            </h2>
          </div>
          <Link
            href="/admin/empresas"
            className="flex h-[38px] items-center gap-2 rounded-[11px] border border-border px-3.5 text-[13px] font-semibold transition-colors hover:border-gm-line-strong hover:bg-gm-surface-2"
          >
            Ver las {empresas.length} empresas
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <div role="table" aria-label="Comparativa por empresa" className="min-w-[1000px]">
            <div
              role="row"
              className="grid h-[42px] grid-cols-[56px_minmax(0,1fr)_140px_110px_150px_110px_120px_180px] items-center bg-[#15120E] pl-3 pr-5 font-mono text-[10.5px] tracking-[0.1em]"
              style={{ color: EJE }}
            >
              <span role="columnheader" className="pl-2">#</span>
              <span role="columnheader">EMPRESA</span>
              <span role="columnheader">COBRADO</span>
              <span role="columnheader">VS ANTERIOR</span>
              <span role="columnheader">TENDENCIA</span>
              <span role="columnheader">ESTADÍAS</span>
              <span role="columnheader">TICKET PROM.</span>
              <span role="columnheader">PARTICIPACIÓN</span>
            </div>
            {!comparativa.length && (
              <p className="border-t border-[#2B2620] px-5 py-10 text-center text-sm text-muted-foreground">
                Sin cobros en el período.
              </p>
            )}
            {comparativa.map((e, i) => {
              const empresa = empresas.find((x) => x.id === e.empresaId);
              const tendencia = completar(seriePorEmpresa.get(e.empresaId) ?? [], diasEje);
              const parte = total ? (e.cobrado / total) * 100 : 0;
              return (
                <Link
                  key={e.empresaId}
                  href={`/admin/empresas/${e.empresaId}`}
                  role="row"
                  className="grid h-[60px] grid-cols-[56px_minmax(0,1fr)_140px_110px_150px_110px_120px_180px] items-center border-t border-[#2B2620] pl-3 pr-5 text-[13.5px] transition-colors hover:bg-[#1E1A14]"
                >
                  <span role="cell" className="pl-2 font-mono text-[11px]" style={{ color: EJE }}>
                    {dos(i + 1)}
                  </span>
                  <span role="cell" className="flex min-w-0 items-center gap-3">
                    <Avatar texto={iniciales(e.nombre)} fondo={colorAvatar(e.empresaId)} className="size-[34px] rounded-[10px] text-[13px]" />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate font-semibold">{e.nombre}</span>
                      <span className="text-xs" style={{ color: EJE }}>
                        {empresa
                          ? `${plural(empresa.playas.length, "playa", "playas")} · ${empresa.estado === "ACTIVA" ? "activa" : "suspendida"}`
                          : ""}
                      </span>
                    </span>
                  </span>
                  <span role="cell" className="font-semibold tabular-nums">{corto(e.cobrado)}</span>
                  <span role="cell">
                    <Variacion valor={variacion(e.cobrado, e.anterior)} decimales={0} />
                  </span>
                  <span role="cell">
                    <Chispa valores={resumir(tendencia, 16)} ancho={120} alto={30} color={i === 0 ? AMARILLO : CREMA} />
                  </span>
                  <span role="cell" className="tabular-nums text-[#C9BFB1]">{numero(e.estadias)}</span>
                  <span role="cell" className="tabular-nums text-[#C9BFB1]">
                    {e.estadias ? plata(e.cobrado / e.estadias) : "—"}
                  </span>
                  <span role="cell" className="flex items-center gap-2.5">
                    <span className="h-[7px] w-[110px] rounded-full bg-[#221F1A]">
                      <span
                        className="block h-[7px] rounded-full"
                        style={{
                          width: `${Math.max(2, (e.cobrado / topeComparativa) * 100)}%`,
                          background: i === 0 ? AMARILLO : CREMA,
                        }}
                      />
                    </span>
                    <span className="font-mono text-[11px] text-[#C9BFB1]">{numero(parte, 1)}%</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
