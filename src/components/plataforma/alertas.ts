import { EmpresaConDetalle, PlayaMetrics } from "@/types/tenancy.type";
import { diaAR, pesos } from "./cuenta";
import { diaMes, haceCuanto, minutosDesde } from "./formato";

// Lo que el super admin tiene que resolver. Una sola fuente para las tres pantallas: el listado
// de «Requiere atención», el filtro «Con alertas» y el contador de salud de la plataforma tienen
// que dar el mismo número, o ninguno de los tres se cree. La cobranza entra acá también: una
// empresa que debe es lo primero que hay que resolver, y antes solo se veía entrando a Planes.

export type TipoAlerta =
  | "debe"
  | "sin-tarifas"
  | "sin-playa"
  | "suspendida"
  | "vence-pronto"
  | "debito-pausado"
  | "sin-operar"
  | "sin-playas";

export type Alerta = {
  id: string;
  tipo: TipoAlerta;
  titulo: string;
  detalle: string;
  accion: string;
  href: string;
  empresaIds: string[];
  // Bloquea la operación o el acceso. Las demás son pendientes, no urgencias.
  grave: boolean;
  // Dentro del mismo tipo, la más urgente primero: más días de atraso, menos días para vencer.
  urgencia?: number;
};

// Dos días sin movimientos en una empresa que ya opera es raro: una playa no cierra 48 horas
// seguidas sin avisar. Menos que eso sería ruido cada domingo.
const SIN_OPERAR_MINUTOS = 48 * 60;

// Los mismos 3 días que `cuentaConAlerta`: antes no hay nada que hacer.
const VENCE_PRONTO_DIAS = 3;

// La plata adelante: lo que se debe y lo que va a cortar el acceso, después lo que frena la
// operación, después los avisos.
const ORDEN: Record<TipoAlerta, number> = {
  debe: 0,
  "sin-tarifas": 1,
  "sin-playa": 2,
  suspendida: 3,
  "vence-pronto": 4,
  "debito-pausado": 5,
  "sin-operar": 6,
  "sin-playas": 7,
};

const enDias = (n: number) => (n === 1 ? "1 día" : `${n} días`);
const cuandoVence = (dias: number) => (dias <= 0 ? "hoy" : dias === 1 ? "mañana" : `en ${enDias(dias)}`);

