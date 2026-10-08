// La frase de cada movimiento de la cuenta de una empresa con la plataforma (alta, prueba, plan,
// pagos, débito, suspensiones, adicionales). La usan el historial de la pestaña Plan y la
// Actividad de la empresa, para que el mismo hecho se lea igual en las dos.
//
// Devuelve null para lo que no es de la cuenta: cada pantalla decide cómo mostrar el resto.

import { MEDIOS_PAGO, diaAR, pesos } from "@/components/plataforma/cuenta";
import { MedioPagoSaas } from "@/types/suscripcion.type";

const enDias = (n: number) => (n === 1 ? "1 día" : `${n} días`);

const ADICIONALES: Record<string, string> = {
  VERIFICACION_ALIAS: "la verificación de transferencias al alias",
};

type Estado = { habilitado?: boolean; precioMensual?: number } | null | undefined;

export function describirMovimientoCuenta(
  accion: string,
  detalle: Record<string, unknown> | null,
): string | null {
  const d = (detalle ?? {}) as Record<string, string | number | boolean | null | undefined>;
  const fecha = (v: unknown) => (typeof v === "string" ? diaAR(v) : "—");
  const plata = (v: unknown) => (typeof v === "number" ? pesos(v) : "");
  switch (accion) {
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
          typeof d.periodo === "string"
            ? `la pasó a pago ${d.periodo.toLowerCase()}${typeof d.descuento === "number" && d.descuento > 0 ? ` (−${d.descuento}%)` : ""}`
            : null,
        ]
          .filter(Boolean)
          .join(" y ") || "editó la cuenta"
      );
    case "ADICIONAL_EDITADO": {
      const nombre = ADICIONALES[String(d.codigo)] ?? `el adicional ${d.codigo}`;
      const antes = detalle?.antes as Estado;
      const despues = detalle?.despues as Estado;
      const partes = [
        despues && antes?.habilitado !== despues.habilitado
          ? `${despues.habilitado ? "habilitó" : "deshabilitó"} ${nombre}`
          : null,
        despues && antes?.precioMensual !== despues.precioMensual && typeof despues.precioMensual === "number"
          ? `fijó su precio en ${pesos(despues.precioMensual)} por mes`
          : null,
      ].filter(Boolean);
      return partes.length ? partes.join(" y ") : `editó ${nombre}`;
    }
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
      return null;
  }
}
