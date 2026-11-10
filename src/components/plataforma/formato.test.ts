import { iniciales } from "./formato";

test("iniciales: sin conectores ni palabras del rubro, salvo que no quede otra", () => {
  expect(iniciales("Cocheras del Sur")).toBe("CS");
  expect(iniciales("Estacionamiento Calle Mitre")).toBe("CM");
  expect(iniciales("Estacionamiento Calle Colon")).toBe("CC");
  expect(iniciales("Parking")).toBe("P");
  expect(iniciales("prueba 1")).toBe("P1");
  expect(iniciales("")).toBe("?");
});
