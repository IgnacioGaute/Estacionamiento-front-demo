import type { EmpresaConDetalle } from "@/types/tenancy.type";
import type { ResumenCuenta } from "@/types/suscripcion.type";
import { alertasDePlataforma } from "./alertas";
import { cuentaDebe } from "./cuenta";

// La cobranza en «Requiere atención»: lo que se debe va primero, con el importe y el atraso, y
// lo que se cobra solo por débito no se avisa.

const cuenta = (c: Partial<ResumenCuenta>) =>
  ({
    estado: "AL_DIA",
    diasDeAtraso: 0,
    diasParaVencer: 20,
    proximoVencimiento: "2026-11-30",
    suspendeEl: null,
    debeSuspenderse: false,
    motivoSuspension: null,
    suspendidaEl: null,
    facturaPendiente: null,
    proximaFactura: null,
    importePeriodo: 70000,
    debito: null,
    ...c,
  }) as ResumenCuenta;

const empresa = (id: string, c: Partial<ResumenCuenta> | null, e: Partial<EmpresaConDetalle> = {}) =>
  ({
    id,
    nombre: `Empresa ${id}`,
    estado: "ACTIVA",
    playas: [],
    usuarios: [],
    suscripcion: c ? cuenta(c) : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...e,
  }) as EmpresaConDetalle;

const pendiente = (importe: number) => ({ id: "f", importe, desde: "2026-11-01", hasta: "2026-11-30", meses: 1, descuento: 0 });

const deCobro = (empresas: EmpresaConDetalle[]) =>
  alertasDePlataforma(empresas, []).filter((a) => a.tipo !== "sin-playas");

test("la que debe va primero, con el importe, el atraso y cuándo se suspende; la de más atraso antes", () => {
  const alertas = deCobro([
    empresa("a", { estado: "AL_DIA", diasParaVencer: 2 }),
    empresa("b", { estado: "VENCIDA", diasDeAtraso: 1, suspendeEl: "2026-11-13", facturaPendiente: pendiente(70000) }),
    empresa("c", { estado: "VENCIDA", diasDeAtraso: 4, debeSuspenderse: true, facturaPendiente: pendiente(120000) }),
  ]);
  expect(alertas.map((a) => a.id)).toEqual(["debe-c", "debe-b", "vence-pronto-a"]);
  expect(alertas[0]).toMatchObject({ titulo: "Empresa c debe $120.000", accion: "Cobrar", grave: true, href: "/admin/empresas/c?tab=plan" });
  expect(alertas[0].detalle).toBe("4 días de atraso · se suspende en la próxima revisión");
  expect(alertas[1].detalle).toBe("1 día de atraso · se suspende el 13/11");
});

test("la suspendida por falta de pago es cobranza y dice desde cuándo con la fecha de la suspensión", () => {
  const [alerta] = alertasDePlataforma(
    [
      empresa(
        "s",
        { estado: "SUSPENDIDA", motivoSuspension: "FALTA_DE_PAGO", suspendidaEl: "2026-11-05T15:00:00.000Z", facturaPendiente: pendiente(70000) },
        // Editada después de suspendida: el «desde» no se tiene que correr.
        { estado: "SUSPENDIDA", updatedAt: "2026-11-09T15:00:00.000Z" },
      ),
    ],
    [],
  );
  expect(alerta).toMatchObject({ tipo: "debe", accion: "Cobrar", titulo: "Empresa s suspendida por falta de pago" });
  // El ICU de Node no siempre respeta el día con dos cifras: lo que importa es que es el 5.
  expect(alerta.detalle).toMatch(/^Desde el 0?5\/11 · debe \$70\.000 · 0 usuarios sin acceso$/);
});

test("la prueba que termina sin débito avisa; con el débito confirmado no hay nada que hacer", () => {
  const alertas = deCobro([
    empresa("p", { estado: "PRUEBA", diasParaVencer: 1, proximaFactura: { desde: "2026-11-10", hasta: "2026-11-30", importe: 49000, proporcional: true } }),
    empresa("d", { estado: "PRUEBA", diasParaVencer: 1, debito: { estado: "authorized", email: null, url: null } }),
  ]);
  expect(alertas).toHaveLength(1);
  expect(alertas[0]).toMatchObject({ titulo: "La prueba de Empresa p termina mañana", detalle: "Primera factura $49.000 · sin débito automático" });
});

test("un débito pausado se avisa aunque falte para el vencimiento", () => {
  const [alerta] = deCobro([empresa("x", { debito: { estado: "paused", email: null, url: null } })]);
  expect(alerta).toMatchObject({ tipo: "debito-pausado", detalle: "La factura del 30/11 no se va a cobrar sola" });
});

test("cuentaDebe: vencida o suspendida por falta de pago; no la suspendida a mano ni la que vence pronto", () => {
  expect(cuentaDebe(cuenta({ estado: "VENCIDA" }))).toBe(true);
  expect(cuentaDebe(cuenta({ estado: "SUSPENDIDA", motivoSuspension: "FALTA_DE_PAGO" }))).toBe(true);
  expect(cuentaDebe(cuenta({ estado: "SUSPENDIDA", motivoSuspension: "MANUAL" }))).toBe(false);
  expect(cuentaDebe(cuenta({ estado: "AL_DIA", diasParaVencer: 1 }))).toBe(false);
  expect(cuentaDebe(null)).toBe(false);
});
