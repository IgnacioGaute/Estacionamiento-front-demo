"use client";
import { DataLoading } from '@/components/ui/data-loading';

// La ficha de una empresa en su propia página. Antes era un desplegable dentro del listado: los
// botones para agregar playas y usuarios quedaban escondidos detrás de dos clics y no había
// forma de compartir el enlace de una empresa.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  CreditCard,
  Lock,
  MapPin,
  Pencil,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";
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
  updatePlayaAction,
} from "@/actions/tenancy/tenancy.action";
import { Switch } from "@/components/ui/switch";
import { completar, eje } from "@/utils/serie-diaria";
import {
  EJE,
  Encabezado,
  Escenario,
  EstadoEmpresa,
  Pastilla,
  Pie,
  PuntoVivo,
  Rotulo,
  Segmentos,
  Selector,
  Tarjeta,
  Variacion,
} from "@/components/plataforma/mono";
import { AMARILLO, CREMA, Chispa, Curva, FilaTooltip } from "@/components/plataforma/graficos";
import {
  DIAS_SEMANA,
  DIAS_SEMANA_LARGO,
  colorAvatar,
  corto,
  diaMes,
  fechaCorta,
  haceCuanto,
  iniciales,
  minutosDesde,
  numero,
  plata,
  plural,
  resumir,
  variacion,
} from "@/components/plataforma/formato";
import { Editor, EditorDialog } from "../../components/editor-dialog";
import { Borrado, BorradoDialog } from "../../components/borrado-dialog";
import { ActividadDeEmpresa, cuandoFue, describirActividad } from "./actividad-empresa";
import { PlanDeEmpresa } from "./plan-empresa";
import { PatentesPlayas } from "./patentes-playas";
import { EstadoCuentaPill, diaAR, hoyAR, sufijoPeriodo, textoVencimiento } from "@/components/plataforma/cuenta";

type Tab = "resumen" | "plan" | "playas" | "usuarios" | "actividad";
const TABS: Tab[] = ["resumen", "plan", "playas", "usuarios", "actividad"];

// Tonos para repartir las estadías abiertas entre playas: de la más clara a la más apagada.
const TONOS_PLAYA = [CREMA, "#A59B8D", "#6E6457", "#4A4034"];

function formatoEje(v: number) {
  if (v >= 1e6) {
    const m = v / 1e6;
    return `${numero(m, Number.isInteger(m) ? 0 : 1)} M`;
  }
  if (v >= 1e3) return `${numero(v / 1e3)} k`;
  return numero(v);
}

const botonSecundario =
  "flex h-11 items-center gap-2 rounded-xl border border-border px-3.5 text-[13.5px] font-semibold transition-colors hover:border-gm-line-strong hover:bg-gm-surface-2";
const botonPrimario =
  "flex h-11 items-center gap-2 rounded-xl bg-gm-yellow px-4 text-[13.5px] font-bold text-gm-ink transition-colors hover:bg-[#FFD23A]";
const botonChico =
  "h-8 rounded-[9px] border border-border px-3 text-[12.5px] font-semibold transition-colors hover:border-gm-line-strong hover:bg-gm-surface-2";
const botonPeligro =
  "h-8 rounded-[9px] px-2.5 text-[12.5px] font-semibold text-[#FF7A4D] transition-colors hover:bg-[#FF7A4D]/10";

