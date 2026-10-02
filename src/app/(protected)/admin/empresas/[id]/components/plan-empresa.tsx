"use client";
import { DataLoading } from '@/components/ui/data-loading';

// La solapa «Plan» de la ficha de una empresa. Arriba, en qué está la cuenta y qué hacer; abajo el
// ciclo (alta → prueba → vencimiento → suspensión) con hoy marcado, el plan de cada playa con las
// mismas tarjetas que la landing, el uso de la playa (solo lo ve el super admin), los pagos y el
// historial. El estado no se elige: sale de las fechas, igual que en el backend, así que la
// pantalla nunca dice algo distinto de lo que la tarea diaria va a hacer.

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarDays,
  CalendarPlus,
  Check,
  Gift,
  Pencil,
  Receipt,
  RefreshCw,
  Rocket,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppDatePicker } from "@/components/app-date-picker";
import { EmpresaConDetalle } from "@/types/tenancy.type";
import {
  DetalleSuscripcion,
  FacturaSaas,
  MedioPagoSaas,
  Plan,
  ResumenCuenta,
  UsoPlaya,
} from "@/types/suscripcion.type";
import {
  activarCuentaAction,
  anularPagoAction,
  asignarPlanAction,
  darDiasExtraAction,
  editarSuscripcionAction,
  getPlanesAction,
  getSuscripcionAction,
  registrarPagoAction,
} from "@/actions/suscripciones/suscripciones.action";
import { EJE, Pastilla, Rotulo, Segmentos, Tarjeta } from "@/components/plataforma/mono";
import { numero, plural } from "@/components/plataforma/formato";
import { TarjetasPlan } from "@/components/plataforma/tarjetas-plan";
import {
  COLORES_CUENTA,
  DESCUENTO_PLAYA_ADICIONAL,
  DIAS_DE_GRACIA,
  EstadoCuentaPill,
  MEDIOS_PAGO,
  agruparPlanes,
  diaAR,
  diasEntreAR,
  hoyAR,
  pesos,
  sumarDiasAR,
  sumarMesesAR,
} from "@/components/plataforma/cuenta";
import { cuandoFue } from "./actividad-empresa";

const botonSecundario =
  "flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-[13.5px] font-semibold transition-colors hover:border-gm-line-strong hover:bg-gm-surface-2 disabled:opacity-50";
const botonPrimario =
  "flex h-11 items-center justify-center gap-2 rounded-xl bg-gm-yellow px-5 text-[13.5px] font-bold text-gm-ink transition-colors hover:bg-[#FFD23A] disabled:opacity-50";
const botonChico =
  "h-8 rounded-[9px] border border-border px-3 text-[12.5px] font-semibold transition-colors hover:border-gm-line-strong hover:bg-gm-surface-2 disabled:opacity-50";

type Accion =
  | { tipo: "alta" }
  | { tipo: "fechaAlta" }
  | { tipo: "diasExtra" }
  | { tipo: "pago" }
  | { tipo: "pagadoHasta" }
  | { tipo: "anular"; factura: FacturaSaas };

const enDias = (n: number) => (n === 1 ? "1 día" : `${n} días`);

