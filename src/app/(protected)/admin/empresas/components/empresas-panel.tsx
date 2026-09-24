"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Building2,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  Search,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EmpresaConDetalle,
  PlataformaMetrics,
  PlayaMetrics,
} from "@/types/tenancy.type";
import {
  deleteEmpresaAction,
  deletePlayaAction,
  deleteUsuarioEmpresaAction,
  getEmpresasAction,
  getPlataformaMetricsAction,
  updateEmpresaAction,
} from "@/actions/tenancy/tenancy.action";
import { Editor, EditorDialog } from "./editor-dialog";
import { Borrado, BorradoDialog } from "./borrado-dialog";

const plata = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function haceCuanto(iso: string | null) {
  if (!iso) return "Sin operación";
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return "recién";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return `hace ${dias} día${dias === 1 ? "" : "s"}`;
}

const VACIO: PlayaMetrics = {
  playaId: "",
  empresaId: "",
  nombre: "",
  cobrado: 0,
  estadiasAbiertas: 0,
  turnosAbiertos: 0,
  tieneTarifas: true,
  ultimaOperacion: null,
};

export function EmpresasPanel() {
  const [empresas, setEmpresas] = useState<EmpresaConDetalle[]>([]);
  const [metrics, setMetrics] = useState<PlataformaMetrics | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todas");

  const [editor, setEditor] = useState<Editor | null>(null);
  const [borrado, setBorrado] = useState<Borrado | null>(null);

  async function refrescar() {
    setCargando(true);
    // Las métricas no son críticas: si fallan, el panel sigue sirviendo para administrar.
    const [e, m] = await Promise.all([
      getEmpresasAction(),
      getPlataformaMetricsAction(30),
    ]);
    if (e.empresas) {
      setEmpresas(e.empresas);
      setError("");
    } else setError(e.error ?? "No se pudieron cargar las empresas.");
    setMetrics(m.metrics ?? null);
    setCargando(false);
  }
  useEffect(() => {
    void refrescar();
  }, []);

  const porPlaya = useMemo(() => {
    const mapa = new Map<string, PlayaMetrics>();
    for (const p of metrics?.playas ?? []) mapa.set(p.playaId, p);
    return mapa;
  }, [metrics]);

  const texto = busqueda.toLowerCase().trim();
  const visibles = empresas
    .filter((e) => filtro === "todas" || e.id === filtro)
    .filter(
      (e) =>
        !texto ||
        [
          e.nombre,
          ...e.playas.map((p) => p.nombre),
          ...e.usuarios.map(
            (u) => `${u.firstName} ${u.lastName} ${u.email} ${u.username}`,
          ),
        ]
          .join(" ")
          .toLowerCase()
          .includes(texto),
    );

  const metricasDe = (empresa: EmpresaConDetalle) =>
    empresa.playas.map((p) => porPlaya.get(p.id) ?? { ...VACIO, playaId: p.id });
  const sumar = (campo: "cobrado" | "estadiasAbiertas" | "turnosAbiertos") =>
    visibles.reduce(
      (total, e) =>
        total + metricasDe(e).reduce((n, m) => n + (m[campo] || 0), 0),
      0,
    );
  const totalPlayas = visibles.reduce((n, e) => n + e.playas.length, 0);
  const totalUsuarios = visibles.reduce((n, e) => n + e.usuarios.length, 0);
  const activas = visibles.filter((e) => e.estado === "ACTIVA").length;
  const sinTarifas = visibles.flatMap((e) =>
    metricasDe(e).filter((m) => m.playaId && !m.tieneTarifas),
  );

  const barras = visibles
    .flatMap((e) =>
      e.playas.map((p) => ({
        nombre: p.nombre,
        empresa: e.nombre,
        cobrado: porPlaya.get(p.id)?.cobrado ?? 0,
      })),
    )
    .sort((a, b) => b.cobrado - a.cobrado)
    .slice(0, 6);
  const tope = Math.max(1, ...barras.map((b) => b.cobrado));

  async function suspender(empresa: EmpresaConDetalle) {
    const r = await updateEmpresaAction(empresa.id, {
      estado: empresa.estado === "ACTIVA" ? "SUSPENDIDA" : "ACTIVA",
    });
    if (r.error) toast.error(r.error);
    else {
      toast.success(
        empresa.estado === "ACTIVA"
          ? "Empresa suspendida. Sus usuarios no pueden iniciar sesión."
          : "Empresa reactivada.",
      );
      await refrescar();
    }
    return r;
  }

  const kpis = [
    {
      titulo: "Empresas",
      valor: String(visibles.length),
      pie: `${activas} activas · ${visibles.length - activas} suspendidas`,
      Icono: Building2,
    },
    {
      titulo: "Playas",
      valor: String(totalPlayas),
      pie: sinTarifas.length
        ? `${sinTarifas.length} sin tarifas cargadas`
        : "Todas con tarifas cargadas",
      Icono: MapPin,
    },
    {
      titulo: "Usuarios con acceso",
      valor: String(totalUsuarios),
      pie: "Administradores y operadores",
      Icono: Users,
    },
    {
      titulo: `Cobrado · ${metrics?.dias ?? 30} días`,
      valor: metrics ? plata.format(sumar("cobrado")) : "—",
      pie: `${sumar("estadiasAbiertas")} estadías abiertas · ${sumar("turnosAbiertos")} turnos en curso`,
      Icono: Wallet,
      destacado: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div data-tour="empresas-buscar" className="relative flex-1">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            aria-label="Buscar empresa, playa o usuario"
            className="h-10 pl-9"
            placeholder="Buscar empresa, playa o usuario"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <Button
          data-tour="empresas-crear"
          onClick={() => setEditor({ tipo: "empresa" })}
        >
          <Plus className="mr-2 size-4" />
          Nueva empresa
        </Button>
      </div>

      <div
        data-tour="empresas-filtro"
        className="flex flex-wrap items-center gap-2 border-b border-border pb-4"
      >
        <span className="mr-1 text-xs uppercase tracking-wider text-muted-foreground">
          Filtrar
        </span>
        {[{ id: "todas", nombre: "Todas las empresas" }, ...empresas].map(
          (opcion) => (
            <button
              key={opcion.id}
              type="button"
              aria-pressed={filtro === opcion.id}
              onClick={() => setFiltro(opcion.id)}
              className={`h-9 rounded-full border px-4 text-sm font-semibold transition-colors ${
                filtro === opcion.id
                  ? "border-gm-yellow bg-gm-yellow text-gm-ink"
                  : "border-border text-foreground hover:bg-gm-surface-2"
              }`}
            >
              {opcion.nombre}
            </button>
          ),
        )}
      </div>

      <div
        data-tour="empresas-resumen"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {kpis.map(({ titulo, valor, pie, Icono, destacado }) => (
          <div
            key={titulo}
            className="rounded-2xl border border-border bg-gm-surface-2 p-5"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icono className="size-4 text-gm-yellow" />
              {titulo}
            </div>
            <div
              className={`mt-3 font-display text-[38px] font-semibold leading-none tabular-nums ${destacado ? "text-gm-yellow" : ""}`}
            >
              {valor}
            </div>
            <div className="mt-2.5 text-sm text-muted-foreground">{pie}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-gm-surface-2 p-5 lg:col-span-2">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold tracking-tight">
              Cobrado por playa · {metrics?.dias ?? 30} días
            </h2>
            <span className="text-sm text-muted-foreground">
              {filtro === "todas"
                ? "Todas las empresas"
                : (empresas.find((e) => e.id === filtro)?.nombre ?? "")}
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {!barras.length && (
              <p className="text-sm text-muted-foreground">
                Todavía no hay playas para mostrar.
              </p>
            )}
            {barras.map((barra) => (
              <div key={`${barra.empresa}-${barra.nombre}`}>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="truncate">{barra.nombre}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {plata.format(barra.cobrado)}
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 rounded-full bg-gm-surface-3">
                  <div
                    className={`h-2.5 rounded-full ${barra.cobrado === tope ? "bg-gm-yellow" : "bg-gm-yellow-deep/60"}`}
                    style={{
                      width: `${Math.max(2, Math.round((barra.cobrado / tope) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-gm-surface-2 p-6">
          <h2 className="text-[15px] font-semibold tracking-tight">Requiere atención</h2>
          <div className="mt-4 space-y-3">
            {sinTarifas.map((m) => (
              <div
                key={m.playaId}
                className="rounded-lg border border-border border-l-4 border-l-gm-orange bg-gm-surface p-3"
              >
                <p className="text-sm font-medium">{m.nombre}: sin tarifas</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  No puede registrar entradas hasta cargar sus precios por hora.
                </p>
              </div>
            ))}
            {visibles
              .filter((e) => e.estado !== "ACTIVA")
              .map((e) => (
                <div
                  key={e.id}
                  className="rounded-lg border border-border border-l-4 border-l-muted-foreground bg-gm-surface p-3"
                >
                  <p className="text-sm font-medium">
                    {e.nombre}: suspendida
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Sus {e.usuarios.length} usuarios no pueden iniciar sesión.
                  </p>
                </div>
              ))}
            {!sinTarifas.length &&
              !visibles.some((e) => e.estado !== "ACTIVA") && (
                <p className="text-sm text-muted-foreground">
                  Nada pendiente: todas las playas con tarifas y todas las
                  empresas activas.
                </p>
              )}
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-destructive p-4 text-sm">
          {error}
          <Button variant="outline" className="ml-3" onClick={refrescar}>
            Reintentar
          </Button>
        </div>
      )}
      {cargando && (
        <p role="status" className="text-sm text-muted-foreground">
          Actualizando plataforma…
        </p>
      )}
      {!cargando && !error && !visibles.length && (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          {empresas.length
            ? "No hay resultados para esa búsqueda."
            : "Creá tu primera empresa. Después agregá sus playas y usuarios."}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-border">
        {visibles.map((empresa, i) => {
          const m = metricasDe(empresa);
          const cobrado = m.reduce((n, x) => n + x.cobrado, 0);
          const ultima = m
            .map((x) => x.ultimaOperacion)
            .filter(Boolean)
            .sort()
            .pop() as string | undefined;
          return (
            <section
              key={empresa.id}
              data-tour={i === 0 ? "empresas-ficha" : undefined}
              className="border-b border-border last:border-b-0"
            >
              <div className="flex flex-wrap items-center gap-4 bg-gm-surface-2 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/empresas/${empresa.id}`}
                      className="break-words font-semibold text-foreground hover:text-gm-yellow"
                    >
                      {empresa.nombre}
                    </Link>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        empresa.estado === "ACTIVA"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-gm-orange/15 text-gm-orange"
                      }`}
                    >
                      {empresa.estado === "ACTIVA" ? "Activa" : "Suspendida"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {empresa.playas.length} playas · {empresa.usuarios.length}{" "}
                    usuarios
                  </p>
                </div>
                <dl className="flex flex-wrap items-center gap-x-8 gap-y-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Cobrado {metrics?.dias ?? 30} días
                    </dt>
                    <dd className="font-semibold tabular-nums">
                      {metrics ? plata.format(cobrado) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Estadías abiertas
                    </dt>
                    <dd className="font-semibold tabular-nums">
                      {m.reduce((n, x) => n + x.estadiasAbiertas, 0)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Última operación
                    </dt>
                    <dd className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="size-3.5" />
                      {haceCuanto(ultima ?? null)}
                    </dd>
                  </div>
                </dl>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/empresas/${empresa.id}`}>
                    Ver ficha
                    <ChevronRight className="ml-1 size-4" />
                  </Link>
                </Button>
              </div>
            </section>
          );
        })}
      </div>

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
      <BorradoDialog
        borrado={borrado}
        cerrar={() => setBorrado(null)}
        hecho={() => {
          setBorrado(null);
          toast.success("Listo.");
          void refrescar();
        }}
      />
    </div>
  );
}