export function alertasDePlataforma(
  empresas: EmpresaConDetalle[],
  playas: PlayaMetrics[],
): Alerta[] {
  const alertas: Alerta[] = [];
  const metricas = new Map(playas.map((p) => [p.playaId, p]));
  const sinPlaya: { empresa: EmpresaConDetalle; cuantos: number }[] = [];

  for (const empresa of empresas) {
    const ficha = `/admin/empresas/${empresa.id}`;
    const cuenta = empresa.suscripcion;
    const debe = cuenta?.facturaPendiente?.importe;
    const usuarios = `${empresa.usuarios.length} ${empresa.usuarios.length === 1 ? "usuario" : "usuarios"} sin acceso`;

    if (empresa.estado === "SUSPENDIDA") {
      // La fecha de la suspensión, no la del último cambio de la empresa: editarle el nombre
      // corría el «desde».
      const desde = cuenta?.suspendidaEl ?? empresa.updatedAt;
      const porFalta = cuenta?.estado === "SUSPENDIDA" && cuenta.motivoSuspension === "FALTA_DE_PAGO";
      alertas.push({
        id: `suspendida-${empresa.id}`,
        tipo: porFalta ? "debe" : "suspendida",
        titulo: porFalta
          ? `${empresa.nombre} suspendida por falta de pago`
          : `${empresa.nombre} suspendida`,
        detalle: [
          `Desde el ${diaMes(desde)}`,
          porFalta && debe ? `debe ${pesos(debe)}` : null,
          usuarios,
        ].filter(Boolean).join(" · "),
        accion: porFalta ? "Cobrar" : "Revisar",
        href: porFalta ? `${ficha}?tab=plan` : ficha,
        empresaIds: [empresa.id],
        grave: true,
        urgencia: -(cuenta?.diasDeAtraso ?? 0),
      });
      continue;
    }
    if (empresa.estado !== "ACTIVA") continue;

    if (cuenta?.estado === "VENCIDA") {
      alertas.push({
        id: `debe-${empresa.id}`,
        tipo: "debe",
        titulo: debe ? `${empresa.nombre} debe ${pesos(debe)}` : `${empresa.nombre} vencida`,
        detalle: [
          cuenta.diasDeAtraso
            ? `${enDias(cuenta.diasDeAtraso)} de atraso`
            : "Vence hoy",
          cuenta.debeSuspenderse
            ? "se suspende en la próxima revisión"
            : cuenta.suspendeEl
              ? `se suspende el ${diaAR(cuenta.suspendeEl, false)}`
              : null,
        ].filter(Boolean).join(" · "),
        accion: "Cobrar",
        href: `${ficha}?tab=plan`,
        empresaIds: [empresa.id],
        grave: true,
        urgencia: -cuenta.diasDeAtraso,
      });
    } else if (
      cuenta &&
      (cuenta.estado === "PRUEBA" || cuenta.estado === "AL_DIA") &&
      cuenta.diasParaVencer !== null &&
      cuenta.diasParaVencer <= VENCE_PRONTO_DIAS &&
      // Con el débito confirmado se cobra solo: no hay nada que hacer.
      cuenta.debito?.estado !== "authorized"
    ) {
      const importe = cuenta.proximaFactura?.importe ?? cuenta.importePeriodo;
      alertas.push({
        id: `vence-pronto-${empresa.id}`,
        tipo: "vence-pronto",
        titulo: cuenta.estado === "PRUEBA"
          ? `La prueba de ${empresa.nombre} termina ${cuandoVence(cuenta.diasParaVencer)}`
          : `${empresa.nombre} vence ${cuandoVence(cuenta.diasParaVencer)}`,
        detalle: [
          importe ? `${cuenta.estado === "PRUEBA" ? "Primera factura" : "Factura"} ${pesos(importe)}` : null,
          cuenta.debito?.estado === "paused" ? "débito pausado" : "sin débito automático",
        ].filter(Boolean).join(" · "),
        accion: "Ver",
        href: `${ficha}?tab=plan`,
        empresaIds: [empresa.id],
        grave: false,
        urgencia: cuenta.diasParaVencer,
      });
    } else if (cuenta?.debito?.estado === "paused" && cuenta.estado !== "BAJA" && cuenta.estado !== "BONIFICADA") {
      alertas.push({
        id: `debito-pausado-${empresa.id}`,
        tipo: "debito-pausado",
        titulo: `${empresa.nombre}: débito automático pausado`,
        detalle: cuenta.proximoVencimiento
          ? `La factura del ${diaAR(cuenta.proximoVencimiento, false)} no se va a cobrar sola`
          : "Las próximas facturas no se van a cobrar solas",
        accion: "Ver",
        href: `${ficha}?tab=plan`,
        empresaIds: [empresa.id],
        grave: false,
      });
    }

    if (!empresa.playas.length) {
      alertas.push({
        id: `sin-playas-${empresa.id}`,
        tipo: "sin-playas",
        titulo: `${empresa.nombre} sin playas`,
        detalle: `Alta ${haceCuanto(empresa.createdAt)} · falta su primera playa`,
        accion: "Crear",
        href: `${ficha}?tab=playas`,
        empresaIds: [empresa.id],
        grave: false,
      });
    }

    for (const playa of empresa.playas) {
      const m = metricas.get(playa.id);
      if (m && !m.tieneTarifas)
        alertas.push({
          id: `sin-tarifas-${playa.id}`,
          tipo: "sin-tarifas",
          titulo: `${playa.nombre} sin tarifas`,
          detalle: `${empresa.nombre} · no registra entradas`,
          accion: "Ver",
          href: `${ficha}?tab=playas`,
          empresaIds: [empresa.id],
          grave: true,
        });
    }

    // Solo cuenta si ya podía operar: una empresa recién creada o sin tarifas ya tiene su aviso.
    const operables = empresa.playas
      .map((p) => metricas.get(p.id))
      .filter((m): m is PlayaMetrics => !!m && m.tieneTarifas);
    const ultima = operables
      .map((m) => m.ultimaOperacion)
      .filter((f): f is string => !!f)
      .sort()
      .pop();
    const quieta = ultima
      ? (minutosDesde(ultima) ?? 0) > SIN_OPERAR_MINUTOS
      : (minutosDesde(empresa.createdAt) ?? 0) > SIN_OPERAR_MINUTOS;
    if (operables.length && quieta)
      alertas.push({
        id: `sin-operar-${empresa.id}`,
        tipo: "sin-operar",
        titulo: ultima
          ? `${empresa.nombre} sin operar ${haceCuanto(ultima)}`
          : `${empresa.nombre} todavía no operó`,
        detalle: ultima
          ? `Última operación el ${diaMes(ultima)}`
          : "Tiene tarifas pero ninguna entrada registrada",
        accion: "Ver",
        href: ficha,
        empresaIds: [empresa.id],
        grave: false,
      });

    const cuantos = empresa.usuarios.filter(
      (u) => u.role === "USER" && !u.playaIds.length,
    ).length;
    if (cuantos) sinPlaya.push({ empresa, cuantos });
  }

  // Los operadores sin playa se juntan en una sola línea: uno por renglón llenaría la lista.
  if (sinPlaya.length) {
    const total = sinPlaya.reduce((n, s) => n + s.cuantos, 0);
    alertas.push({
      id: "sin-playa",
      tipo: "sin-playa",
      titulo: `${total} operador${total === 1 ? "" : "es"} sin playa`,
      detalle: sinPlaya
        .map((s) => `${s.empresa.nombre} (${s.cuantos})`)
        .join(" · "),
      accion: "Asignar",
      href: `/admin/empresas/${sinPlaya[0].empresa.id}?tab=usuarios`,
      empresaIds: sinPlaya.map((s) => s.empresa.id),
      grave: true,
    });
  }

  return alertas.sort(
    (a, b) => ORDEN[a.tipo] - ORDEN[b.tipo] || (a.urgencia ?? 0) - (b.urgencia ?? 0),
  );
}

export function empresasConAlertas(alertas: Alerta[]) {
  return new Set(alertas.flatMap((a) => a.empresaIds));
}
