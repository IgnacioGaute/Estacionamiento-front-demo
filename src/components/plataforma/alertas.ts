import { EmpresaConDetalle, PlayaMetrics } from "@/types/tenancy.type";
import { diaMes, haceCuanto, minutosDesde } from "./formato";

// Lo que el super admin tiene que resolver. Una sola fuente para las tres pantallas: el listado
// de «Requiere atención», el filtro «Con alertas» y el contador de salud de la plataforma tienen
// que dar el mismo número, o ninguno de los tres se cree.

export type TipoAlerta =
  | "sin-tarifas"
  | "sin-playa"
  | "suspendida"
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
};

// Dos días sin movimientos en una empresa que ya opera es raro: una playa no cierra 48 horas
// seguidas sin avisar. Menos que eso sería ruido cada domingo.
const SIN_OPERAR_MINUTOS = 48 * 60;

const ORDEN: Record<TipoAlerta, number> = {
  "sin-tarifas": 0,
  "sin-playa": 1,
  suspendida: 2,
  "sin-operar": 3,
  "sin-playas": 4,
};

export function alertasDePlataforma(
  empresas: EmpresaConDetalle[],
  playas: PlayaMetrics[],
): Alerta[] {
  const alertas: Alerta[] = [];
  const metricas = new Map(playas.map((p) => [p.playaId, p]));
  const sinPlaya: { empresa: EmpresaConDetalle; cuantos: number }[] = [];

  for (const empresa of empresas) {
    const ficha = `/admin/empresas/${empresa.id}`;

    if (empresa.estado === "SUSPENDIDA") {
      alertas.push({
        id: `suspendida-${empresa.id}`,
        tipo: "suspendida",
        titulo: `${empresa.nombre} suspendida`,
        detalle: `Desde el ${diaMes(empresa.updatedAt)} · ${empresa.usuarios.length} usuarios sin acceso`,
        accion: "Revisar",
        href: ficha,
        empresaIds: [empresa.id],
        grave: true,
      });
      continue;
    }
    if (empresa.estado !== "ACTIVA") continue;

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

  return alertas.sort((a, b) => ORDEN[a.tipo] - ORDEN[b.tipo]);
}

export function empresasConAlertas(alertas: Alerta[]) {
  return new Set(alertas.flatMap((a) => a.empresaIds));
}
