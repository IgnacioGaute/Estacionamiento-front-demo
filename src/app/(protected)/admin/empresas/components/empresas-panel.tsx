"use client";

// El listado de empresas: dónde está el volumen, qué hay que resolver y la tabla con estado,
// playas, usuarios, cobrado, última operación y MercadoPago de cada una.

import { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  Building2,
  Check,
  ChevronRight,
  Clock,
  Download,
  MapPin,
  Search,
  Tag,
  Users,
  UserX,
} from "lucide-react";
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
  Avatar,
  EJE,
  Encabezado,
  Escenario,
  EstadoEmpresa,
  Leyenda,
  Pastilla,
  Pie,
  PuntoVivo,
  Rotulo,
  Segmentos,
  Selector,
  Tarjeta,
  Variacion,
} from "@/components/plataforma/mono";
import { AMARILLO, CREMA, Chispa, Mosaicos } from "@/components/plataforma/graficos";
import {
  colorAvatar,
  corto,
  haceCuanto,
  iniciales,
  mesAnio,
  minutosDesde,
  numero,
  plural,
  resumir,
  variacion,
} from "@/components/plataforma/formato";
import {
  Alerta,
  TipoAlerta,
  alertasDePlataforma,
  empresasConAlertas,
} from "@/components/plataforma/alertas";
import { Editor, EditorDialog } from "./editor-dialog";

type Filtro = "todas" | "activas" | "alertas" | "suspendidas";
type Orden = "cobrado" | "caida" | "ultima" | "nombre" | "alta";
const POR_PAGINA = 20;

const ICONOS: Record<TipoAlerta, typeof Tag> = {
  "sin-tarifas": Tag,
  "sin-playa": UserX,
  suspendida: Ban,
  "sin-operar": Clock,
  "sin-playas": MapPin,
};

