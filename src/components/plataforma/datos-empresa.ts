import type { CondicionIva, DatosEmpresa } from "@/types/tenancy.type";

// Datos fiscales y de contacto de una empresa: cómo se escriben y se muestran. El backend valida
// lo mismo (src/tenancy/cuit.ts); acá solo se adelanta el aviso para no esperar el rechazo.

export const CONDICIONES_IVA: Record<CondicionIva, string> = {
  RESPONSABLE_INSCRIPTO: "Responsable inscripto",
  MONOTRIBUTO: "Monotributo",
  EXENTO: "Exento",
  CONSUMIDOR_FINAL: "Consumidor final",
};

export const PROVINCIAS = [
  "Buenos Aires", "Ciudad de Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba",
  "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones",
  "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe",
  "Santiago del Estero", "Tierra del Fuego", "Tucumán",
];

const PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
export const soloNumeros = (texto: string) => texto.replace(/\D/g, "");

/** Los 11 números con el dígito verificador correcto. */
export function cuitValido(cuit: string) {
  if (!/^\d{11}$/.test(cuit)) return false;
  const resto = 11 - (PESOS.reduce((t, p, i) => t + p * Number(cuit[i]), 0) % 11);
  const verificador = resto === 11 ? 0 : resto;
  return verificador !== 10 && verificador === Number(cuit[10]);
}

/** «30712345671» → «30-71234567-1». Si no son 11 números, tal cual. */
export function formatoCuit(cuit: string | null | undefined) {
  if (!cuit) return "";
  const n = soloNumeros(cuit);
  return n.length === 11 ? `${n.slice(0, 2)}-${n.slice(2, 10)}-${n.slice(10)}` : cuit;
}

/**
 * El enlace para escribirle por WhatsApp. Un número argentino de 10 cifras (característica y
 * número, sin 0 ni 15) se completa con 549, que es como lo pide wa.me para un celular; con el
 * código de país ya puesto, va tal cual.
 */
export function enlaceWhatsApp(telefono: string | null | undefined, texto?: string) {
  let n = soloNumeros(telefono ?? "");
  if (n.startsWith("0")) n = n.slice(1);
  if (n.length === 10) n = `549${n}`;
  if (n.length < 11) return null;
  return `https://wa.me/${n}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

/** «Rosario, Santa Fe», «Santa Fe» o vacío. */
export const lugarDe = (e: DatosEmpresa) => [e.ciudad, e.provincia].filter(Boolean).join(", ");

/** Cuántos de los datos de cobro y contacto faltan cargar: la ficha lo avisa. */
export function datosFaltantes(e: DatosEmpresa) {
  return [
    !e.cuit && "CUIT",
    !e.condicionIva && "condición frente al IVA",
    !e.contactoNombre && "contacto",
    !e.contactoTelefono && !e.contactoEmail && "teléfono o email",
  ].filter((x): x is string => !!x);
}
