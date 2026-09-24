"use client";

// La ficha de una empresa en su propia página. Antes era un desplegable dentro del listado: los
// botones para agregar playas y usuarios quedaban escondidos detrás de dos clics y no había
// forma de compartir el enlace de una empresa.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ActividadEmpresa,
  EmpresaConDetalle,
  MetricsDetalle,
  PlataformaMetrics,
  PlayaMetrics,
  ResumenEliminacion,
} from "@/types/tenancy.type";
import {
  deleteEmpresaAction,
  deletePlayaAction,
  deleteUsuarioEmpresaAction,
  getActividadEmpresaAction,
  getEmpresaAction,
  getMetricsDetalleAction,
  getPlataformaMetricsAction,
  getResumenEliminacionAction,
  updateEmpresaAction,
} from "@/actions/tenancy/tenancy.action";
import { completar, curva, eje } from "@/utils/serie-diaria";
import { Editor, EditorDialog } from "../../components/editor-dialog";
import { Borrado, BorradoDialog } from "../../components/borrado-dialog";
import { ActividadDeEmpresa } from "./actividad-empresa";

const plata = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

// «Hace un rato» dice más que una fecha completa para saber si la empresa está trabajando ahora.
// Más allá de un día ya no interesa el detalle: ahí vuelve la fecha.
function hace(iso: string | null) {
  if (!iso) return null;
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return "hace un instante";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return `el ${new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })}`;
}

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

type Tab = "resumen" | "playas" | "usuarios" | "actividad";