export function EmpresasPanel({ tour }: { tour?: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [empresas, setEmpresas] = useState<EmpresaConDetalle[]>([]);
  const [metrics, setMetrics] = useState<PlataformaMetrics | null>(null);
  const [detalle, setDetalle] = useState<MetricsDetalle | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>(
    params.get("filtro") === "alertas" ? "alertas" : "todas",
  );
  const [orden, setOrden] = useState<Orden>("cobrado");
  const [pagina, setPagina] = useState(1);
  const [editor, setEditor] = useState<Editor | null>(null);

  async function refrescar() {
    setCargando(true);
    // Las métricas no son críticas: si fallan, el panel sigue sirviendo para administrar.
    const [e, m, d] = await Promise.all([
      getEmpresasAction(),
      getPlataformaMetricsAction(30),
      getMetricsDetalleAction(30),
    ]);
    if (e.empresas) {
      setEmpresas(e.empresas);
      setError("");
    } else setError(e.error ?? "No se pudieron cargar las empresas.");
    setMetrics(m.metrics ?? null);
    setDetalle(d.detalle ?? null);
    setCargando(false);
  }
  useEffect(() => {
    void refrescar();
  }, []);

  // «Nueva empresa» de la barra superior llega como ?nueva=1: abre el alta y limpia la URL para
  // que recargar no la vuelva a abrir.
  useEffect(() => {
    if (params.get("nueva") === "1") {
      setEditor({ tipo: "empresa" });
      router.replace(pathname, { scroll: false });
    }
  }, [params, pathname, router]);

  const dias30 = useMemo(() => eje(30), []);
  const porPlaya = useMemo(
    () => new Map((metrics?.playas ?? []).map((p) => [p.playaId, p])),
    [metrics],
  );
  const alertas = useMemo(
    () => alertasDePlataforma(empresas, metrics?.playas ?? []),
    [empresas, metrics],
  );
  const conAlertas = useMemo(() => empresasConAlertas(alertas), [alertas]);
  const cobros = new Map((detalle?.empresas ?? []).map((e) => [e.empresaId, e]));

  const seriePorEmpresa = useMemo(() => {
    const mapa = new Map<string, { dia: string; total: number }[]>();
    for (const f of detalle?.seriePlayas ?? []) {
      const id = porPlaya.get(f.playaId)?.empresaId;
      if (!id) continue;
      const lista = mapa.get(id) ?? [];
      const dia = lista.find((x) => x.dia === f.dia);
      if (dia) dia.total += f.total;
      else lista.push({ dia: f.dia, total: f.total });
      mapa.set(id, lista);
    }
    return mapa;
  }, [detalle, porPlaya]);

  const activas = empresas.filter((e) => e.estado === "ACTIVA");
  const suspendidas = empresas.length - activas.length;
  const operando = activas.filter((e) => e.playas.length > 0).length;
  const sinPlayas = activas.length - operando;
  const todasLasPlayas = empresas.flatMap((e) => e.playas);
  const sinTarifas = todasLasPlayas.filter((p) => porPlaya.get(p.id)?.tieneTarifas === false);
  const usuarios = empresas.flatMap((e) => e.usuarios);
  const admins = usuarios.filter((u) => u.role === "ADMIN").length;
  const operadores = usuarios.filter((u) => u.role === "USER");
  const operadoresSinPlaya = operadores.filter((u) => !u.playaIds.length).length;
  const total = detalle?.totales.actual ?? 0;
  const totalPrevio = detalle?.totales.anterior ?? 0;
  const serieTotal = completar(
    [...(detalle?.serie ?? []), ...(detalle?.anterior ?? [])],
    dias30,
  );

  const ultimaDe = (e: EmpresaConDetalle) =>
    e.playas
      .map((p) => porPlaya.get(p.id)?.ultimaOperacion)
      .filter((f): f is string => !!f)
      .sort()
      .pop() ?? null;

  const texto = busqueda.toLowerCase().trim();
  const filtradas = empresas
    .filter((e) =>
      filtro === "activas"
        ? e.estado === "ACTIVA"
        : filtro === "suspendidas"
          ? e.estado !== "ACTIVA"
          : filtro === "alertas"
            ? conAlertas.has(e.id)
            : true,
    )
    .filter(
      (e) =>
        !texto ||
        [
          e.nombre,
          ...e.playas.map((p) => p.nombre),
          ...e.usuarios.map((u) => `${u.firstName} ${u.lastName} ${u.email} ${u.username}`),
        ]
          .join(" ")
          .toLowerCase()
          .includes(texto),
    )
    .sort((a, b) => {
      const ca = cobros.get(a.id);
      const cb = cobros.get(b.id);
      if (orden === "nombre") return a.nombre.localeCompare(b.nombre);
      if (orden === "alta") return b.createdAt.localeCompare(a.createdAt);
      if (orden === "ultima") return (ultimaDe(b) ?? "").localeCompare(ultimaDe(a) ?? "");
      if (orden === "caida") {
        const va = ca ? variacion(ca.cobrado, ca.anterior) : null;
        const vb = cb ? variacion(cb.cobrado, cb.anterior) : null;
        return (va ?? Infinity) - (vb ?? Infinity);
      }
      return (cb?.cobrado ?? 0) - (ca?.cobrado ?? 0);
    });
  const paginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, paginas);
  const visibles = filtradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  const mosaicos = (detalle?.empresas ?? [])
    .filter((e) => e.cobrado > 0)
    .map((e) => ({
      id: e.empresaId,
      nombre: e.nombre,
      iniciales: iniciales(e.nombre),
      valor: e.cobrado,
      monto: corto(e.cobrado),
      href: `/admin/empresas/${e.empresaId}`,
      detalle: `${e.nombre}: ${corto(e.cobrado)} (${numero(total ? (e.cobrado / total) * 100 : 0, 1)}%)`,
    }));
  const cuantasTop = Math.min(3, mosaicos.length);
  const concentracion = total
    ? (mosaicos.slice(0, cuantasTop).reduce((n, m) => n + m.valor, 0) / total) * 100
    : 0;

  function exportar() {
    const filas = [
      ["Empresa", "Estado", "Playas", "Usuarios", "Cobrado 30 días", "Período anterior", "Última operación", "MercadoPago"],
      ...filtradas.map((e) => [
        e.nombre,
        e.estado,
        String(e.playas.length),
        String(e.usuarios.length),
        String(cobros.get(e.id)?.cobrado ?? 0),
        String(cobros.get(e.id)?.anterior ?? 0),
        ultimaDe(e) ?? "",
        e.mercadoPago?.estado ?? "SIN CONECTAR",
      ]),
    ];
    const csv = filas.map((f) => f.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "empresas.csv";
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  const cambiarFiltro = (f: Filtro) => {
    setFiltro(f);
    setPagina(1);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="font-mono text-[11px] tracking-[0.14em] text-gm-yellow">
            PLATAFORMA · {empresas.length} EMPRESAS · {todasLasPlayas.length} PLAYAS · {usuarios.length} USUARIOS
          </div>
          <h1 className="mt-2 font-display text-[34px] font-semibold leading-none tracking-[0.01em] sm:text-[40px]">
            Empresas
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          {tour}
          <button
            type="button"
            onClick={exportar}
            disabled={!filtradas.length}
            className="flex h-11 items-center gap-2 rounded-xl border border-border bg-gm-surface px-4 text-[13.5px] font-semibold transition-colors hover:border-gm-line-strong hover:bg-gm-surface-2 disabled:opacity-50"
          >
            <Download className="size-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      <div data-tour="empresas-resumen" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta className="min-h-[150px] justify-between gap-3 pb-4 pt-4">
          <div className="flex items-center justify-between">
            <Rotulo>Empresas</Rotulo>
            <Building2 aria-hidden className="size-4 text-gm-yellow" />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-display text-[34px] font-semibold leading-none">{empresas.length}</span>
            <Salud
              ok={!sinPlayas && !suspendidas}
              texto={
                !sinPlayas && !suspendidas
                  ? "todas operando"
                  : `${sinPlayas + suspendidas} para revisar`
              }
            />
          </div>
          <div className="space-y-2">
            <BarraEstado
              etiqueta={`${operando} operando, ${sinPlayas} sin playas, ${suspendidas} suspendidas`}
              segmentos={[
                { n: operando, color: "#34D399" },
                { n: sinPlayas, color: EJE },
                { n: suspendidas, color: "#FF7A4D" },
              ]}
            />
            <Leyenda
              items={[
                { color: "#34D399", label: "operando", n: operando },
                ...(sinPlayas ? [{ color: EJE, label: "sin playas", n: sinPlayas }] : []),
                ...(suspendidas
                  ? [{ color: "#FF7A4D", label: suspendidas === 1 ? "suspendida" : "suspendidas", n: suspendidas }]
                  : []),
              ]}
            />
          </div>
        </Tarjeta>

        <Tarjeta className="min-h-[150px] justify-between gap-3 pb-4 pt-4">
          <div className="flex items-center justify-between">
            <Rotulo>Playas</Rotulo>
            <MapPin aria-hidden className="size-4 text-gm-yellow" />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-display text-[34px] font-semibold leading-none">{todasLasPlayas.length}</span>
            <Salud
              ok={!sinTarifas.length}
              texto={
                sinTarifas.length
                  ? `${sinTarifas.length} sin tarifas`
                  : todasLasPlayas.length === 1
                    ? "con tarifas"
                    : "todas con tarifas"
              }
            />
          </div>
          <div className="space-y-2">
            <BarraEstado
              etiqueta={`${todasLasPlayas.length - sinTarifas.length} playas con tarifas y ${sinTarifas.length} sin tarifas`}
              segmentos={[
                { n: todasLasPlayas.length - sinTarifas.length, color: "#34D399" },
                { n: sinTarifas.length, color: "#FF7A4D" },
              ]}
            />
            <Leyenda
              items={[
                { color: "#34D399", label: "con tarifas", n: todasLasPlayas.length - sinTarifas.length },
                ...(sinTarifas.length ? [{ color: "#FF7A4D", label: "sin tarifas", n: sinTarifas.length }] : []),
              ]}
            />
          </div>
        </Tarjeta>

        <Tarjeta className="min-h-[150px] justify-between gap-3 pb-4 pt-4">
          <div className="flex items-center justify-between">
            <Rotulo>Usuarios con acceso</Rotulo>
            <Users aria-hidden className="size-4 text-gm-yellow" />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-display text-[34px] font-semibold leading-none">{usuarios.length}</span>
            <Salud
              ok={!operadoresSinPlaya}
              texto={
                operadoresSinPlaya
                  ? `${operadoresSinPlaya} sin playa`
                  : "todos con acceso"
              }
            />
          </div>
          <div className="space-y-2">
            <BarraEstado
              etiqueta={`${admins} administradores, ${operadores.length - operadoresSinPlaya} operadores con playa, ${operadoresSinPlaya} sin playa`}
              segmentos={[
                { n: admins, color: AMARILLO },
                { n: operadores.length - operadoresSinPlaya, color: CREMA },
                { n: operadoresSinPlaya, color: "#FF7A4D" },
              ]}
            />
            <Leyenda
              items={[
                { color: AMARILLO, label: admins === 1 ? "admin" : "admins", n: admins },
                {
                  color: CREMA,
                  label: operadores.length === 1 ? "operador" : "operadores",
                  n: operadores.length - operadoresSinPlaya,
                },
                ...(operadoresSinPlaya
                  ? [{ color: "#FF7A4D", label: "sin playa", n: operadoresSinPlaya }]
                  : []),
              ]}
            />
          </div>
        </Tarjeta>

        <Tarjeta className="min-h-[150px] justify-between gap-3 overflow-hidden pb-4 pt-4">
          <div className="flex items-center justify-between">
            <Rotulo>Cobrado · 30 días</Rotulo>
            <Variacion valor={variacion(total, totalPrevio)} />
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-display text-[34px] font-semibold leading-none text-gm-yellow">
              {detalle ? corto(total) : "—"}
            </span>
            <span className="text-[12.5px] text-muted-foreground">vs {corto(totalPrevio)}</span>
          </div>
          <Chispa valores={resumir(serieTotal)} color={AMARILLO} alto={26} />
        </Tarjeta>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Tarjeta className="min-h-[390px] lg:col-span-2">
          <Encabezado
            rotulo="Dónde está el volumen"
            pastilla={<Pastilla>Mosaico</Pastilla>}
            valor={`${cuantasTop} empresa${cuantasTop === 1 ? "" : "s"}`}
            unidad={`concentran el ${numero(concentracion)}% de lo cobrado`}
            derecha={
              <span className="mt-1 font-mono text-[11px]" style={{ color: EJE }}>
                Tamaño = cobrado en 30 días
              </span>
            }
          />
          <Escenario className="p-1.5">
            <Mosaicos items={mosaicos} />
          </Escenario>
          <Pie
            izquierda={`${plural(mosaicos.length, "empresa", "empresas")} con cobros · ${empresas.length - mosaicos.length} sin operación`}
            derecha={corto(total)}
          />
        </Tarjeta>

        <Tarjeta className="min-h-[390px]" as="div">
          <div data-tour="empresas-atencion" className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Rotulo>Requiere atención</Rotulo>
              {alertas.length > 0 && <Pastilla tono="naranja">{alertas.length}</Pastilla>}
            </div>
            {alertas.length > 0 && (
              <button
                type="button"
                onClick={() => cambiarFiltro("alertas")}
                className="text-[12.5px] font-semibold text-gm-yellow hover:text-[#FFD84D]"
              >
                Filtrar tabla
              </button>
            )}
          </div>
          <div className="mt-3.5 flex max-h-[318px] flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
            {!alertas.length && !cargando && (
              <div className="m-auto flex flex-col items-center gap-2 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-emerald-400/[0.14]">
                  <Check className="size-5 text-emerald-400" />
                </span>
                <p className="max-w-[240px] text-sm text-muted-foreground">
                  Nada pendiente: todas las playas con tarifas y todas las empresas activas.
                </p>
              </div>
            )}
            {alertas.map((a) => (
              <FilaAlerta key={a.id} alerta={a} />
            ))}
          </div>
        </Tarjeta>
      </div>

      <div className="flex flex-col gap-3 pt-2 lg:flex-row lg:items-center">
        <label
          data-tour="empresas-buscar"
          className="flex h-11 items-center gap-2.5 rounded-xl border border-border bg-gm-surface px-3 lg:w-[340px]"
        >
          <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <input
            aria-label="Filtrar empresas"
            placeholder="Filtrar por empresa, playa o usuario"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#8A8073]"
          />
        </label>
        <div data-tour="empresas-filtro" className="overflow-x-auto">
          <Segmentos
            etiqueta="Estado"
            className="w-max"
            opciones={[
              { id: "todas" as Filtro, label: "Todas", cuenta: empresas.length },
              { id: "activas" as Filtro, label: "Activas", cuenta: activas.length },
              { id: "alertas" as Filtro, label: "Con alertas", cuenta: conAlertas.size },
              { id: "suspendidas" as Filtro, label: "Suspendidas", cuenta: suspendidas },
            ]}
            valor={filtro}
            onChange={cambiarFiltro}
          />
        </div>
        <div className="flex-1" />
        <Selector
          etiqueta="ORDENAR"
          ariaLabel="Ordenar"
          className="h-11 rounded-xl"
          valor={orden}
          opciones={[
            { id: "cobrado", label: "Más cobrado" },
            { id: "caida", label: "Mayor caída" },
            { id: "ultima", label: "Última operación" },
            { id: "nombre", label: "Nombre" },
            { id: "alta", label: "Alta más reciente" },
          ]}
          onChange={(id) => setOrden(id as Orden)}
        />
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/60 p-4 text-sm">
          {error}
          <button
            type="button"
            onClick={() => void refrescar()}
            className="h-9 rounded-lg border border-border px-3 font-semibold hover:bg-gm-surface-2"
          >
            Reintentar
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-[22px] border border-border bg-gm-surface">
        <div className="overflow-x-auto">
          <div role="table" aria-label="Empresas" className="min-w-[1080px]">
            <div
              role="row"
              className="grid h-11 grid-cols-[minmax(0,1fr)_116px_104px_112px_176px_100px_132px_112px_48px] items-center bg-[#19140F] pl-5 pr-4 font-mono text-[10.5px] tracking-[0.1em]"
              style={{ color: EJE }}
            >
              <span role="columnheader">EMPRESA</span>
              <span role="columnheader">ESTADO</span>
              <span role="columnheader">PLAYAS</span>
              <span role="columnheader">USUARIOS</span>
              <span role="columnheader">COBRADO 30 D</span>
              <span role="columnheader">VS ANTERIOR</span>
              <span role="columnheader">ÚLTIMA OPERACIÓN</span>
              <span role="columnheader">MERCADOPAGO</span>
              <span role="columnheader" className="sr-only">
                Abrir
              </span>
            </div>
            {cargando && !empresas.length && (
              <p role="status" className="border-t border-[#2A241D] px-5 py-12 text-center text-sm text-muted-foreground">
                Actualizando plataforma…
              </p>
            )}
            {!cargando && !filtradas.length && (
              <p className="border-t border-[#2A241D] px-5 py-12 text-center text-sm text-muted-foreground">
                {empresas.length
                  ? "No hay empresas que coincidan con la búsqueda."
                  : "Creá tu primera empresa. Después agregá sus playas y usuarios."}
              </p>
            )}
            {visibles.map((e, i) => {
              const cobro = cobros.get(e.id);
              const ultima = ultimaDe(e);
              const minutos = minutosDesde(ultima);
              const sinPlaya = e.usuarios.filter((u) => u.role === "USER" && !u.playaIds.length).length;
              const adminsEmpresa = e.usuarios.filter((u) => u.role === "ADMIN").length;
              const alertasEmpresa = alertas.filter((a) => a.empresaIds.includes(e.id));
              const tendencia = resumir(completar(seriePorEmpresa.get(e.id) ?? [], dias30), 14);
              const cambio = cobro ? variacion(cobro.cobrado, cobro.anterior) : null;
              const mp = e.mercadoPago?.estado;
              return (
                <div
                  key={e.id}
                  role="row"
                  data-tour={i === 0 ? "empresas-ficha" : undefined}
                  className="grid h-[68px] grid-cols-[minmax(0,1fr)_116px_104px_112px_176px_100px_132px_112px_48px] items-center border-t border-[#2A241D] pl-5 pr-4 text-[13.5px] transition-colors hover:bg-[#201A15]"
                >
                  <span role="cell" className="flex min-w-0 items-center gap-3">
                    <Avatar texto={iniciales(e.nombre)} fondo={colorAvatar(e.id)} />
                    <span className="flex min-w-0 flex-col gap-[3px]">
                      <Link
                        href={`/admin/empresas/${e.id}`}
                        className="truncate font-semibold text-foreground hover:text-gm-yellow"
                      >
                        {e.nombre}
                      </Link>
                      <span className="text-xs" style={{ color: EJE }}>
                        Alta {mesAnio(e.createdAt)}
                      </span>
                    </span>
                  </span>
                  <span role="cell" className="flex items-center gap-1.5">
                    <EstadoEmpresa estado={e.estado} />
                    {alertasEmpresa.length > 0 && (
                      <span title={alertasEmpresa.map((a) => a.titulo).join("\n")} className="flex">
                        <AlertTriangle
                          role="img"
                          aria-label={alertasEmpresa.map((a) => a.titulo).join(". ")}
                          className="size-[15px] text-[#FF7A4D]"
                        />
                      </span>
                    )}
                  </span>
                  <span role="cell" className="flex flex-col gap-[5px]">
                    <span className="font-semibold">{e.playas.length || "—"}</span>
                    <span className="flex flex-wrap gap-[3px]">
                      {e.playas.slice(0, 8).map((p) => {
                        const ok = porPlaya.get(p.id)?.tieneTarifas !== false;
                        return (
                          <span
                            key={p.id}
                            title={`${p.nombre}: ${ok ? "con tarifas" : "sin tarifas"}`}
                            className="h-[5px] w-3 rounded-full"
                            style={{ background: ok ? CREMA : "#FF7A4D" }}
                          />
                        );
                      })}
                    </span>
                  </span>
                  <span role="cell" className="flex flex-col gap-[3px]">
                    <span className="font-semibold">{e.usuarios.length}</span>
                    <span className="text-[11.5px]" style={{ color: sinPlaya ? "#FF7A4D" : EJE }}>
                      {sinPlaya
                        ? `${sinPlaya} sin playa`
                        : `${adminsEmpresa} admin · ${e.usuarios.length - adminsEmpresa} oper.`}
                    </span>
                  </span>
                  <span role="cell" className="flex items-center gap-3">
                    <span className="w-[84px] font-semibold tabular-nums">{corto(cobro?.cobrado ?? 0)}</span>
                    <Chispa
                      valores={tendencia}
                      ancho={64}
                      alto={24}
                      relleno={false}
                      color={cambio === null ? "#3A3228" : cambio >= 0 ? CREMA : "#FF7A4D"}
                    />
                  </span>
                  <span role="cell">
                    <Variacion valor={cambio} decimales={0} />
                  </span>
                  <span
                    role="cell"
                    className="flex items-center gap-2 text-[12.5px]"
                    style={{
                      color:
                        minutos === null ? EJE : minutos > 48 * 60 ? "#FF7A4D" : "#C9BFB1",
                    }}
                  >
                    {minutos !== null && minutos <= 15 && <PuntoVivo className="size-[7px]" />}
                    {haceCuanto(ultima)}
                  </span>
                  <span
                    role="cell"
                    className="flex items-center gap-1.5 text-[12.5px]"
                    style={{ color: mp === "ACTIVA" ? "#C9BFB1" : mp === "ERROR" ? "#FF7A4D" : EJE }}
                  >
                    {mp === "ACTIVA" && <Check aria-hidden className="size-3.5 text-[#A9AFFF]" strokeWidth={2.5} />}
                    {mp === "ACTIVA"
                      ? "Conectado"
                      : mp === "ERROR"
                        ? "Con error"
                        : mp === "DESCONECTADA"
                          ? "Desconectado"
                          : "Sin conectar"}
                  </span>
                  <span role="cell" className="flex justify-end">
                    <Link
                      href={`/admin/empresas/${e.id}`}
                      aria-label={`Abrir ficha de ${e.nombre}`}
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
        <div className="flex h-14 items-center justify-between gap-3 border-t border-[#2A241D] bg-[#19140F] px-5 text-[12.5px] text-muted-foreground">
          <span>
            {filtradas.length
              ? `Mostrando ${(paginaActual - 1) * POR_PAGINA + 1}–${(paginaActual - 1) * POR_PAGINA + visibles.length} de ${filtradas.length} empresas`
              : "Sin resultados"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={paginaActual <= 1}
              onClick={() => setPagina(paginaActual - 1)}
              className="h-8 rounded-[9px] border border-border px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-gm-surface-2 disabled:border-[#2E2820] disabled:text-[#53493C] disabled:hover:bg-transparent"
            >
              Anterior
            </button>
            <span className="font-mono text-[11px]">
              Página {paginaActual} de {paginas}
            </span>
            <button
              type="button"
              disabled={paginaActual >= paginas}
              onClick={() => setPagina(paginaActual + 1)}
              className="h-8 rounded-[9px] border border-border px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-gm-surface-2 disabled:border-[#2E2820] disabled:text-[#53493C] disabled:hover:bg-transparent"
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>

      {editor && (
        <EditorDialog
          editor={editor}
          cerrar={() => setEditor(null)}
          guardado={() => {
            setEditor(null);
            void refrescar();
          }}
        />
      )}
    </div>
  );
}

// El estado de un indicador en una palabra: verde si está todo bien, naranja con cuántos faltan.
function Salud({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[11.5px] font-bold ${
        ok ? "bg-emerald-400/[0.12] text-emerald-400" : "bg-[#FF7A4D]/[0.14] text-[#FF7A4D]"
      }`}
    >
      {ok ? (
        <Check aria-hidden className="size-3" strokeWidth={3} />
      ) : (
        <AlertTriangle aria-hidden className="size-3" />
      )}
      {texto}
    </span>
  );
}

// Barra partida en proporción a cada grupo. Sin datos queda la pista vacía, no un segmento lleno.
function BarraEstado({
  segmentos,
  etiqueta,
}: {
  segmentos: { n: number; color: string }[];
  etiqueta: string;
}) {
  const visibles = segmentos.filter((s) => s.n > 0);
  return (
    <div role="img" aria-label={etiqueta} className="flex h-2 gap-[3px]">
      {visibles.length ? (
        visibles.map((s, i) => (
          <span
            key={i}
            className="h-2 min-w-2 rounded-full"
            style={{ flexGrow: s.n, background: s.color }}
          />
        ))
      ) : (
        <span className="h-2 flex-1 rounded-full bg-[#231D17]" />
      )}
    </div>
  );
}

function FilaAlerta({ alerta }: { alerta: Alerta }) {
  const Icono = ICONOS[alerta.tipo];
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-[#262019] bg-background px-3 py-2.5">
      <span
        className={`flex size-[34px] shrink-0 items-center justify-center rounded-[10px] ${
          alerta.grave ? "bg-[#FF7A4D]/[0.14]" : "bg-[#2A241D]"
        }`}
      >
        <Icono aria-hidden className={`size-4 ${alerta.grave ? "text-[#FF7A4D]" : "text-[#C9BFB1]"}`} />
      </span>
      <div className="min-w-0 flex-1">
        {/* Dos renglones: con nombres largos de empresa, cortar en uno se comía el problema. */}
        <div className="line-clamp-2 text-[13px] font-semibold leading-snug">{alerta.titulo}</div>
        <div className="truncate text-xs text-muted-foreground">{alerta.detalle}</div>
      </div>
      <Link
        href={alerta.href}
        className="flex h-[30px] shrink-0 items-center rounded-[9px] border border-border px-2.5 text-xs font-semibold transition-colors hover:border-gm-line-strong hover:bg-gm-surface-2"
      >
        {alerta.accion}
      </Link>
    </div>
  );
}
