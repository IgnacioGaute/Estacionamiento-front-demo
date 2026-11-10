import { describirMovimientoCuenta } from "./describir-cuenta";

// El motivo que pide el diálogo de suspender se lee en la Actividad y en el historial del Plan.

test("la suspensión y la reactivación a mano dicen su motivo", () => {
  expect(describirMovimientoCuenta("EMPRESA_SUSPENDIDA", { motivo: "pidió pausar el servicio" }))
    .toBe("suspendió la empresa: «pidió pausar el servicio»");
  expect(describirMovimientoCuenta("EMPRESA_ACTIVA", { motivo: "volvió a abrir" }))
    .toBe("reactivó la empresa: «volvió a abrir»");
});

test("sin motivo (las de antes) queda la frase general; la de la revisión diaria sigue contando el atraso", () => {
  expect(describirMovimientoCuenta("EMPRESA_SUSPENDIDA", {})).toBe("suspendió la empresa");
  expect(describirMovimientoCuenta("EMPRESA_ACTIVA", {})).toBe("reactivó la empresa");
  expect(
    describirMovimientoCuenta("EMPRESA_SUSPENDIDA", { motivo: "FALTA_DE_PAGO", vencio: "2026-11-01", diasDeAtraso: 6 }),
  ).toBe("suspendió la empresa por falta de pago (venció el 01/11/2026, 6 días de atraso)");
});
