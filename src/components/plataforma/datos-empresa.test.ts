import { cuitValido, datosFaltantes, enlaceWhatsApp, formatoCuit, lugarDe } from "./datos-empresa";

test("CUIT: verificador como el backend y formato con guiones", () => {
  expect(cuitValido("20123456786")).toBe(true);
  expect(cuitValido("20123456787")).toBe(false);
  expect(cuitValido("20000000060")).toBe(true);
  expect(formatoCuit("20123456786")).toBe("20-12345678-6");
  expect(formatoCuit(null)).toBe("");
});

test("WhatsApp: completa 549 a un celular argentino de 10 cifras y respeta el código de país", () => {
  expect(enlaceWhatsApp("341 555-1234")).toBe("https://wa.me/5493415551234");
  expect(enlaceWhatsApp("0341 5551234")).toBe("https://wa.me/5493415551234");
  expect(enlaceWhatsApp("+54 9 11 5555-0000", "Hola")).toBe("https://wa.me/5491155550000?text=Hola");
  expect(enlaceWhatsApp("1234")).toBeNull();
  expect(enlaceWhatsApp(null)).toBeNull();
});

test("lugar y datos faltantes", () => {
  expect(lugarDe({ ciudad: "Rosario", provincia: "Santa Fe" })).toBe("Rosario, Santa Fe");
  expect(lugarDe({ provincia: "Santa Fe" })).toBe("Santa Fe");
  expect(datosFaltantes({ cuit: "20123456786", condicionIva: "MONOTRIBUTO", contactoNombre: "Ana", contactoEmail: "a@b.c" })).toEqual([]);
  expect(datosFaltantes({})).toEqual(["CUIT", "condición frente al IVA", "contacto", "teléfono o email"]);
});