export function EmpresaDetalle({ empresaId }: { empresaId: string }) {
  const params = useSearchParams();
  const pedida = params.get("tab") as Tab | null;
  const [empresa, setEmpresa] = useState<EmpresaConDetalle | null>(null);
  const [metrics, setMetrics] = useState<PlataformaMetrics | null>(null);
  const [detalle, setDetalle] = useState<MetricsDetalle | null>(null);
  const [eliminacion, setEliminacion] = useState<ResumenEliminacion | null>(null);
  const [actividad, setActividad] = useState<ActividadEmpresa[]>([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>(pedida && TABS.includes(pedida) ? pedida : "resumen");
  const [playaSel, setPlayaSel] = useState("todas");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [borrado, setBorrado] = useState<Borrado | null>(null);
  const [visto, setVisto] = useState<string | null>(null);
  const [abrioActividad, setAbrioActividad] = useState(false);
  const [cambiandoModulo, setCambiandoModulo] = useState<string | null>(null);

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
      <div role="alert" className="rounded-2xl border border-destructive/60 p-6">
        <p>{error}</p>
        <Link href="/admin/empresas" className="mt-3 inline-block text-sm underline">
          Volver a empresas
        </Link>
      </div>
    );
  if (!empresa)
    return (
      <DataLoading label="Cargando la empresa…" />
    );

  const metricasDe = (playaId: string): PlayaMetrics | undefined =>
    metrics?.playas.find((p) => p.playaId === playaId);
  const playas = empresa.playas.map((p) => ({ ...p, m: metricasDe(p.id) }));
  const abiertas = playas.reduce((n, p) => n + (p.m?.estadiasAbiertas ?? 0), 0);
  const turnos = playas.reduce((n, p) => n + (p.m?.turnosAbiertos ?? 0), 0);
  const sinTarifas = playas.filter((p) => p.m && !p.m.tieneTarifas);
  // La operación más reciente de cualquiera de sus playas: dice si la empresa está trabajando.
  const ultimaOperacion =
    playas
      .map((p) => p.m?.ultimaOperacion)
      .filter((f): f is string => !!f)
      .sort()
      .pop() ?? null;
  const minutosUltima = minutosDesde(ultimaOperacion);
  const cobrado =
    detalle?.totales.actual ?? playas.reduce((n, p) => n + (p.m?.cobrado ?? 0), 0);
  const topeCobrado = Math.max(1, ...playas.map((p) => p.m?.cobrado ?? 0));

  const dias30 = eje(30);
  const serieEmpresa = completar(detalle?.serie ?? [], dias30);
  const seriePlaya = (id: string) =>
    completar((detalle?.seriePlayas ?? []).filter((f) => f.playaId === id), dias30);
  const serie = playaSel === "todas" ? serieEmpresa : seriePlaya(playaSel);
  const nombreSerie =
    playaSel === "todas"
      ? `${playas.length === 1 ? "La playa" : `Las ${playas.length} playas`}`
      : (playas.find((p) => p.id === playaSel)?.nombre ?? "");
  const cierres = completar(detalle?.serieEstadias ?? [], dias30);
  const indicePico = serie.reduce((max, v, i) => (v > serie[max] ? i : max), 0);

  const operadores = empresa.usuarios.filter((u) => u.role === "USER");
  const administradores = empresa.usuarios.filter((u) => u.role === "ADMIN");
  const sinPlaya = operadores.filter((u) => !u.playaIds.length);
  const activa = empresa.estado === "ACTIVA";
  const mp = empresa.mercadoPago ?? null;
  const digitales = playas.filter((p) => p.m?.comprobantes?.whatsapp || p.m?.comprobantes?.qr);

  const cuenta = empresa.suscripcion ?? null;
  const planDe = (playaId: string) => cuenta?.planes.find((l) => l.playaId === playaId) ?? null;
  const playasSinPlan = playas.filter((p) => !planDe(p.id));

  // Puesta en marcha: lo que tiene que estar para que la empresa opere, y lo que conviene.
  const puntos = [
    {
      id: "plan",
      titulo: "Plan y vencimiento",
      ok:
        !!cuenta &&
        !playasSinPlan.length &&
        ["PRUEBA", "AL_DIA", "BONIFICADA"].includes(cuenta.estado),
      bloquea: cuenta?.estado === "VENCIDA" || cuenta?.estado === "SUSPENDIDA",
      detalle: !cuenta
        ? "Sin datos de la cuenta"
        : playasSinPlan.length && playas.length
          ? `${plural(playasSinPlan.length, "playa", "playas")} sin plan · ${textoVencimiento(cuenta)}`
          : textoVencimiento(cuenta),
      accion: { label: "Ver", hacer: () => setTab("plan") },
    },
    {
      id: "tarifas",
      titulo: "Tarifas cargadas",
      ok: playas.length > 0 && !sinTarifas.length,
      bloquea: !playas.length || sinTarifas.length > 0,
      detalle: playas.length
        ? `${playas.length - sinTarifas.length} de ${plural(playas.length, "playa", "playas")} ${playas.length - sinTarifas.length === 1 ? "puede" : "pueden"} registrar entradas`
        : "Todavía no tiene playas",
      accion: !playas.length
        ? { label: "Agregar", hacer: () => setEditor({ tipo: "playa", empresa }) }
        : sinTarifas.length
          ? { label: "Ver", hacer: () => setTab("playas") }
          : null,
    },
    {
      id: "operadores",
      titulo: "Operadores con playa",
      ok: operadores.length > 0 && !sinPlaya.length,
      bloquea: sinPlaya.length > 0,
      detalle: operadores.length
        ? `${operadores.length - sinPlaya.length} de ${operadores.length} ${operadores.length - sinPlaya.length === 1 ? "puede" : "pueden"} entrar al sistema`
        : "Todavía no tiene operadores",
      accion: sinPlaya.length
        ? { label: "Asignar", hacer: () => setTab("usuarios") }
        : !operadores.length
          ? { label: "Agregar", hacer: () => setEditor({ tipo: "usuario", empresa }) }
          : null,
    },
    {
      id: "mp",
      titulo: "MercadoPago conectado",
      ok: mp?.estado === "ACTIVA",
      bloquea: mp?.estado === "ERROR",
      detalle:
        mp?.estado === "ACTIVA"
          ? mp.conectadaEl
            ? `Cobra con QR desde el ${diaMes(mp.conectadaEl)}`
            : "Cobra con QR"
          : mp?.estado === "ERROR"
            ? "La cuenta dio error: el admin tiene que reconectarla"
            : mp?.estado === "DESCONECTADA"
              ? "La cuenta se desconectó"
              : "Lo conecta el admin desde Configuración",
      accion: null,
    },
    {
      id: "comprobantes",
      titulo: "Comprobantes digitales",
      ok: playas.length > 0 && digitales.length === playas.length,
      bloquea: false,
      detalle: `${digitales.length} de ${plural(playas.length, "playa", "playas")} ${digitales.length === 1 ? "envía" : "envían"} WhatsApp o QR`,
      accion:
        playas.length && digitales.length < playas.length
          ? { label: "Revisar", hacer: () => setTab("playas") }
          : null,
    },
  ];
  const completos = puntos.filter((p) => p.ok).length;
  const bloqueos = puntos.filter((p) => p.bloquea).length;
  const pendientes = puntos.length - completos - bloqueos;
  const resumenPuntos = bloqueos
    ? `Hay ${bloqueos} ${bloqueos === 1 ? "punto que frena" : "puntos que frenan"} la operación.`
    : completos === puntos.length
      ? "Todo en orden."
      : `Opera sin bloqueos. ${pendientes === 1 ? "Queda una mejora pendiente." : `Quedan ${pendientes} mejoras pendientes.`}`;

  // Secciones opcionales por playa. Se nota al instante en el menú de sus usuarios.
  async function alternarInquilinos(playaId: string, activo: boolean) {
    // El interruptor cambia en el acto y vuelve atrás sólo si el backend lo rechaza: recargar la
    // ficha entera tarda varios segundos y parecía que el clic no había hecho nada.
    const fijar = (valor: boolean) =>
      setEmpresa((e) =>
        e
          ? {
              ...e,
              playas: e.playas.map((p) =>
                p.id === playaId ? { ...p, modulos: { ...p.modulos, inquilinos: valor } } : p,
              ),
            }
          : e,
      );
    fijar(activo);
    setCambiandoModulo(playaId);
    const r = await updatePlayaAction(playaId, { modulos: { inquilinos: activo } });
    setCambiandoModulo(null);
    if (r.error) {
      fijar(!activo);
      toast.error(r.error);
      return;
    }
    toast.success(
      activo
        ? "Inquilinos habilitado: ya aparece en el menú de la playa."
        : "Inquilinos deshabilitado. Sus datos se conservan.",
    );
    void refrescar();
  }

  async function suspender() {
    if (!empresa) return { error: "Empresa no disponible." };
    const r = await updateEmpresaAction(empresa.id, {
      estado: activa ? "SUSPENDIDA" : "ACTIVA",
    });
    if (r.error) toast.error(r.error);
    else {
      toast.success(
        activa ? "Empresa suspendida: solo puede registrar salidas y cerrar el turno." : "Empresa reactivada.",
      );
      await refrescar();
    }
    return r;
  }

  // Lo no visto se marca contra la última visita a la solapa, guardada por empresa en este
  // navegador. El contador se apaga al entrar, pero las marcas «Nuevo» quedan toda la visita:
  // si desaparecieran al instante no se llegarían a leer.
  const sinVer = abrioActividad ? 0 : actividad.filter((a) => !visto || a.fecha > visto).length;
  const tabs: { id: Tab; label: string; aviso?: number }[] = [
    { id: "resumen", label: "Resumen" },
    { id: "plan", label: "Plan" },
    { id: "playas", label: `Playas · ${empresa.playas.length}` },
    { id: "usuarios", label: `Usuarios · ${empresa.usuarios.length}` },
    { id: "actividad", label: "Actividad", aviso: sinVer },
  ];
  const turnosPorPlaya = playas
    .filter((p) => (p.m?.turnosAbiertos ?? 0) > 0)
    .sort((a, b) => (b.m?.turnosAbiertos ?? 0) - (a.m?.turnosAbiertos ?? 0));

  return (
    <div className="space-y-5">
      {/* La ruta completa ya está en la barra superior: acá sólo la salida. */}
      <Link href="/admin/empresas" className={`${botonSecundario} h-9 w-fit rounded-[10px] px-3 text-[13px]`}>
        <ArrowLeft className="size-[15px]" />
        Empresas
      </Link>

      <section className="overflow-hidden rounded-3xl border border-border bg-gm-surface">
        <div aria-hidden className="gm-stripes h-1.5" />
        <div className="flex flex-col gap-5 p-5 sm:px-6 sm:py-[22px] lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-5">
            <span
              aria-hidden
              className="flex size-[72px] shrink-0 items-center justify-center rounded-[20px] border border-gm-line-strong font-display text-[28px] font-semibold text-gm-yellow"
              style={{ background: colorAvatar(empresa.id) }}
            >
              {iniciales(empresa.nombre)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="break-words font-display text-[32px] font-semibold leading-none tracking-[0.01em] sm:text-[38px]">
                  {empresa.nombre}
                </h1>
                <EstadoEmpresa estado={empresa.estado} />
                {/* Suspendida o de baja ya lo dice el estado de la empresa: no se repite. */}
                {cuenta && empresa.estado === "ACTIVA" && (
                  <button type="button" onClick={() => setTab("plan")} title="Ver el plan">
                    <EstadoCuentaPill cuenta={cuenta} />
                  </button>
                )}
                {mp?.estado === "ACTIVA" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7E86F0]/[0.14] px-2.5 py-1 text-xs font-bold text-[#A9AFFF]">
                    <Check aria-hidden className="size-[13px]" strokeWidth={2.5} />
                    MercadoPago conectado
                  </span>
                )}
                {mp?.estado === "ERROR" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF7A4D]/[0.14] px-2.5 py-1 text-xs font-bold text-[#FF7A4D]">
                    <AlertTriangle aria-hidden className="size-[13px]" />
                    MercadoPago con error
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-[18px] gap-y-1.5 text-[13px] text-muted-foreground">
                <span className="flex items-center gap-[7px]">
                  <CalendarDays aria-hidden className="size-3.5" />
                  Alta {cuenta ? diaAR(cuenta.alta) : fechaCorta(empresa.createdAt)}
                </span>
                <span className={`flex items-center gap-[7px] ${minutosUltima !== null && minutosUltima <= 15 ? "text-foreground" : ""}`}>
                  {minutosUltima !== null && minutosUltima <= 15 && <PuntoVivo className="size-[7px]" />}
                  {ultimaOperacion ? `Última operación ${haceCuanto(ultimaOperacion)}` : "Todavía sin operación"}
                </span>
                <span className="flex items-center gap-[7px]">
                  <MapPin aria-hidden className="size-3.5" />
                  {plural(empresa.playas.length, "playa", "playas")}
                </span>
                {cuenta && cuenta.mensual > 0 && (
                  <span className="flex items-center gap-[7px]">
                    <CreditCard aria-hidden className="size-3.5" />
                    {plata(cuenta.importePeriodo)}
                    {sufijoPeriodo(cuenta.periodo.meses)}
                    {cuenta.proximoVencimiento && cuenta.estado !== "BONIFICADA"
                      ? ` · vence ${diaAR(cuenta.proximoVencimiento, false)}`
                      : ""}
                  </span>
                )}
                <span className="flex items-center gap-[7px]">
                  <Users aria-hidden className="size-3.5" />
                  {plural(empresa.usuarios.length, "usuario", "usuarios")}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button type="button" className={botonSecundario} onClick={() => setEditor({ tipo: "empresa", empresa })}>
              <Pencil className="size-[15px]" />
              Editar datos
            </button>
            <button type="button" className={botonSecundario} onClick={() => setEditor({ tipo: "playa", empresa })}>
              <MapPin className="size-[15px]" />
              Agregar playa
            </button>
            <button type="button" className={botonPrimario} onClick={() => setEditor({ tipo: "usuario", empresa })}>
              <UserPlus className="size-[15px]" />
              Agregar usuario
            </button>
          </div>
        </div>
      </section>

      <div role="tablist" aria-label="Secciones de la empresa" className="flex gap-1 overflow-x-auto border-b border-[#2E2A23]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px flex h-12 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-bold transition-colors ${
              tab === t.id
                ? "border-gm-yellow text-gm-yellow"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {!!t.aviso && (
              <span
                // El contador se apaga al entrar a la solapa: marca lo que todavía no viste.
                title={`${t.aviso} movimiento(s) sin ver`}
                className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gm-yellow px-1.5 text-[11px] font-extrabold tabular-nums text-gm-ink"
              >
                {t.aviso}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "resumen" && (
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <Tarjeta className="min-h-[150px] justify-between gap-3 overflow-hidden pt-4">
              <div className="flex items-center justify-between">
                <Rotulo>Cobrado · 30 días</Rotulo>
                <Variacion
                  valor={detalle ? variacion(detalle.totales.actual, detalle.totales.anterior) : null}
                  decimales={0}
                />
              </div>
              <span className="font-display text-[34px] font-semibold leading-none text-gm-yellow">
                {metrics || detalle ? corto(cobrado) : "—"}
              </span>
              <Chispa valores={resumir(serieEmpresa)} color={AMARILLO} alto={30} />
            </Tarjeta>
            <Tarjeta className="min-h-[150px] justify-between gap-3 pt-4">
              <div className="flex items-center justify-between">
                <Rotulo>Estadías abiertas</Rotulo>
                <Pastilla tono="verde" vivo>
                  En vivo
                </Pastilla>
              </div>
              <span className="font-display text-[34px] font-semibold leading-none">{numero(abiertas)}</span>
              {abiertas > 0 ? (
                <div
                  className="flex gap-[3px]"
                  role="img"
                  aria-label={playas.map((p) => `${p.nombre} ${p.m?.estadiasAbiertas ?? 0}`).join(", ")}
                >
                  {playas
                    .filter((p) => (p.m?.estadiasAbiertas ?? 0) > 0)
                    .map((p, i) => (
                      <span
                        key={p.id}
                        title={`${p.nombre} · ${p.m?.estadiasAbiertas}`}
                        className="h-2 rounded-full"
                        style={{
                          flexGrow: p.m?.estadiasAbiertas ?? 0,
                          background: TONOS_PLAYA[i % TONOS_PLAYA.length],
                        }}
                      />
                    ))}
                </div>
              ) : (
                <span className="font-mono text-[11px]" style={{ color: EJE }}>
                  Ningún vehículo adentro
                </span>
              )}
            </Tarjeta>
            <Tarjeta className="min-h-[150px] justify-between gap-3 pt-4">
              <Rotulo>Turnos en curso</Rotulo>
              <span className="font-display text-[34px] font-semibold leading-none">{turnos}</span>
              <span className="truncate border-t border-[#2E2A23] pt-2 font-mono text-[11px]" style={{ color: EJE }}>
                {turnosPorPlaya.length
                  ? turnosPorPlaya.map((p) => `${p.nombre} ${p.m?.turnosAbiertos}`).join(" · ")
                  : "Ninguna caja abierta"}
              </span>
            </Tarjeta>
            <Tarjeta className="min-h-[150px] justify-between gap-3 pt-4">
              <Rotulo>Registros de operación</Rotulo>
              <span className="font-display text-[34px] font-semibold leading-none">
                {eliminacion === null ? "—" : numero(eliminacion.registros)}
              </span>
              <span className="border-t border-[#2E2A23] pt-2 font-mono text-[11px]" style={{ color: EJE }}>
                {eliminacion?.registros ? "Bloquean el borrado de la empresa" : "Tickets, movimientos y turnos"}
              </span>
            </Tarjeta>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Tarjeta className="min-h-[360px] lg:col-span-2">
              <Encabezado
                rotulo="Cobrado por día"
                pastilla={<Pastilla>Onda</Pastilla>}
                valor={corto(serie.reduce((n, v) => n + v, 0))}
                unidad={`${nombreSerie} · 30 días`}
                derecha={
                  playas.length > 1 && playas.length <= 5 ? (
                    <Segmentos
                      etiqueta="Playa"
                      redondo
                      claro
                      opciones={[
                        { id: "todas", label: "Todas" },
                        ...playas.map((p) => ({ id: p.id, label: p.nombre.split(" ")[0] })),
                      ]}
                      valor={playaSel}
                      onChange={setPlayaSel}
                    />
                  ) : playas.length > 5 ? (
                    <Selector
                      ariaLabel="Playa"
                      redondo
                      valor={playaSel}
                      opciones={[
                        { id: "todas", label: "Todas las playas" },
                        ...playas.map((p) => ({ id: p.id, label: p.nombre })),
                      ]}
                      onChange={setPlayaSel}
                    />
                  ) : null
                }
              />
              <Escenario className="pl-1.5 pr-[18px] pt-3.5">
                <Curva
                  serie={serie}
                  alto={180}
                  marcas={3}
                  area={0.45}
                  ejeX={dias30.map((d) => `${DIAS_SEMANA[d.day()]} ${d.format("DD/MM")}`)}
                  formatoEje={formatoEje}
                  ariaLabel={`Cobrado por día en los últimos 30 días, ${nombreSerie}`}
                  tooltip={(i) => (
                    <>
                      <div className="border-b border-border pb-1.5 font-mono text-[10.5px] text-muted-foreground">
                        {DIAS_SEMANA[dias30[i].day()]} {dias30[i].format("DD/MM")}
                      </div>
                      <FilaTooltip label="Cobrado" valor={plata(serie[i])} />
                      {playaSel === "todas" && (
                        <FilaTooltip label="Estadías" valor={numero(cierres[i])} tenue />
                      )}
                    </>
                  )}
                />
              </Escenario>
              <Pie
                izquierda={
                  serie[indicePico]
                    ? `Día más alto · ${DIAS_SEMANA_LARGO[dias30[indicePico].day()].toLowerCase()} ${dias30[indicePico].format("DD/MM")}`
                    : "Sin cobros en los últimos 30 días"
                }
                derecha={serie[indicePico] ? plata(serie[indicePico]) : ""}
              />
            </Tarjeta>

            <Tarjeta className="min-h-[360px] pb-3.5">
              <div className="flex items-center gap-3.5">
                <div className="relative size-16 shrink-0">
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 100 100"
                    role="img"
                    aria-label={`Configuración completa en ${completos} de ${puntos.length} puntos`}
                  >
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#221F1A" strokeWidth={11} />
                    {completos > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={AMARILLO}
                        strokeWidth={11}
                        strokeLinecap="round"
                        strokeDasharray={`${(2 * Math.PI * 40 * (completos / puntos.length)).toFixed(1)} ${(2 * Math.PI * 40).toFixed(1)}`}
                        transform="rotate(-90 50 50)"
                      />
                    )}
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center font-display text-[17px] font-semibold">
                    {completos}/{puntos.length}
                  </span>
                </div>
                <div>
                  <Rotulo>Estado de configuración</Rotulo>
                  <p className="mt-1 text-[13px] leading-snug text-[#C9BFB1]">{resumenPuntos}</p>
                </div>
              </div>
              <ul className="mt-4 flex flex-1 flex-col gap-2">
                {puntos.map((p) => (
                  <li
                    key={p.id}
                    className={`flex items-center gap-3 rounded-[14px] border bg-background px-3 py-2.5 ${
                      p.ok || p.bloquea ? "border-[#26221C]" : "border-dashed border-gm-line-strong"
                    }`}
                  >
                    {p.ok ? (
                      <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-emerald-400/[0.14]">
                        <Check aria-label="Listo" className="size-3.5 text-emerald-400" strokeWidth={3} />
                      </span>
                    ) : p.bloquea ? (
                      <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[#FF7A4D]/[0.14]">
                        <AlertTriangle aria-label="Frena la operación" className="size-3.5 text-[#FF7A4D]" />
                      </span>
                    ) : (
                      <span
                        aria-label="Pendiente"
                        role="img"
                        className="size-[26px] shrink-0 rounded-full border-2 border-dashed border-muted-foreground"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold">{p.titulo}</div>
                      <div className="text-xs" style={{ color: EJE }}>
                        {p.detalle}
                      </div>
                    </div>
                    {p.accion && (
                      <button type="button" onClick={p.accion.hacer} className={`${botonChico} h-[30px] shrink-0 px-2.5 text-xs`}>
                        {p.accion.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </Tarjeta>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Tarjeta className="min-h-[340px] lg:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Rotulo>Playas</Rotulo>
                  <Pastilla>Ahora · 30 días</Pastilla>
                </div>
                <button
                  type="button"
                  onClick={() => setTab("playas")}
                  className="text-[12.5px] font-semibold text-gm-yellow hover:text-[#FFD84D]"
                >
                  Gestionar playas →
                </button>
              </div>
              {!playas.length ? (
                <div className="m-auto flex flex-col items-center gap-3 py-8 text-center">
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Todavía no hay playas. Cada playa lleva sus propios tickets, tarifas, caja y turnos.
                  </p>
                  <button type="button" className={botonPrimario} onClick={() => setEditor({ tipo: "playa", empresa })}>
                    <Plus className="size-4" />
                    Agregar playa
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[620px]">
                    <div
                      className="mt-3 grid grid-cols-[minmax(0,1fr)_100px_80px_80px_230px] gap-3 px-3.5 font-mono text-[10px] tracking-[0.1em]"
                      style={{ color: EJE }}
                    >
                      <span>PLAYA</span>
                      <span>ESTADO</span>
                      <span>ABIERTAS</span>
                      <span>TURNOS</span>
                      <span>COBRADO 30 D</span>
                    </div>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {playas.map((p, i) => (
                        <div
                          key={p.id}
                          className="grid h-14 grid-cols-[minmax(0,1fr)_100px_80px_80px_230px] items-center gap-3 rounded-[14px] border border-[#26221C] bg-background px-3.5"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-[13.5px] font-semibold">{p.nombre}</div>
                            <div className="truncate text-xs" style={{ color: EJE }}>
                              {p.direccion || "Sin dirección cargada"}
                            </div>
                          </div>
                          <EstadoPlaya conTarifas={p.m?.tieneTarifas !== false} />
                          <span className="font-display text-lg font-semibold">{p.m?.estadiasAbiertas ?? 0}</span>
                          <span className="font-display text-lg font-semibold">{p.m?.turnosAbiertos ?? 0}</span>
                          <div className="flex items-center gap-2.5">
                            <div className="h-2 flex-1 rounded-full bg-[#221F1A]">
                              <div
                                className="h-2 rounded-full"
                                style={{
                                  width: `${Math.max(2, ((p.m?.cobrado ?? 0) / topeCobrado) * 100)}%`,
                                  background: i === 0 ? AMARILLO : CREMA,
                                }}
                              />
                            </div>
                            <span className="w-[70px] text-right text-[13px] font-semibold tabular-nums">
                              {corto(p.m?.cobrado ?? 0)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Tarjeta>

            <Tarjeta className="min-h-[340px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Rotulo>Actividad reciente</Rotulo>
                  {sinVer > 0 && (
                    <Pastilla tono="lleno">
                      {sinVer} {sinVer === 1 ? "nueva" : "nuevas"}
                    </Pastilla>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setTab("actividad")}
                  className="text-[12.5px] font-semibold text-gm-yellow hover:text-[#FFD84D]"
                >
                  Ver todo →
                </button>
              </div>
              {!actividad.length ? (
                <p className="m-auto text-center text-sm text-muted-foreground">
                  Todavía no hay movimientos.
                </p>
              ) : (
                <ol className="mt-3.5 flex flex-col">
                  {actividad.slice(0, 5).map((a, i) => {
                    const d = describirActividad(a);
                    const nueva = !!visto && a.fecha > visto;
                    return (
                      <li key={`${a.fecha}-${i}`} className="flex gap-3">
                        <div className="flex w-3 shrink-0 flex-col items-center">
                          <span
                            aria-hidden
                            className="mt-1 size-2.5 rounded-full shadow-[0_0_0_3px_hsl(var(--gm-surface))]"
                            style={{ background: nueva || (!visto && i < sinVer) ? AMARILLO : "#53493C" }}
                          />
                          <span aria-hidden className="w-px flex-1 bg-border" />
                        </div>
                        <div className="min-w-0 pb-3">
                          <div className="text-[12.5px] leading-snug">
                            <span className="font-bold">{d.quien}</span>{" "}
                            <span className="text-[#C9BFB1]">{d.que}</span>
                          </div>
                          <div className="mt-[3px] font-mono text-[10.5px]" style={{ color: EJE }}>
                            {cuandoFue(a.fecha)} · {a.playa ?? "toda la empresa"}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Tarjeta>
          </div>
        </div>
      )}

      {tab === "playas" && (
        <section className="overflow-hidden rounded-[22px] border border-border bg-gm-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2E2A23] px-5 py-4">
            <div>
              <h2 className="font-display text-[22px] font-semibold">
                {empresa.playas.length} {empresa.playas.length === 1 ? "playa" : "playas"}
              </h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Cada playa lleva sus propios tickets, tarifas, caja y turnos.
              </p>
            </div>
            <button type="button" className={`${botonPrimario} h-10`} onClick={() => setEditor({ tipo: "playa", empresa })}>
              <Plus className="size-[15px]" />
              Agregar playa
            </button>
          </div>
          {!empresa.playas.length ? (
            <p className="p-10 text-center text-sm text-muted-foreground">
              Todavía no hay playas. Agregá la primera para que la empresa pueda operar.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <div role="table" aria-label="Playas de la empresa" className="min-w-[1180px]">
                <div
                  role="row"
                  className="grid h-[42px] grid-cols-[minmax(0,1fr)_110px_80px_70px_90px_130px_150px_130px_160px] items-center gap-3 bg-[#15120E] px-5 font-mono text-[10.5px] tracking-[0.1em]"
                  style={{ color: EJE }}
                >
                  <span role="columnheader">PLAYA</span>
                  <span role="columnheader">ESTADO</span>
                  <span role="columnheader">ABIERTAS</span>
                  <span role="columnheader">TURNOS</span>
                  <span role="columnheader">OPERADORES</span>
                  <span role="columnheader">COBRADO 30 D</span>
                  <span role="columnheader">COMPROBANTES</span>
                  <span role="columnheader">SECCIONES</span>
                  <span role="columnheader" className="sr-only">
                    Acciones
                  </span>
                </div>
                {playas.map((p, i) => {
                  const canales = [
                    p.m?.comprobantes?.whatsapp && "WhatsApp",
                    p.m?.comprobantes?.qr && "QR",
                    p.m?.comprobantes?.print && "Impresión",
                  ].filter((c): c is string => !!c);
                  return (
                    <div
                      key={p.id}
                      role="row"
                      className="grid h-[76px] grid-cols-[minmax(0,1fr)_110px_80px_70px_90px_130px_150px_130px_160px] items-center gap-3 border-t border-[#2B2620] px-5 text-[13.5px] transition-colors hover:bg-[#1E1A14]"
                    >
                      <span role="cell" className="min-w-0">
                        <span className="block truncate font-semibold">{p.nombre}</span>
                        <span className="mt-[3px] block truncate text-xs" style={{ color: EJE }}>
                          {p.direccion || "Sin dirección cargada"}
                        </span>
                      </span>
                      <span role="cell">
                        <EstadoPlaya conTarifas={p.m?.tieneTarifas !== false} />
                      </span>
                      <span role="cell" className="font-semibold">{p.m?.estadiasAbiertas ?? 0}</span>
                      <span role="cell" className="font-semibold">{p.m?.turnosAbiertos ?? 0}</span>
                      <span role="cell" className="font-semibold">
                        {operadores.filter((u) => u.playaIds.includes(p.id)).length}
                      </span>
                      <span role="cell" className="flex flex-col gap-1.5">
                        <span className="font-semibold tabular-nums">{corto(p.m?.cobrado ?? 0)}</span>
                        <span className="h-[5px] rounded-full bg-[#221F1A]">
                          <span
                            className="block h-[5px] rounded-full"
                            style={{
                              width: `${Math.max(2, ((p.m?.cobrado ?? 0) / topeCobrado) * 100)}%`,
                              background: i === 0 ? AMARILLO : CREMA,
                            }}
                          />
                        </span>
                      </span>
                      <span role="cell" className="flex flex-wrap gap-[5px]">
                        {canales.length ? (
                          canales.map((c) => (
                            <span
                              key={c}
                              className={`rounded-full px-2 py-[3px] text-[11px] font-semibold ${
                                c === "Impresión" ? "bg-[#221F1A] text-muted-foreground" : "bg-gm-yellow/[0.12] text-gm-yellow"
                              }`}
                            >
                              {c}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11.5px]" style={{ color: EJE }}>
                            Sin configurar
                          </span>
                        )}
                      </span>
                      <span role="cell">
                        <label
                          className="flex cursor-pointer items-center gap-2 text-[12.5px]"
                          title={
                            planDe(p.id)
                              ? `Lo define el plan ${planDe(p.id)?.plan}: cambialo en la solapa Plan`
                              : "Muestra la sección Inquilinos (cuenta corriente, recibos y cobros) en esta playa"
                          }
                        >
                          <Switch
                            checked={!!p.modulos?.inquilinos}
                            disabled={cambiandoModulo === p.id || !!planDe(p.id)}
                            onCheckedChange={(v) => void alternarInquilinos(p.id, v)}
                            className="h-5 w-9 data-[state=checked]:bg-gm-yellow [&>span]:size-4 [&>span]:data-[state=checked]:translate-x-4"
                          />
                          <span className={p.modulos?.inquilinos ? "font-semibold" : "text-muted-foreground"}>
                            Inquilinos
                            {planDe(p.id) && (
                              <span className="block text-[10.5px] font-normal" style={{ color: EJE }}>
                                según el plan
                              </span>
                            )}
                          </span>
                        </label>
                      </span>
                      <span role="cell" className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          className={botonChico}
                          onClick={() => setEditor({ tipo: "playa", empresa, playa: p })}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className={botonPeligro}
                          onClick={() =>
                            setBorrado({
                              tipo: "playa",
                              id: p.id,
                              nombre: p.nombre,
                              ejecutar: () => deletePlayaAction(p.id),
                            })
                          }
                        >
                          Eliminar
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}
      {tab === "playas" && empresa.playas.length > 0 && <PatentesPlayas empresaId={empresa.id} />}

      {tab === "usuarios" && (
        <section className="overflow-hidden rounded-[22px] border border-border bg-gm-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2E2A23] px-5 py-4">
            <div>
              <h2 className="font-display text-[22px] font-semibold">
                {empresa.usuarios.length} {empresa.usuarios.length === 1 ? "usuario" : "usuarios"}
              </h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {administradores.length} {administradores.length === 1 ? "administrador" : "administradores"} ·{" "}
                {operadores.length} {operadores.length === 1 ? "operador" : "operadores"}
                {sinPlaya.length ? (
                  <span className="text-[#FF7A4D]">, {sinPlaya.length} sin playa asignada</span>
                ) : operadores.length ? (
                  ", todos con playa asignada"
                ) : (
                  ""
                )}
              </p>
            </div>
            <button type="button" className={`${botonPrimario} h-10`} onClick={() => setEditor({ tipo: "usuario", empresa })}>
              <Plus className="size-[15px]" />
              Agregar usuario
            </button>
          </div>
          {!empresa.usuarios.length ? (
            <p className="p-10 text-center text-sm text-muted-foreground">
              Agregá al administrador y a los operadores de esta empresa.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <div role="table" aria-label="Usuarios de la empresa" className="min-w-[900px]">
                <div
                  role="row"
                  className="grid h-[42px] grid-cols-[minmax(0,1fr)_130px_minmax(0,1fr)_290px] items-center gap-3 bg-[#15120E] px-5 font-mono text-[10.5px] tracking-[0.1em]"
                  style={{ color: EJE }}
                >
                  <span role="columnheader">USUARIO</span>
                  <span role="columnheader">ROL</span>
                  <span role="columnheader">PLAYAS</span>
                  <span role="columnheader" className="sr-only">
                    Acciones
                  </span>
                </div>
                {empresa.usuarios.map((u) => {
                  const admin = u.role === "ADMIN";
                  const suyas = empresa.playas.filter((p) => u.playaIds.includes(p.id));
                  return (
                    <div
                      key={u.id}
                      role="row"
                      className="grid min-h-[62px] grid-cols-[minmax(0,1fr)_130px_minmax(0,1fr)_290px] items-center gap-3 border-t border-[#2B2620] px-5 py-2 text-[13.5px] transition-colors hover:bg-[#1E1A14]"
                    >
                      <span role="cell" className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden
                          className={`flex size-[34px] shrink-0 items-center justify-center rounded-full font-display text-[13px] font-semibold ${
                            admin ? "bg-gm-yellow text-gm-ink" : "bg-[#2B2620] text-[#E9E1D4]"
                          }`}
                        >
                          {`${u.firstName[0] ?? ""}${u.lastName[0] ?? ""}`.toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">
                            {u.firstName} {u.lastName}
                          </span>
                          <span className="mt-0.5 block truncate font-mono text-[11px]" style={{ color: EJE }}>
                            @{u.username} · {u.email}
                          </span>
                        </span>
                      </span>
                      <span role="cell">
                        <span
                          className={`rounded-full px-2.5 py-[3px] text-[11.5px] font-bold ${
                            admin ? "bg-gm-yellow/[0.14] text-gm-yellow" : "bg-[#221F1A] text-[#C9BFB1]"
                          }`}
                        >
                          {admin ? "Admin" : "Operador"}
                        </span>
                      </span>
                      <span role="cell" className="flex flex-wrap gap-[5px]">
                        {suyas.length ? (
                          suyas.map((p) => (
                            <span
                              key={p.id}
                              className="rounded-full border border-border px-2.5 py-[3px] text-[11.5px] text-[#C9BFB1]"
                            >
                              {p.nombre}
                            </span>
                          ))
                        ) : (
                          <span
                            className={`flex items-center gap-1.5 text-[12px] ${admin ? "" : "text-[#FF7A4D]"}`}
                            style={admin ? { color: EJE } : undefined}
                          >
                            {!admin && <AlertTriangle aria-hidden className="size-3.5" />}
                            Sin playa asignada
                          </span>
                        )}
                      </span>
                      <span role="cell" className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          className={botonChico}
                          onClick={() => setEditor({ tipo: "usuario", empresa, usuario: u })}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className={botonChico}
                          onClick={() => setEditor({ tipo: "accesos", empresa, usuario: u })}
                        >
                          Asignar playas
                        </button>
                        <button
                          type="button"
                          className={botonPeligro}
                          onClick={async () => {
                            const r = await deleteUsuarioEmpresaAction(empresa.id, u.id);
                            if (r.error) toast.error(r.error);
                            else {
                              toast.success("Usuario dado de baja.");
                              await refrescar();
                            }
                          }}
                        >
                          Dar de baja
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {tab === "plan" && <PlanDeEmpresa empresa={empresa} alCambiar={() => void refrescar()} />}

      {tab === "actividad" && <ActividadDeEmpresa actividad={actividad} desdeQue={visto} />}

      <section className="overflow-hidden rounded-[22px] border border-[#FF7A4D]/35 bg-[#17140F]">
        <div className="flex items-center gap-2 border-b border-[#FF7A4D]/20 px-5 py-3 text-[11px] font-bold tracking-[0.12em] text-[#FF7A4D]">
          <AlertTriangle aria-hidden className="size-3.5" />
          ACCIONES SENSIBLES
        </div>
        <div className="grid md:grid-cols-2">
          <div className="flex items-center gap-4 border-b border-[#FF7A4D]/20 px-5 py-[18px] md:border-b-0 md:border-r">
            <div className="flex-1">
              <div className="text-sm font-bold">{activa ? "Suspender la empresa" : "Reactivar la empresa"}</div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                {activa
                  ? "Sus usuarios solo van a poder ver el aviso, cobrar las salidas de los autos que quedaron adentro y cerrar el turno. Conserva todos los datos y se puede revertir."
                  : cuenta?.motivoSuspension === "FALTA_DE_PAGO" && !!cuenta.suspendeEl && cuenta.suspendeEl <= hoyAR()
                    ? "Está suspendida por falta de pago: si la reactivás sin registrar el pago ni darle una prórroga, la revisión diaria la vuelve a suspender."
                    : "Vuelve a habilitar el acceso de sus usuarios."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void suspender()}
              className="h-[38px] shrink-0 rounded-[10px] border border-[#FF7A4D]/50 px-3.5 text-[13px] font-bold text-[#FF7A4D] transition-colors hover:bg-[#FF7A4D]/10"
            >
              {activa ? "Suspender" : "Reactivar"}
            </button>
          </div>
          <div className="flex items-center gap-4 px-5 py-[18px]">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm font-bold">
                Eliminar la empresa
                {eliminacion && !eliminacion.puedeEliminar && (
                  <Lock aria-hidden className="size-[13px] text-muted-foreground" />
                )}
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                {eliminacion && !eliminacion.puedeEliminar
                  ? `Bloqueado: tiene ${plural(eliminacion.playas ?? 0, "playa", "playas")}, ${plural(eliminacion.usuarios, "usuario", "usuarios")} (contando los dados de baja) y ${plural(eliminacion.registros, "registro", "registros")}. Suspendela si querés cortar el acceso.`
                  : "Solo si ya no tiene playas ni usuarios. Pide confirmar escribiendo el nombre."}
              </p>
            </div>
            <button
              type="button"
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
              className="h-[38px] shrink-0 rounded-[10px] border border-[#FF7A4D]/50 px-3.5 text-[13px] font-bold text-[#FF7A4D] transition-colors hover:bg-[#FF7A4D]/10 disabled:cursor-not-allowed disabled:border-[#2E2A23] disabled:text-[#6E6457] disabled:hover:bg-transparent"
            >
              Eliminar
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

function EstadoPlaya({ conTarifas }: { conTarifas: boolean }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11.5px] font-bold ${
        conTarifas ? "bg-emerald-400/[0.12] text-emerald-400" : "bg-[#FF7A4D]/[0.14] text-[#FF7A4D]"
      }`}
    >
      <span aria-hidden className={`size-1.5 rounded-full ${conTarifas ? "bg-emerald-400" : "bg-[#FF7A4D]"}`} />
      {conTarifas ? "Operando" : "Sin tarifas"}
    </span>
  );
}