export function EmpresaDetalle({ empresaId }: { empresaId: string }) {
  const [empresa, setEmpresa] = useState<EmpresaConDetalle | null>(null);
  const [metrics, setMetrics] = useState<PlataformaMetrics | null>(null);
  const [detalle, setDetalle] = useState<MetricsDetalle | null>(null);
  const [eliminacion, setEliminacion] = useState<ResumenEliminacion | null>(
    null,
  );
  const [actividad, setActividad] = useState<ActividadEmpresa[]>([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("resumen");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [borrado, setBorrado] = useState<Borrado | null>(null);
  const [visto, setVisto] = useState<string | null>(null);
  const [abrioActividad, setAbrioActividad] = useState(false);

  const refrescar = useCallback(async () => {
    const [e, m, a, d, el] = await Promise.all([
      getEmpresaAction(empresaId),
      getPlataformaMetricsAction(30),
      getActividadEmpresaAction(empresaId),
      getMetricsDetalleAction(30, empresaId),
      // Los bloqueos del borrado se consultan acá para poder explicarlos en la ficha, no sólo
      // dentro del diálogo de confirmación.
      getResumenEliminacionAction("empresa", empresaId),
    ]);
    if (e.empresa) {
      setEmpresa(e.empresa);
      setError("");
    } else setError(e.error ?? "No se pudo cargar la empresa.");
    setMetrics(m.metrics ?? null);
    setActividad(a.actividad ?? []);
    setDetalle(d.detalle ?? null);
    setEliminacion(el.resumen ?? null);
  }, [empresaId]);

  useEffect(() => {
    void refrescar();
  }, [refrescar]);

  const clave = `actividad-vista:${empresaId}`;
  useEffect(() => {
    try {
      setVisto(localStorage.getItem(clave));
    } catch {
      // Navegador sin almacenamiento: todo se muestra como ya visto.
    }
  }, [clave]);

  useEffect(() => {
    if (tab !== "actividad") return;
    setAbrioActividad(true);
    // La lista viene de la más reciente a la más vieja.
    if (!actividad.length) return;
    try {
      localStorage.setItem(clave, actividad[0].fecha);
    } catch {
      // Sin almacenamiento no se recuerda la visita; no es motivo para romper la pantalla.
    }
  }, [tab, actividad, clave]);

  if (error)
    return (
      <div role="alert" className="rounded-xl border border-destructive p-6">
        <p>{error}</p>
        <Link
          href="/admin/empresas"
          className="mt-3 inline-block text-sm underline"
        >
          Volver a empresas
        </Link>
      </div>
    );
  if (!empresa)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Cargando la empresa…
      </p>
    );

  const metricasDe = (playaId: string): PlayaMetrics | undefined =>
    metrics?.playas.find((p) => p.playaId === playaId);
  const mias = empresa.playas.map((p) => metricasDe(p.id)).filter(Boolean) as PlayaMetrics[];
  const cobrado = mias.reduce((n, m) => n + m.cobrado, 0);
  const estadias = mias.reduce((n, m) => n + m.estadiasAbiertas, 0);
  const turnos = mias.reduce((n, m) => n + m.turnosAbiertos, 0);
  const sinTarifas = mias.filter((m) => !m.tieneTarifas);
  // La operación más reciente de cualquiera de sus playas: dice si la empresa está trabajando.
  const ultimaOperacion = mias
    .map((m) => m.ultimaOperacion)
    .filter(Boolean)
    .sort()
    .pop() as string | undefined;
  // Lo cobrado día por día en los últimos 30, sólo de esta empresa.
  const serie = completar(detalle?.serie ?? [], eje(30));
  const maximoDia = Math.max(0, ...serie);
  // Cuántos operadores tiene asignados cada playa, para mostrarlo en su fila.
  const operadoresDe = (playaId: string) =>
    empresa.usuarios.filter(
      (u) => u.role === "USER" && u.playaIds.includes(playaId),
    ).length;
  const sinPlaya = empresa.usuarios.filter(
    (u) => u.role === "USER" && !u.playaIds.length,
  );
  const activa = empresa.estado === "ACTIVA";

  async function suspender() {
    if (!empresa) return { error: "Empresa no disponible." };
    const r = await updateEmpresaAction(empresa.id, {
      estado: activa ? "SUSPENDIDA" : "ACTIVA",
    });
    if (r.error) toast.error(r.error);
    else {
      toast.success(
        activa
          ? "Empresa suspendida. Sus usuarios no pueden iniciar sesión."
          : "Empresa reactivada.",
      );
      await refrescar();
    }
    return r;
  }

  // Lo no visto se marca contra la última visita a la solapa, guardada por empresa en este
  // navegador. El contador se apaga al entrar, pero las marcas «Nuevo» quedan toda la visita:
  // si desaparecieran al instante no se llegarían a leer.
  const sinVer = abrioActividad
    ? 0
    : actividad.filter((a) => !visto || a.fecha > visto).length;

  const tabs: { id: Tab; label: string; aviso?: number }[] = [
    { id: "resumen", label: "Resumen" },
    { id: "playas", label: `Playas (${empresa.playas.length})` },
    { id: "usuarios", label: `Usuarios (${empresa.usuarios.length})` },
    { id: "actividad", label: "Actividad", aviso: sinVer },
  ];

  return (
    <div className="space-y-6">
      {/* La ruta completa ya está en la barra superior: acá sólo la salida. */}
      <Link
        href="/admin/empresas"
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold transition-colors hover:bg-gm-surface-2"
      >
        <ArrowLeft className="size-4" />
        Empresas
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="break-words font-display text-[34px] font-semibold leading-tight tracking-tight sm:text-[40px]">
              {empresa.nombre}
            </h1>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                activa
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-gm-orange/15 text-gm-orange"
              }`}
            >
              {activa ? "Activa" : "Suspendida"}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Alta el {fechaCorta(empresa.createdAt)}
            {ultimaOperacion
              ? ` · última operación ${hace(ultimaOperacion)}`
              : " · todavía sin operación"}{" "}
            · {empresa.playas.length} playas · {empresa.usuarios.length}{" "}
            usuarios
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setEditor({ tipo: "empresa", empresa })}
          >
            Editar datos
          </Button>
          <Button
            variant="outline"
            onClick={() => setEditor({ tipo: "playa", empresa })}
          >
            Agregar playa
          </Button>
          <Button onClick={() => setEditor({ tipo: "usuario", empresa })}>
            Agregar usuario
          </Button>
        </div>
      </div>

      <div role="tablist" aria-label="Secciones" className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex h-11 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors ${
              tab === t.id
                ? "border-gm-yellow text-gm-yellow"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {!!t.aviso && (
              <span
                // El contador se apaga al entrar a la solapa: marca lo que todavía no viste.
                className="inline-flex min-w-5 items-center justify-center rounded-full bg-gm-yellow px-1.5 text-[11px] font-bold tabular-nums text-gm-ink"
                title={`${t.aviso} movimiento(s) sin ver`}
              >
                {t.aviso}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "resumen" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Cobrado · 30 días",
                valor: metrics ? plata.format(cobrado) : "—",
                pie: "Excluye cortesías",
                destacado: true,
              },
              {
                label: "Estadías abiertas",
                valor: String(estadias),
                pie: "En todas sus playas, ahora",
              },
              {
                label: "Turnos en curso",
                valor: String(turnos),
                pie: "Caja abierta sin cerrar",
              },
              {
                label: "Registros de operación",
                valor:
                  eliminacion === null
                    ? "—"
                    : eliminacion.registros.toLocaleString("es-AR"),
                pie: eliminacion?.registros
                  ? "Bloquean el borrado de la empresa"
                  : "Tickets, movimientos y turnos acumulados",
              },
            ].map((k) => (
              <div
                key={k.label}
                className="rounded-2xl border border-border bg-gm-surface-2 p-5"
              >
                <div className="text-sm text-muted-foreground">{k.label}</div>
                <div
                  className={`mt-3 font-display text-[34px] font-semibold leading-none tabular-nums ${k.destacado ? "text-gm-yellow" : ""}`}
                >
                  {k.valor}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {k.pie}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-gm-surface-2 p-6 lg:col-span-2">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-[15px] font-semibold tracking-tight">
                  Cobrado por día · 30 días
                </h2>
                {!!maximoDia && (
                  <span className="text-xs text-muted-foreground">
                    Día más alto: {plata.format(maximoDia)}
                  </span>
                )}
              </div>
              {serie.some((v) => v > 0) ? (
                <svg
                  viewBox="0 0 800 180"
                  className="mt-4 block h-[180px] w-full"
                  role="img"
                  aria-label={`Cobrado por día en los últimos 30 días. Día más alto: ${plata.format(maximoDia)}`}
                >
                  <path
                    d={`${curva(serie, 800, 180)} L800,180 L0,180 Z`}
                    fill="hsl(var(--gm-yellow) / 0.14)"
                    stroke="none"
                  />
                  <path
                    d={curva(serie, 800, 180)}
                    fill="none"
                    stroke="hsl(var(--gm-yellow))"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Sin cobros en los últimos 30 días.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-gm-surface-2 p-6">
              <h2 className="text-[15px] font-semibold tracking-tight">Requiere atención</h2>
              <div className="mt-3 space-y-3">
                {sinTarifas.map((m) => (
                  <div
                    key={m.playaId}
                    className="rounded-lg border border-border border-l-4 border-l-gm-orange bg-gm-surface p-3"
                  >
                    <p className="text-sm font-medium">
                      {m.nombre}: sin tarifas cargadas
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      No puede registrar entradas hasta cargar sus precios por
                      hora.
                    </p>
                  </div>
                ))}
                {sinPlaya.map((u) => (
                  <div
                    key={u.id}
                    className="rounded-lg border border-border border-l-4 border-l-gm-orange bg-gm-surface p-3"
                  >
                    <p className="text-sm font-medium">
                      {u.firstName} {u.lastName}: sin playa asignada
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Un operador sin playa no puede entrar al sistema.
                    </p>
                  </div>
                ))}
                {!activa && (
                  <div className="rounded-lg border border-border border-l-4 border-l-muted-foreground bg-gm-surface p-3">
                    <p className="text-sm font-medium">Empresa suspendida</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Ninguno de sus usuarios puede iniciar sesión.
                    </p>
                  </div>
                )}
                {!sinTarifas.length && !sinPlaya.length && activa && (
                  <p className="text-sm text-muted-foreground">
                    Nada pendiente.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "playas" && (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-gm-surface-2 p-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <MapPin className="size-4" />
              {empresa.playas.length} playas
            </h2>
            <Button
              size="sm"
              onClick={() => setEditor({ tipo: "playa", empresa })}
            >
              Agregar playa
            </Button>
          </div>
          {!empresa.playas.length && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Todavía no hay playas. Cada playa lleva sus propios tickets,
              tarifas, caja y turnos.
            </p>
          )}
          {empresa.playas.map((playa) => {
            const m = metricasDe(playa.id);
            return (
              <div
                key={playa.id}
                className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-4 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="break-words font-semibold">
                      {playa.nombre}
                    </span>
                    {m &&
                      (m.tieneTarifas ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-400">
                          Operando
                        </span>
                      ) : (
                        <span className="rounded-full bg-gm-orange/15 px-2 py-0.5 text-xs font-bold text-gm-orange">
                          Sin tarifas
                        </span>
                      ))}
                  </div>
                  <p className="break-words text-sm text-muted-foreground">
                    {playa.direccion || "Sin dirección cargada"}
                  </p>
                  {m && (
                    <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                      {m.estadiasAbiertas} estadías abiertas ·{" "}
                      {m.turnosAbiertos} turnos en curso ·{" "}
                      {operadoresDe(playa.id)} operadores
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {m && (
                    <div className="text-right">
                      <div className="text-xl font-semibold tabular-nums">
                        {plata.format(m.cobrado)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        30 días
                      </div>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditor({ tipo: "playa", empresa, playa })}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() =>
                      setBorrado({
                        tipo: "playa",
                        id: playa.id,
                        nombre: playa.nombre,
                        ejecutar: () => deletePlayaAction(playa.id),
                      })
                    }
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "usuarios" && (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-gm-surface-2 p-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <Users className="size-4" />
              {empresa.usuarios.length} usuarios
            </h2>
            <Button
              size="sm"
              onClick={() => setEditor({ tipo: "usuario", empresa })}
            >
              Agregar usuario
            </Button>
          </div>
          {!empresa.usuarios.length && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Agregá al administrador y a los operadores de esta empresa.
            </p>
          )}
          {empresa.usuarios.map((usuario) => (
            <div
              key={usuario.id}
              className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-4 last:border-b-0"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="break-words font-semibold">
                    {usuario.firstName} {usuario.lastName}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      usuario.role === "ADMIN"
                        ? "bg-gm-yellow/15 text-gm-yellow"
                        : "bg-indigo-400/15 text-indigo-300"
                    }`}
                  >
                    {usuario.role === "ADMIN" ? "Admin" : "Operador"}
                  </span>
                </div>
                <p className="break-all text-sm text-muted-foreground">
                  {usuario.email} · @{usuario.username}
                </p>
                <p className="mt-1 text-xs">
                  <span className="text-muted-foreground">Playas: </span>
                  <span
                    className={
                      usuario.playaIds.length
                        ? "text-muted-foreground"
                        : "text-gm-orange"
                    }
                  >
                    {empresa.playas
                      .filter((p) => usuario.playaIds.includes(p.id))
                      .map((p) => p.nombre)
                      .join(", ") || "Sin playa asignada"}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditor({ tipo: "usuario", empresa, usuario })}
                >
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditor({ tipo: "accesos", empresa, usuario })}
                >
                  Asignar playas
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={async () => {
                    const r = await deleteUsuarioEmpresaAction(
                      empresa.id,
                      usuario.id,
                    );
                    if (r.error) toast.error(r.error);
                    else {
                      toast.success("Usuario dado de baja.");
                      await refrescar();
                    }
                  }}
                >
                  Dar de baja
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "actividad" && (
        <ActividadDeEmpresa actividad={actividad} desdeQue={visto} />
      )}

      <div className="overflow-hidden rounded-xl border border-destructive/40">
        <div className="border-b border-destructive/25 p-3 text-sm font-semibold text-gm-orange">
          Acciones sensibles
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <div>
            <p className="font-medium">
              {activa ? "Suspender la empresa" : "Reactivar la empresa"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {activa
                ? `Corta el acceso de sus ${empresa.usuarios.length} usuarios y conserva todos los datos. Reversible.`
                : "Vuelve a habilitar el acceso de sus usuarios."}
            </p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => void suspender()}
            >
              {activa ? "Suspender" : "Reactivar"}
            </Button>
          </div>
          <div>
            <p className="font-medium">Eliminar la empresa</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {eliminacion && !eliminacion.puedeEliminar
                ? `Bloqueado: tiene ${eliminacion.playas ?? 0} playas y ${eliminacion.usuarios} usuarios. Suspendela si querés cortar el acceso.`
                : "Solo si ya no tiene playas ni usuarios. Pide confirmar escribiendo el nombre."}
            </p>
            <Button
              variant="ghost"
              className="mt-3 text-destructive"
              // El backend valida de nuevo al borrar: esto es para no ofrecer un camino cerrado.
              disabled={!!eliminacion && !eliminacion.puedeEliminar}
              onClick={() =>
                setBorrado({
                  tipo: "empresa",
                  id: empresa.id,
                  nombre: empresa.nombre,
                  suspender: activa ? () => suspender() : undefined,
                  ejecutar: () => deleteEmpresaAction(empresa.id),
                })
              }
            >
              Eliminar empresa
            </Button>
          </div>
        </div>
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
          const eraEmpresa = borrado?.tipo === "empresa";
          setBorrado(null);
          toast.success("Listo.");
          // Si se eliminó la empresa que estamos viendo, esta página ya no existe.
          if (eraEmpresa) window.location.assign("/admin/empresas");
          else void refrescar();
        }}
      />
    </div>
  );
}