export function PlanDeEmpresa({
  empresa,
  alCambiar,
}: {
  empresa: EmpresaConDetalle;
  alCambiar: () => void;
}) {
  const [detalle, setDetalle] = useState<DetalleSuscripcion | null>(null);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [error, setError] = useState("");
  const [accion, setAccion] = useState<Accion | null>(null);

  const cargar = useCallback(async () => {
    const [d, p] = await Promise.all([getSuscripcionAction(empresa.id), getPlanesAction()]);
    if (d.data) {
      setDetalle(d.data);
      setError("");
    } else setError(d.error ?? "No se pudo cargar el plan de la empresa.");
    setPlanes(p.data ?? []);
  }, [empresa.id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Cada acción devuelve el detalle ya actualizado: se pinta en el acto y se avisa a la ficha,
  // que muestra el estado en el encabezado.
  const aplicar = useCallback(
    (d: DetalleSuscripcion, aviso: string) => {
      setDetalle(d);
      toast.success(aviso);
      alCambiar();
    },
    [alCambiar],
  );

  if (error)
    return (
      <p role="alert" className="rounded-2xl border border-destructive/60 p-6 text-sm">
        {error}
      </p>
    );
  if (!detalle)
    return (
      <DataLoading label="Cargando el plan…" />
    );

  const { cuenta } = detalle;
  const ultimoPagado = detalle.facturas.find(
    (f) => f.estado === "PAGADA" && f.hasta === cuenta.pagadoHasta,
  );

  return (
    <div className="space-y-5">
      <EstadoDeCuenta cuenta={cuenta} sinPlan={detalle.playas.filter((p) => !p.plan).length} accion={setAccion} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <PlanesDePlayas
          empresaId={empresa.id}
          playas={detalle.playas}
          planes={planes}
          alGuardar={(d) => aplicar(d, "Plan guardado.")}
        />
        <div className="flex flex-col gap-5">
          <UsoDePlayas playas={detalle.playas} />
          <Ajustes empresaId={empresa.id} detalle={detalle} accion={setAccion} aplicar={aplicar} />
        </div>
      </div>

      <Facturas
        facturas={detalle.facturas}
        ultimoPagado={ultimoPagado?.id ?? null}
        accion={setAccion}
      />

      <Historial historial={detalle.historial} />

      {accion && (
        <AccionDialog
          accion={accion}
          empresa={empresa}
          detalle={detalle}
          cerrar={() => setAccion(null)}
          hecho={(d, aviso) => {
            setAccion(null);
            aplicar(d, aviso);
          }}
        />
      )}
    </div>
  );
}

// ─── Estado de la cuenta y ciclo ────────────────────────────────────────────

function EstadoDeCuenta({
  cuenta,
  sinPlan,
  accion,
}: {
  cuenta: ResumenCuenta;
  sinPlan: number;
  accion: (a: Accion) => void;
}) {
  const hoy = hoyAR();
  const debe = cuenta.facturaPendiente?.importe ?? cuenta.mensual;
  const color = COLORES_CUENTA[cuenta.estado];
  const ultimoDia = cuenta.suspendeEl ? sumarDiasAR(cuenta.suspendeEl, -1) : null;
  // El débito automático lo activa la empresa desde Mi plan; acá solo se ve en qué está.
  const conDebito = cuenta.debito?.estado === "authorized";
  const colorDebito = conDebito ? "#34D399" : cuenta.debito?.estado === "pending" ? "#F5C219" : "#A79E8F";

  const { titular, bajada } = (() => {
    switch (cuenta.estado) {
      case "SIN_ACTIVAR":
        return {
          titular: "Sin activar",
          bajada:
            "Todavía no arrancó: no vence ni se factura. Dale el alta con los días de prueba gratis que quieras (o sin prueba). El plan se puede elegir antes o después.",
        };
      case "PRUEBA": {
        const quedan = diasEntreAR(hoy, cuenta.pruebaHasta ?? hoy);
        return {
          titular: "Prueba gratis",
          bajada: `Termina el ${diaAR(cuenta.pruebaHasta)} (${quedan <= 0 ? "hoy" : `quedan ${enDias(quedan)}`}). El ${diaAR(cuenta.proximoVencimiento)} se factura el primer mes${cuenta.mensual ? ` por ${pesos(cuenta.mensual)}` : ""} y desde ese día se cuentan los días de atraso.${conDebito ? " Tiene débito automático: ese día MercadoPago lo cobra de su tarjeta." : ""}${sinPlan ? " Todavía falta elegir el plan." : ""}`,
        };
      }
      case "AL_DIA":
        return {
          titular: "Al día",
          bajada: conDebito
            ? `Pagado hasta el ${diaAR(cuenta.pagadoHasta)}. El ${diaAR(cuenta.proximoVencimiento)} MercadoPago debita el mes siguiente (${pesos(cuenta.mensual)}) de su tarjeta.`
            : `Pagado hasta el ${diaAR(cuenta.pagadoHasta)}. El ${diaAR(cuenta.proximoVencimiento)} se factura el mes siguiente por ${pesos(cuenta.mensual)}.`,
        };
      case "VENCIDA":
        return {
          titular: cuenta.diasDeAtraso ? `${enDias(cuenta.diasDeAtraso)} de atraso` : "Vence hoy",
          bajada: `Debe ${pesos(debe)} desde el ${diaAR(cuenta.proximoVencimiento)}. ${
            cuenta.debeSuspenderse
              ? "Pasó la gracia: se suspende en la próxima revisión."
              : `Sigue operando hasta el ${diaAR(ultimoDia)}; con más de ${cuenta.diasDeGracia ?? DIAS_DE_GRACIA} días de atraso se suspende.`
          }${conDebito ? " Tiene débito automático: MercadoPago reintenta el cobro de la tarjeta." : ""}${cuenta.prorrogaHasta ? ` Tiene días extra hasta el ${diaAR(cuenta.prorrogaHasta)}.` : ""}`,
        };
      case "SUSPENDIDA":
        return cuenta.motivoSuspension === "MANUAL"
          ? {
              titular: "Suspendida a mano",
              bajada: "Un pago no la reactiva: reactivala desde Acciones sensibles, al pie de la ficha.",
            }
          : {
              titular: "Suspendida por falta de pago",
              bajada: `Debe ${pesos(debe)} desde el ${diaAR(cuenta.proximoVencimiento)} (${enDias(cuenta.diasDeAtraso)} de atraso). Solo puede cobrar salidas y cerrar el turno. Al registrar el pago o darle días extra se reactiva sola.`,
            };
      case "BONIFICADA":
        return { titular: "Bonificada", bajada: "No se le factura ni se suspende." };
      default:
        return {
          titular: "De baja",
          bajada: "Sin acceso; los datos se conservan. Si fue por falta de pago, registrar el pago la reactiva.",
        };
    }
  })();

  const yaPago = !!cuenta.pagadoHasta;
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-gm-surface">
      <div aria-hidden className="h-1.5" style={{ background: color }} />
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <Rotulo>Estado de la cuenta</Rotulo>
            <EstadoCuentaPill cuenta={cuenta} />
          </div>
          <h2 className="mt-3 font-display text-[34px] font-semibold leading-none tracking-[0.01em] sm:text-[40px]">
            {titular}
          </h2>
          <p className="mt-2.5 max-w-3xl text-[14px] leading-relaxed text-[#C9BFB1]">{bajada}</p>
        </div>
        <div className="flex flex-col gap-3 lg:items-end">
          <div className="lg:text-right">
            <Rotulo>Paga por mes</Rotulo>
            <div className="mt-1 font-mono text-[34px] font-bold leading-none text-gm-yellow">
              {pesos(cuenta.mensual)}
            </div>
            <div className="mt-1 text-[12px]" style={{ color: EJE }}>
              {cuenta.planes.length ? plural(cuenta.planes.length, "playa con plan", "playas con plan") : "Sin plan elegido"}
            </div>
            {cuenta.debito && (
              <div
                className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold"
                style={{ background: `${colorDebito}1f`, color: colorDebito }}
                title={cuenta.debito.email ? `Cuenta de MercadoPago: ${cuenta.debito.email}` : undefined}
              >
                <RefreshCw aria-hidden className="size-3" />
                {cuenta.debito.estado === "authorized"
                  ? "Débito automático"
                  : cuenta.debito.estado === "pending"
                    ? "Débito sin confirmar"
                    : "Débito en pausa"}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {cuenta.estado === "SIN_ACTIVAR" ? (
              <button type="button" className={botonPrimario} onClick={() => accion({ tipo: "alta" })}>
                <Rocket aria-hidden className="size-4" />
                Dar de alta
              </button>
            ) : (
              <>
                {cuenta.estado !== "BONIFICADA" && (
                  <button type="button" className={botonSecundario} onClick={() => accion({ tipo: "diasExtra" })}>
                    <CalendarPlus aria-hidden className="size-4" />
                    Días extra
                  </button>
                )}
                {!yaPago && cuenta.estado === "PRUEBA" && (
                  <button
                    type="button"
                    className={botonSecundario}
                    onClick={() => accion({ tipo: "alta" })}
                    title="Rehacer el alta: otra fecha o otra cantidad de días de prueba"
                  >
                    <Gift aria-hidden className="size-4" />
                    Cambiar prueba
                  </button>
                )}
                <button type="button" className={botonPrimario} onClick={() => accion({ tipo: "pago" })}>
                  <Receipt aria-hidden className="size-4" />
                  Registrar pago
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {cuenta.estado !== "SIN_ACTIVAR" && (
        <div className="border-t border-[#2E2820] bg-[#19140F] px-5 py-5 sm:px-6">
          <Ciclo cuenta={cuenta} editarAlta={() => accion({ tipo: "fechaAlta" })} />
        </div>
      )}
    </section>
  );
}

type Nodo = {
  id: string;
  titulo: string;
  fecha: string;
  detalle?: string;
  tono?: "peligro" | "alerta" | "hoy";
  editar?: () => void;
};

// El ciclo de la cuenta como una línea de hitos en orden, con hoy en su lugar: de un vistazo se
// ve dónde está parada y qué viene.
function Ciclo({ cuenta, editarAlta }: { cuenta: ResumenCuenta; editarAlta: () => void }) {
  const hoy = hoyAR();
  const nodos: Nodo[] = [
    { id: "alta", titulo: "Alta", fecha: cuenta.alta, detalle: "Cliente desde", editar: editarAlta },
  ];
  if (cuenta.pruebaHasta && cuenta.pruebaHasta >= cuenta.alta)
    nodos.push({
      id: "prueba",
      titulo: "Fin de la prueba",
      fecha: cuenta.pruebaHasta,
      detalle: `${enDias(diasEntreAR(cuenta.alta, cuenta.pruebaHasta) + 1)} gratis`,
    });
  if (cuenta.pagadoHasta)
    nodos.push({
      id: "pagado",
      titulo: "Pagado hasta",
      fecha: cuenta.pagadoHasta,
      detalle: cuenta.ultimoPago ? `Último pago ${pesos(cuenta.ultimoPago.importe)}` : undefined,
    });
  if (cuenta.proximoVencimiento && cuenta.estado !== "BONIFICADA")
    nodos.push({
      id: "vence",
      titulo: cuenta.pagadoHasta ? "Vencimiento" : "Primera factura",
      fecha: cuenta.proximoVencimiento,
      detalle: cuenta.mensual
        ? `${pesos(cuenta.facturaPendiente?.importe ?? cuenta.mensual)}${cuenta.diasDeAtraso ? ` · ${enDias(cuenta.diasDeAtraso)} de atraso` : ""}`
        : "Sin plan elegido",
      tono: cuenta.diasDeAtraso ? "alerta" : undefined,
    });
  if (cuenta.prorrogaHasta)
    nodos.push({ id: "extra", titulo: "Días extra hasta", fecha: cuenta.prorrogaHasta, detalle: "Sin suspender" });
  if (cuenta.suspendeEl && ["PRUEBA", "AL_DIA", "VENCIDA"].includes(cuenta.estado))
    nodos.push({
      id: "corte",
      titulo: "Se suspende",
      fecha: cuenta.suspendeEl,
      detalle: `Si no paga · ${cuenta.diasDeGracia ?? DIAS_DE_GRACIA} días de gracia`,
      tono: "peligro",
    });
  nodos.sort((a, b) => a.fecha.localeCompare(b.fecha));
  // Hoy va entre los hitos que ya pasaron y los que vienen; si coincide con uno, lo marca.
  if (!nodos.some((n) => n.fecha === hoy)) {
    const i = nodos.findIndex((n) => n.fecha > hoy);
    nodos.splice(i < 0 ? nodos.length : i, 0, { id: "hoy", titulo: "Hoy", fecha: hoy, tono: "hoy" });
  }

  return (
    <div className="overflow-x-auto">
      <ol className="relative flex min-w-[640px]" aria-label="Ciclo de la cuenta">
        {nodos.map((n, i) => {
          const pasado = n.fecha < hoy;
          const esHoy = n.fecha === hoy;
          const colorPunto =
            n.tono === "peligro"
              ? "#E5484D"
              : n.tono === "alerta"
                ? "#FF7A4D"
                : esHoy
                  ? "#F5C219"
                  : pasado
                    ? "#E9E1D4"
                    : "#53493C";
          return (
            <li key={n.id} className="relative flex-1 pr-3">
              {/* La línea: sólida hasta hoy, punteada lo que viene. */}
              {i < nodos.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-[7px] right-0 top-[7px] h-0.5"
                  style={{
                    background: nodos[i + 1].fecha <= hoy ? "#8A8073" : "transparent",
                    borderTop: nodos[i + 1].fecha <= hoy ? undefined : "2px dashed #3A3228",
                  }}
                />
              )}
              <span
                aria-hidden
                className={`relative z-10 block size-4 rounded-full border-2 ${n.tono === "hoy" ? "ring-4 ring-gm-yellow/25" : ""}`}
                style={{
                  borderColor: colorPunto,
                  background: pasado || esHoy || n.tono === "alerta" ? colorPunto : "#19140F",
                }}
              />
              <div className="mt-3">
                <div
                  className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em]"
                  style={{ color: n.tono === "hoy" ? "#F5C219" : n.tono === "peligro" ? "#FF8A8D" : EJE }}
                >
                  {n.titulo}
                </div>
                <div className="mt-1 flex items-center gap-1.5 font-display text-[20px] font-semibold leading-none">
                  {diaAR(n.fecha, false)}
                  {n.editar && (
                    <button
                      type="button"
                      onClick={n.editar}
                      aria-label="Cambiar la fecha de alta"
                      title="Cambiar la fecha de alta"
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-gm-surface-2 hover:text-gm-yellow"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  )}
                </div>
                {n.detalle && (
                  <div className="mt-1 text-[11.5px] leading-snug" style={{ color: n.tono === "alerta" ? "#FF7A4D" : "#A59B8D" }}>
                    {n.detalle}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ─── Planes de las playas ───────────────────────────────────────────────────

// El plan de cada playa con las tarjetas de la landing: se elige con un clic y se guarda con el
// precio pactado, que propone el de lista (30% menos si es una playa adicional).
function PlanesDePlayas({
  empresaId,
  playas,
  planes,
  alGuardar,
}: {
  empresaId: string;
  playas: UsoPlaya[];
  planes: Plan[];
  alGuardar: (d: DetalleSuscripcion) => void;
}) {
  const [playaId, setPlayaId] = useState(playas[0]?.playaId ?? "");
  const [elegido, setElegido] = useState<string | null>(null);
  const [precio, setPrecio] = useState("");
  const [guardando, setGuardando] = useState(false);
  const playa = playas.find((p) => p.playaId === playaId) ?? playas[0];
  const grupos = useMemo(
    () => agruparPlanes(planes.filter((p) => p.activo !== false || p.id === playa?.plan?.planId)),
    [planes, playa?.plan?.planId],
  );

  if (!playa)
    return (
      <Tarjeta className="items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">Todavía no tiene playas. Agregá una para asignarle plan.</p>
      </Tarjeta>
    );

  const sugerido = (planId: string) => {
    const lista = planes.find((p) => p.id === planId)?.precioMensual ?? 0;
    return playa.adicional ? Math.round(lista * (1 - DESCUENTO_PLAYA_ADICIONAL)) : lista;
  };
  function elegir(planId: string) {
    setElegido(planId);
    setPrecio(String(planId === playa.plan?.planId ? playa.plan.precio : sugerido(planId)));
  }
  function cambiarPlaya(id: string) {
    setPlayaId(id);
    setElegido(null);
  }
  async function guardar() {
    if (!elegido) return;
    const monto = Number(precio);
    if (!Number.isInteger(monto) || monto < 0) return toast.error("El precio va en pesos enteros, sin centavos.");
    setGuardando(true);
    const r = await asignarPlanAction(empresaId, playa.playaId, elegido, monto);
    setGuardando(false);
    if (r.error) return toast.error(r.error);
    setElegido(null);
    if (r.data) alGuardar(r.data);
  }

  const planElegido = planes.find((p) => p.id === elegido);
  const lista = planElegido?.precioMensual ?? 0;
  const cambio = !!elegido && (elegido !== playa.plan?.planId || Number(precio) !== playa.plan?.precio);

  return (
    <Tarjeta className="gap-4 pb-5 pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Rotulo>Plan contratado</Rotulo>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {playa.plan
              ? `${playa.nombre}: ${playa.plan.plan} · ${pesos(playa.plan.precio)}/mes desde el ${diaAR(playa.plan.desde)}`
              : `${playa.nombre} todavía no tiene plan. Elegí uno haciendo clic en su precio.`}
          </p>
        </div>
        {playas.length > 1 && (
          <Segmentos
            etiqueta="Playa"
            redondo
            opciones={playas.map((p) => ({ id: p.playaId, label: `${p.nombre}${p.plan ? "" : " ·"}` }))}
            valor={playa.playaId}
            onChange={cambiarPlaya}
          />
        )}
      </div>

      <div className="pt-3">
        <TarjetasPlan
          grupos={grupos}
          actual={playa.plan?.planId ?? null}
          elegido={elegido}
          onElegir={elegir}
          precioActual={playa.plan?.precio ?? null}
          etiquetaActual="Plan actual"
        />
      </div>

      {elegido ? (
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-gm-yellow/40 bg-gm-yellow/[0.06] p-4">
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold">
              {planElegido?.nombre} para {playa.nombre}
            </div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">
              Lista {pesos(lista)}
              {playa.adicional && ` · playa adicional: ${Math.round(DESCUENTO_PLAYA_ADICIONAL * 100)}% menos`}
              {" · "}
              {planElegido?.incluyeCocheras ? "prende Inquilinos en la playa" : "sin Inquilinos"}
            </div>
          </div>
          <div className="w-[170px] space-y-1">
            <Label htmlFor="precio-pactado" className="text-xs text-muted-foreground">
              Precio pactado por mes
            </Label>
            <Input
              id="precio-pactado"
              inputMode="numeric"
              value={precio}
              disabled={guardando}
              onChange={(e) => setPrecio(e.target.value.replace(/\D/g, ""))}
              className="h-10 font-mono tabular-nums"
            />
          </div>
          <div className="flex gap-2">
            <button type="button" className={botonSecundario} disabled={guardando} onClick={() => setElegido(null)}>
              Cancelar
            </button>
            <button type="button" className={botonPrimario} disabled={guardando || !cambio || !precio} onClick={() => void guardar()}>
              {guardando ? "Guardando…" : "Guardar plan"}
            </button>
          </div>
        </div>
      ) : (
        playa.plan && (
          <button
            type="button"
            onClick={() => elegir(playa.plan!.planId)}
            className="w-fit text-[12.5px] font-semibold text-gm-yellow hover:text-[#FFD84D]"
          >
            Cambiar el precio pactado →
          </button>
        )
      )}
    </Tarjeta>
  );
}

// Lo que solo ve el super admin: cuánto usa cada playa contra el límite de su plan.
function UsoDePlayas({ playas }: { playas: UsoPlaya[] }) {
  return (
    <Tarjeta className="gap-4 pb-5 pt-5">
      <div className="flex items-center justify-between">
        <Rotulo>Uso de la playa</Rotulo>
        <Pastilla tono="lavanda">Solo vos</Pastilla>
      </div>
      {!playas.length && <p className="text-sm text-muted-foreground">Sin playas.</p>}
      {playas.map((p) => {
        const limite = p.plan?.maxActivos ?? null;
        const fraccion = limite ? Math.min(1, p.activos / limite) : 0;
        return (
          <div key={p.playaId} className="space-y-3">
            {playas.length > 1 && <div className="text-[13px] font-semibold">{p.nombre}</div>}
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="font-display text-[34px] font-semibold leading-none tabular-nums">
                  {numero(p.activos)}
                  <span className="ml-1 text-[15px] font-normal text-muted-foreground">
                    / {limite === null ? "∞" : numero(limite)}
                  </span>
                </div>
                <div className="mt-1 text-[11.5px]" style={{ color: EJE }}>
                  Vehículos adentro ahora
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[20px] font-bold leading-none">{numero(p.pico)}</div>
                <div className="mt-1 text-[11.5px]" style={{ color: EJE }}>
                  Pico 30 días
                </div>
              </div>
            </div>
            {limite !== null && (
              <div className="h-1.5 rounded-full bg-[#231D17]">
                <div
                  className="h-1.5 rounded-full"
                  style={{ width: `${Math.max(2, fraccion * 100)}%`, background: fraccion >= 1 ? "#FF7A4D" : "#F5C219" }}
                />
              </div>
            )}
            <PicoDelMes uso={p} limite={limite} />
            <p className={`text-[12px] leading-snug ${p.diasExcedidos ? "text-[#FF7A4D]" : ""}`} style={p.diasExcedidos ? undefined : { color: EJE }}>
              {p.diasExcedidos
                ? `Pasó el límite ${enDias(p.diasExcedidos)} del último mes: conviene ofrecerle el plan siguiente.`
                : limite === null
                  ? "Plan sin límite de vehículos."
                  : "Dentro del límite del plan el último mes."}
            </p>
          </div>
        );
      })}
    </Tarjeta>
  );
}

// Treinta barritas, una por día: alto = pico de estadías abiertas a la vez; naranja = pasó el
// límite del plan.
function PicoDelMes({ uso, limite }: { uso: UsoPlaya; limite: number | null }) {
  const dias = useMemo(() => {
    const hoy = hoyAR();
    return Array.from({ length: 30 }, (_, i) => {
      const dia = sumarDiasAR(hoy, i - 29);
      return { dia, pico: uso.serie.find((s) => s.dia === dia)?.pico ?? 0 };
    });
  }, [uso.serie]);
  const tope = Math.max(1, limite ?? 0, ...dias.map((d) => d.pico));
  return (
    <div
      className="flex h-10 items-end gap-[2px] rounded-xl border border-[#262019] bg-background px-2 pb-1.5 pt-2"
      role="img"
      aria-label={`Pico diario de estadías a la vez en los últimos 30 días, máximo ${uso.pico}`}
    >
      {dias.map((d) => (
        <span
          key={d.dia}
          title={`${diaAR(d.dia, false)} · ${d.pico}`}
          className="flex-1 rounded-[1px]"
          style={{
            height: `${Math.max(8, (d.pico / tope) * 100)}%`,
            background: limite !== null && d.pico > limite ? "#FF7A4D" : d.pico ? "#A59B8D" : "#2E2820",
          }}
        />
      ))}
    </div>
  );
}

function Ajustes({
  empresaId,
  detalle,
  accion,
  aplicar,
}: {
  empresaId: string;
  detalle: DetalleSuscripcion;
  accion: (a: Accion) => void;
  aplicar: (d: DetalleSuscripcion, aviso: string) => void;
}) {
  const { cuenta } = detalle;
  const [notas, setNotas] = useState(detalle.notas ?? "");
  const [guardando, setGuardando] = useState(false);
  useEffect(() => setNotas(detalle.notas ?? ""), [detalle.notas]);

  async function editar(cambios: { bonificada?: boolean; notas?: string | null }, aviso: string) {
    setGuardando(true);
    const r = await editarSuscripcionAction(empresaId, cambios);
    setGuardando(false);
    if (r.error) toast.error(r.error);
    else if (r.data) aplicar(r.data, aviso);
  }

  return (
    <Tarjeta className="gap-3 pb-5 pt-5">
      <Rotulo>Ajustes de la cuenta</Rotulo>
      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3 text-[13px]">
        <span>
          <span className="block font-semibold">Bonificada</span>
          <span className="block text-xs" style={{ color: EJE }}>
            No se le factura ni se suspende
          </span>
        </span>
        <Switch
          checked={cuenta.bonificada}
          disabled={guardando}
          onCheckedChange={(v) =>
            void editar({ bonificada: v }, v ? "Bonificada: no vence ni se suspende." : "Se le vuelve a cobrar.")
          }
          className="data-[state=checked]:bg-gm-yellow"
        />
      </label>
      <button
        type="button"
        onClick={() => accion({ tipo: "pagadoHasta" })}
        className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3 text-left text-[13px] transition-colors hover:border-gm-line-strong hover:bg-gm-surface-2"
      >
        <span>
          <span className="block font-semibold">Pagado hasta</span>
          <span className="block text-xs" style={{ color: EJE }}>
            {cuenta.pagadoHasta ? diaAR(cuenta.pagadoHasta) : "Para un cliente que ya pagaba por fuera"}
          </span>
        </span>
        <CalendarDays aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      </button>
      <div className="space-y-1.5">
        <Label htmlFor="notas-cuenta" className="text-xs text-muted-foreground">
          Nota interna (la empresa no la ve)
        </Label>
        <Textarea
          id="notas-cuenta"
          rows={3}
          maxLength={1000}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Ej.: paga por transferencia a fin de mes"
          className="resize-none text-[13px]"
        />
        {notas.trim() !== (detalle.notas ?? "") && (
          <button
            type="button"
            className={botonChico}
            disabled={guardando}
            onClick={() => void editar({ notas: notas.trim() || null }, "Nota guardada.")}
          >
            {guardando ? "Guardando…" : "Guardar nota"}
          </button>
        )}
      </div>
    </Tarjeta>
  );
}

// ─── Facturas e historial ──────────────────────────────────────────────────

function EstadoFactura({ factura }: { factura: FacturaSaas }) {
  const hoy = hoyAR();
  if (factura.estado === "PAGADA")
    return <span className="rounded-full bg-emerald-400/[0.12] px-2.5 py-[3px] text-[11.5px] font-bold text-emerald-400">Pagada</span>;
  if (factura.estado === "ANULADA")
    return <span className="rounded-full bg-[#231D17] px-2.5 py-[3px] text-[11.5px] font-bold text-muted-foreground">Anulada</span>;
  const atraso = diasEntreAR(factura.desde, hoy);
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11.5px] font-bold ${atraso > 0 ? "bg-[#FF7A4D]/[0.14] text-[#FF7A4D]" : "bg-gm-yellow/[0.14] text-gm-yellow"}`}
    >
      {atraso > 0 ? `${enDias(atraso)} de atraso` : atraso === 0 ? "Vence hoy" : "Pendiente"}
    </span>
  );
}

function Facturas({
  facturas,
  ultimoPagado,
  accion,
}: {
  facturas: FacturaSaas[];
  ultimoPagado: string | null;
  accion: (a: Accion) => void;
}) {
  const columnas = "grid-cols-[190px_100px_130px_150px_minmax(0,1fr)_120px]";
  return (
    <section className="overflow-hidden rounded-[22px] border border-border bg-gm-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2E2820] px-5 py-4">
        <div>
          <h2 className="font-display text-[22px] font-semibold">Facturas y pagos</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Cada mes se factura el día en que vence. Un pago cargado por error se anula: nunca se borra.
          </p>
        </div>
      </div>
      {!facturas.length ? (
        <p className="p-10 text-center text-sm text-muted-foreground">Todavía no hay facturas.</p>
      ) : (
        <div className="overflow-x-auto">
          <div role="table" aria-label="Facturas y pagos" className="min-w-[920px]">
            <div
              role="row"
              className={`grid h-[42px] ${columnas} items-center gap-3 bg-[#19140F] px-5 font-mono text-[10.5px] tracking-[0.1em]`}
              style={{ color: EJE }}
            >
              <span role="columnheader">PERÍODO</span>
              <span role="columnheader">VENCE</span>
              <span role="columnheader">IMPORTE</span>
              <span role="columnheader">ESTADO</span>
              <span role="columnheader">PAGO</span>
              <span role="columnheader" className="sr-only">
                Acciones
              </span>
            </div>
            {facturas.map((f) => (
              <div
                key={f.id}
                role="row"
                className={`grid min-h-[60px] ${columnas} items-center gap-3 border-t border-[#2A241D] px-5 py-2 text-[13.5px]`}
              >
                <span role="cell" className="tabular-nums">
                  {diaAR(f.desde, false)} al {diaAR(f.hasta)}
                  {f.meses > 1 && <span className="ml-1.5 text-xs text-muted-foreground">· {f.meses} meses</span>}
                </span>
                <span role="cell" className="tabular-nums">
                  {diaAR(f.desde, false)}
                </span>
                <span role="cell" className={`font-mono font-semibold tabular-nums ${f.estado === "ANULADA" ? "line-through opacity-60" : ""}`}>
                  {pesos(f.importe)}
                </span>
                <span role="cell">
                  <EstadoFactura factura={f} />
                </span>
                <span role="cell" className="min-w-0">
                  <span className="block truncate">
                    {f.estado === "PAGADA"
                      ? `${diaAR(f.pagadaEl, false)} · ${f.medio ? MEDIOS_PAGO[f.medio] : "—"}${f.referencia ? ` · ${f.referencia}` : ""}`
                      : f.estado === "ANULADA"
                        ? `Anulado: ${f.motivoAnulacion ?? ""}`
                        : "—"}
                  </span>
                  {(f.registradaPor || f.nota) && f.estado === "PAGADA" && (
                    <span className="block truncate text-xs" style={{ color: EJE }}>
                      {[f.registradaPor && `Registró ${f.registradaPor}`, f.nota].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </span>
                <span role="cell" className="flex justify-end">
                  {f.estado === "PENDIENTE" && (
                    <button type="button" className={`${botonChico} border-gm-yellow/60 text-gm-yellow`} onClick={() => accion({ tipo: "pago" })}>
                      Registrar pago
                    </button>
                  )}
                  {f.id === ultimoPagado && (
                    <button
                      type="button"
                      className="h-8 rounded-[9px] px-2.5 text-[12.5px] font-semibold text-[#FF7A4D] transition-colors hover:bg-[#FF7A4D]/10"
                      onClick={() => accion({ tipo: "anular", factura: f })}
                    >
                      Anular
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Historial({ historial }: { historial: DetalleSuscripcion["historial"] }) {
  return (
    <Tarjeta className="min-h-0 pb-4">
      <div className="flex items-center gap-2">
        <Rotulo>Historial de la cuenta</Rotulo>
        <Pastilla>{numero(historial.length)}</Pastilla>
      </div>
      {!historial.length ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Sin movimientos todavía.</p>
      ) : (
        <ol className="mt-3.5 grid gap-x-8 md:grid-cols-2">
          {historial.map((h, i) => (
            <li key={`${h.fecha}-${i}`} className="flex gap-3">
              <div className="flex w-3 shrink-0 flex-col items-center">
                <span aria-hidden className="mt-1 size-2.5 rounded-full bg-[#53493C]" />
                <span aria-hidden className="w-px flex-1 bg-border" />
              </div>
              <div className="min-w-0 pb-3">
                <div className="text-[12.5px] leading-snug">
                  <span className="font-bold">{h.usuario ?? "Sistema"}</span>{" "}
                  <span className="text-[#C9BFB1]">{describirMovimiento(h)}</span>
                </div>
                <div className="mt-[3px] font-mono text-[10.5px]" style={{ color: EJE }}>
                  {cuandoFue(h.fecha)}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Tarjeta>
  );
}

function describirMovimiento(h: DetalleSuscripcion["historial"][number]) {
  const d = (h.detalle ?? {}) as Record<string, string | number | boolean | null | undefined>;
  const fecha = (v: unknown) => (typeof v === "string" ? diaAR(v) : "—");
  const plata = (v: unknown) => (typeof v === "number" ? pesos(v) : "");
  switch (h.accion) {
    case "SUSCRIPCION_ALTA":
      return Number(d.diasPrueba) > 0
        ? `dio de alta la cuenta el ${fecha(d.alta)} con ${d.diasPrueba} días de prueba gratis`
        : `dio de alta la cuenta el ${fecha(d.alta)}, sin prueba`;
    case "SUSCRIPCION_DIAS_EXTRA":
      return `dio días extra hasta el ${fecha(d.hasta)} (${d.como === "PRUEBA" ? "alarga la prueba" : "sin suspender"}): «${d.motivo}»`;
    case "SUSCRIPCION_PRUEBA":
      return `dio ${d.dias} días de prueba gratis, hasta el ${fecha(d.hasta)}`;
    case "SUSCRIPCION_PRUEBA_EXTENDIDA":
      return `extendió la prueba hasta el ${fecha(d.hasta)}: «${d.motivo}»`;
    case "SUSCRIPCION_PRORROGA":
      return `dio prórroga hasta el ${fecha(d.hasta)}: «${d.motivo}»`;
    case "SUSCRIPCION_PLAN":
      return `asignó ${d.plan} a ${d.playa} por ${plata(d.precio)}${d.anterior ? ` (antes ${d.anterior}, ${plata(d.precioAnterior)})` : ""}`;
    case "SUSCRIPCION_DEBITO":
      return d.estado === "authorized"
        ? `activó el débito automático${d.email ? ` (${d.email})` : ""}`
        : d.estado === "pending"
          ? `pidió el débito automático${d.email ? ` con ${d.email}` : ""}; falta que lo confirme en MercadoPago`
          : d.estado === "paused"
            ? "pausó el débito automático desde MercadoPago"
            : "dio de baja el débito automático";
    case "SUSCRIPCION_PAGO":
      if (d.automatico)
        return `acreditó un pago de ${plata(d.importe)} por MercadoPago, hasta el ${fecha(d.hasta)}`;
      return `registró un pago de ${plata(d.importe)} (${MEDIOS_PAGO[d.medio as MedioPagoSaas] ?? d.medio}) por ${d.meses} ${d.meses === 1 ? "mes" : "meses"}, hasta el ${fecha(d.hasta)}`;
    case "SUSCRIPCION_PAGO_ANULADO":
      return `anuló el pago de ${plata(d.importe)}: «${d.motivo}»`;
    case "SUSCRIPCION_EDITADA":
      return (
        [
          d.alta !== undefined ? `cambió la fecha de alta al ${fecha(d.alta)}` : null,
          d.pagadoHasta !== undefined ? `fijó «pagado hasta» en el ${fecha(d.pagadoHasta)}` : null,
          d.bonificada === true ? "la marcó como bonificada" : null,
          d.bonificada === false ? "le quitó la bonificación" : null,
        ]
          .filter(Boolean)
          .join(" y ") || "editó la cuenta"
      );
    case "EMPRESA_SUSPENDIDA":
      return d.motivo === "FALTA_DE_PAGO"
        ? `suspendió la empresa por falta de pago (venció el ${fecha(d.vencio)}${typeof d.diasDeAtraso === "number" ? `, ${enDias(d.diasDeAtraso)} de atraso` : ""})`
        : "suspendió la empresa";
    case "EMPRESA_REACTIVADA":
      return "reactivó la empresa al regularizar la cuenta";
    case "EMPRESA_ACTIVA":
      return "reactivó la empresa";
    case "EMPRESA_BAJA":
      return d.motivo === "FALTA_DE_PAGO" ? `dio de baja la empresa tras ${d.dias} días suspendida` : "dio de baja la empresa";
    case "EMPRESA_CREADA":
      return "creó la empresa";
    default:
      return h.accion.toLowerCase().replace(/_/g, " ");
  }
}

// ─── Diálogos ───────────────────────────────────────────────────────────────

function AccionDialog({
  accion,
  empresa,
  detalle,
  cerrar,
  hecho,
}: {
  accion: Accion;
  empresa: EmpresaConDetalle;
  detalle: DetalleSuscripcion;
  cerrar: () => void;
  hecho: (d: DetalleSuscripcion, aviso: string) => void;
}) {
  const { cuenta } = detalle;
  const hoy = hoyAR();
  const yaPago = !!cuenta.pagadoHasta;
  // Hasta cuándo tiene acceso hoy sin pagar: de ahí parten los días extra.
  const accesoHasta = yaPago
    ? cuenta.suspendeEl
      ? sumarDiasAR(cuenta.suspendeEl, -1)
      : hoy
    : (cuenta.pruebaHasta ?? hoy);
  const baseExtra = accesoHasta > hoy ? accesoHasta : hoy;

  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  // Alta
  // Sin activar, el alta propuesta es hoy; activada, la que ya tiene.
  const [alta, setAlta] = useState(cuenta.estado === "SIN_ACTIVAR" ? hoy : cuenta.alta);
  const [conPrueba, setConPrueba] = useState(true);
  const [diasPrueba, setDiasPrueba] = useState(
    cuenta.pruebaHasta && cuenta.estado !== "SIN_ACTIVAR" ? Math.max(1, diasEntreAR(cuenta.alta, cuenta.pruebaHasta) + 1) : 7,
  );
  // Días extra
  const [hasta, setHasta] = useState(
    accion.tipo === "pagadoHasta" ? (cuenta.pagadoHasta ?? hoy) : sumarDiasAR(baseExtra, 7),
  );
  const [motivo, setMotivo] = useState("");
  // Pago
  const [meses, setMeses] = useState(1);
  const [importe, setImporte] = useState(String(cuenta.facturaPendiente?.importe ?? cuenta.mensual ?? ""));
  const [importeTocado, setImporteTocado] = useState(false);
  const [medio, setMedio] = useState<MedioPagoSaas>("TRANSFERENCIA");
  const [fecha, setFecha] = useState(hoy);
  const [referencia, setReferencia] = useState("");
  const [nota, setNota] = useState("");

  const cortada = cuenta.estado === "SUSPENDIDA" && cuenta.motivoSuspension === "FALTA_DE_PAGO";
  const ultimo = cuenta.pagadoHasta ?? cuenta.pruebaHasta;
  const periodo =
    !ultimo || cortada
      ? { desde: hoy, hasta: sumarDiasAR(sumarMesesAR(hoy, meses), -1) }
      : { desde: sumarDiasAR(ultimo, 1), hasta: sumarMesesAR(ultimo, meses) };
  const finPrueba = sumarDiasAR(alta, (conPrueba ? diasPrueba : 0) - 1);
  const pruebaCorrida =
    !yaPago && cuenta.pruebaHasta ? sumarDiasAR(cuenta.pruebaHasta, diasEntreAR(cuenta.alta, alta)) : null;

  const titulos: Record<Accion["tipo"], [string, string]> = {
    alta: [
      cuenta.estado === "SIN_ACTIVAR" ? "Dar de alta la cuenta" : "Cambiar la prueba",
      "Desde qué día es cliente y cuántos días de prueba gratis tiene. Al terminar la prueba se factura el primer mes. No hace falta tener el plan elegido.",
    ],
    fechaAlta: [
      "Fecha de alta",
      yaPago
        ? "Desde cuándo es cliente. Ya tiene pagos: cambiarla no mueve sus vencimientos."
        : "Desde cuándo es cliente. Como todavía no pagó, la prueba se corre con ella.",
    ],
    diasExtra: [
      "Días extra",
      yaPago
        ? "Más tiempo sin pagar antes de suspenderla. El vencimiento no se mueve y los días de atraso se siguen contando."
        : "Más días de prueba gratis: la primera factura se corre al día siguiente.",
    ],
    pago: ["Registrar pago", "Una transferencia, efectivo o lo que te pagaron por fuera del sistema."],
    pagadoHasta: [
      "Pagado hasta",
      "Para un cliente que ya venía pagando por fuera: hasta qué día tiene el servicio pago.",
    ],
    anular: [
      "Anular el pago",
      "El vencimiento vuelve a donde estaba antes de este pago. Si queda con más de 5 días de atraso, se suspende en la próxima revisión.",
    ],
  };

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError("");
    setPending(true);
    try {
      let r: { data?: DetalleSuscripcion; error?: string };
      let aviso = "Listo.";
      switch (accion.tipo) {
        case "alta":
          r = await activarCuentaAction(empresa.id, alta, conPrueba ? diasPrueba : 0);
          aviso = conPrueba ? `Alta con prueba gratis hasta el ${diaAR(finPrueba)}.` : "Alta sin prueba: se factura desde hoy.";
          break;
        case "fechaAlta":
          r = await editarSuscripcionAction(empresa.id, { alta });
          aviso = `Fecha de alta: ${diaAR(alta)}.`;
          break;
        case "diasExtra":
          r = await darDiasExtraAction(empresa.id, hasta, motivo.trim());
          aviso = `Días extra hasta el ${diaAR(hasta)}.`;
          break;
        case "pagadoHasta":
          r = await editarSuscripcionAction(empresa.id, { pagadoHasta: hasta });
          aviso = `Pagado hasta el ${diaAR(hasta)}.`;
          break;
        case "anular":
          r = await anularPagoAction(empresa.id, accion.factura.id, motivo.trim());
          aviso = "Pago anulado.";
          break;
        default: {
          const monto = Number(importe);
          if (!Number.isInteger(monto) || monto < 1) {
            setError("El importe va en pesos enteros, sin centavos.");
            return;
          }
          r = await registrarPagoAction(empresa.id, {
            meses,
            importe: monto,
            medio,
            fecha,
            ...(referencia.trim() ? { referencia: referencia.trim() } : {}),
            ...(nota.trim() ? { nota: nota.trim() } : {}),
          });
          aviso = `Pago registrado: cubre hasta el ${diaAR(periodo.hasta)}.`;
        }
      }
      if (r.error) setError(r.error);
      else if (r.data) hecho(r.data, aviso);
    } finally {
      setPending(false);
    }
  }

  const [titulo, descripcion] = titulos[accion.tipo];
  const botonFecha = (valor: string) => (
    <button
      type="button"
      className="flex h-11 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm hover:border-gm-yellow/50"
    >
      <CalendarDays aria-hidden className="size-4 text-gm-yellow" />
      {diaAR(valor)}
    </button>
  );
  const select = "h-11 w-full rounded-md border border-input bg-background px-3 text-sm";
  const pideMotivo = accion.tipo === "diasExtra" || accion.tipo === "anular";
  const motivoMinimo = accion.tipo === "anular" ? 10 : 3;
  const resumen = (contenido: ReactNode, tono: "ok" | "alerta" = "ok") => (
    <p
      className={`flex gap-2 rounded-xl border p-3 text-[13px] leading-snug ${tono === "ok" ? "border-gm-yellow/30 bg-gm-yellow/[0.08]" : "border-[#FF7A4D]/40 bg-[#FF7A4D]/[0.08]"}`}
    >
      {tono === "ok" ? (
        <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-gm-yellow" />
      ) : (
        <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-[#FF7A4D]" />
      )}
      <span>{contenido}</span>
    </p>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && cerrar()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            {empresa.nombre} · {descripcion}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={confirmar}>
          {(accion.tipo === "alta" || accion.tipo === "fechaAlta") && (
            <div className="space-y-1.5">
              <Label>Fecha de alta</Label>
              <AppDatePicker
                title="Fecha de alta"
                value={alta}
                max={sumarDiasAR(hoy, 60)}
                onChange={(v) => v && setAlta(v)}
                trigger={botonFecha(alta)}
              />
            </div>
          )}

          {accion.tipo === "alta" && (
            <>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 text-sm">
                <Switch checked={conPrueba} onCheckedChange={setConPrueba} className="data-[state=checked]:bg-gm-yellow" />
                <span className="flex-1 font-medium">Prueba gratis</span>
                <select
                  aria-label="Días de prueba"
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
                  value={diasPrueba}
                  disabled={!conPrueba}
                  onChange={(e) => setDiasPrueba(Number(e.target.value))}
                >
                  {[3, 5, 7, 10, 14, 15, 21, 30].map((n) => (
                    <option key={n} value={n}>
                      {n} días
                    </option>
                  ))}
                </select>
              </label>
              {resumen(
                conPrueba ? (
                  <>
                    Prueba gratis del <b>{diaAR(alta)}</b> al <b>{diaAR(finPrueba)}</b>. El{" "}
                    <b>{diaAR(sumarDiasAR(finPrueba, 1))}</b> se factura el primer mes; con más de {DIAS_DE_GRACIA} días de
                    atraso se suspende.
                  </>
                ) : (
                  <>
                    Sin prueba: el primer mes se factura el <b>{diaAR(alta)}</b> y vence ese mismo día.
                  </>
                ),
                finPrueba < hoy ? "alerta" : "ok",
              )}
            </>
          )}

          {accion.tipo === "fechaAlta" &&
            pruebaCorrida &&
            resumen(
              <>
                La prueba pasa a terminar el <b>{diaAR(pruebaCorrida)}</b> y la primera factura el{" "}
                <b>{diaAR(sumarDiasAR(pruebaCorrida, 1))}</b>.
              </>,
              pruebaCorrida < hoy ? "alerta" : "ok",
            )}

          {(accion.tipo === "diasExtra" || accion.tipo === "pagadoHasta") && (
            <div className="space-y-2">
              <Label>{accion.tipo === "diasExtra" ? "Acceso sin pagar hasta el" : "Pagado hasta el"}</Label>
              {accion.tipo === "diasExtra" && (
                <div className="flex flex-wrap gap-1.5">
                  {[3, 5, 7, 15, 30].map((n) => {
                    const valor = sumarDiasAR(baseExtra, n);
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setHasta(valor)}
                        className={`h-8 rounded-lg border px-3 text-[12.5px] font-semibold ${hasta === valor ? "border-gm-yellow bg-gm-yellow/15 text-gm-yellow" : "border-border hover:bg-gm-surface-2"}`}
                      >
                        +{n} días
                      </button>
                    );
                  })}
                </div>
              )}
              <AppDatePicker
                title={accion.tipo === "diasExtra" ? "Días extra hasta" : "Pagado hasta"}
                value={hasta}
                min={accion.tipo === "diasExtra" ? hoy : undefined}
                max={accion.tipo === "diasExtra" ? sumarDiasAR(hoy, 90) : undefined}
                onChange={(v) => v && setHasta(v)}
                trigger={botonFecha(hasta)}
              />
              {accion.tipo === "diasExtra" &&
                resumen(
                  yaPago ? (
                    <>
                      No se suspende hasta el <b>{diaAR(hasta)}</b>. Sigue debiendo desde el{" "}
                      {diaAR(cuenta.proximoVencimiento)} y el atraso se sigue contando.
                    </>
                  ) : (
                    <>
                      La prueba termina el <b>{diaAR(hasta)}</b> y el primer mes se factura el{" "}
                      <b>{diaAR(sumarDiasAR(hasta, 1))}</b>.
                    </>
                  ),
                )}
            </div>
          )}

          {accion.tipo === "pago" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="meses">Meses que paga</Label>
                  <select
                    id="meses"
                    className={select}
                    value={meses}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setMeses(n);
                      if (!importeTocado && cuenta.mensual) setImporte(String(cuenta.mensual * n));
                    }}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "mes" : "meses"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="importe">Importe recibido</Label>
                  <Input
                    id="importe"
                    inputMode="numeric"
                    required
                    value={importe}
                    className="h-11 font-mono"
                    onChange={(e) => {
                      setImporteTocado(true);
                      setImporte(e.target.value.replace(/\D/g, ""));
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="medio">Medio</Label>
                  <select id="medio" className={select} value={medio} onChange={(e) => setMedio(e.target.value as MedioPagoSaas)}>
                    {(Object.keys(MEDIOS_PAGO) as MedioPagoSaas[]).map((m) => (
                      <option key={m} value={m}>
                        {MEDIOS_PAGO[m]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha en que entró</Label>
                  <AppDatePicker title="Fecha del pago" value={fecha} max={hoy} onChange={(v) => v && setFecha(v)} trigger={botonFecha(fecha)} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="referencia">Referencia (opcional)</Label>
                  <Input
                    id="referencia"
                    maxLength={255}
                    placeholder="Nº de operación"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nota">Nota (opcional)</Label>
                  <Input id="nota" maxLength={500} value={nota} onChange={(e) => setNota(e.target.value)} />
                </div>
              </div>
              {resumen(
                <>
                  Cubre del <b>{diaAR(periodo.desde)}</b> al <b>{diaAR(periodo.hasta)}</b>.
                  {cortada && " Estaba suspendida: el período arranca hoy y la empresa se reactiva."}
                  {!cortada && cuenta.diasDeAtraso > 0 && " Pagó con atraso: el período sigue desde su vencimiento."}
                  {cuenta.estado === "SUSPENDIDA" && cuenta.motivoSuspension === "MANUAL" &&
                    " Está suspendida a mano: el pago no la reactiva."}
                </>,
              )}
            </>
          )}

          {accion.tipo === "anular" &&
            resumen(
              <>
                Pago de <b>{pesos(accion.factura.importe)}</b> del {diaAR(accion.factura.pagadaEl)} que cubría del{" "}
                {diaAR(accion.factura.desde)} al {diaAR(accion.factura.hasta)}.
              </>,
              "alerta",
            )}

          {pideMotivo && (
            <div className="space-y-1.5">
              <Label htmlFor="motivo">Motivo</Label>
              <Textarea
                id="motivo"
                required
                rows={2}
                minLength={motivoMinimo}
                maxLength={accion.tipo === "anular" ? 500 : 300}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder={accion.tipo === "anular" ? "Ej.: la transferencia fue rechazada" : "Ej.: paga el viernes"}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">Queda en el historial de la cuenta.</p>
            </div>
          )}

          {error && (
            <p role="alert" className="flex gap-2 text-sm text-destructive">
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={cerrar} disabled={pending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={pending || (pideMotivo && motivo.trim().length < motivoMinimo)}
              variant={accion.tipo === "anular" ? "destructive" : "default"}
            >
              {pending
                ? "Guardando…"
                : accion.tipo === "anular"
                  ? "Anular pago"
                  : accion.tipo === "alta"
                    ? "Dar de alta"
                    : "Confirmar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
