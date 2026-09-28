// Formatos compartidos por las pantallas de plataforma (métricas, empresas y ficha). Viven juntos
// para que un mismo importe se lea igual en las tres: si una dice «$ 40,6 M» y otra «$ 40.612.345»
// el super admin no sabe si está viendo lo mismo.

export function numero(valor: number, decimales = 0) {
  return valor.toLocaleString("es-AR", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

export const plata = (valor: number) => `$ ${numero(Math.round(valor))}`;

// «1 playa», «3 playas»: con una empresa chica, «1 playas» aparece en todas las pantallas.
export const plural = (n: number, uno: string, varios: string) =>
  `${numero(n)} ${n === 1 ? uno : varios}`;

// Importes grandes abreviados: en una tarjeta cabe «$ 236,4 M», no nueve dígitos.
export function corto(valor: number) {
  const abs = Math.abs(valor);
  if (abs >= 1e6) return `$ ${numero(valor / 1e6, 1)} M`;
  if (abs >= 1e3) return `$ ${numero(valor / 1e3)} k`;
  return `$ ${numero(Math.round(valor))}`;
}

// Variación porcentual. Null cuando no hay contra qué comparar: un «+100 %» contra cero no dice
// nada y asusta.
export function variacion(actual: number, previo: number) {
  return previo ? ((actual - previo) / previo) * 100 : null;
}

export function minutosDesde(iso: string | null) {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

// «Hace un rato» dice más que una fecha completa para saber si una empresa está trabajando.
export function haceCuanto(iso: string | null) {
  const minutos = minutosDesde(iso);
  if (minutos === null) return "Sin operación";
  if (minutos < 1) return "hace un instante";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `hace ${dias} día${dias === 1 ? "" : "s"}`;
}

export const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export const diaMes = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });

export const mesAnio = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", { month: "2-digit", year: "numeric" });

// «Cocheras del Sur» → «CS». Los conectores no cuentan: «CD» no se reconoce como nada.
const CONECTORES = new Set(["de", "del", "la", "las", "el", "los", "y", "&"]);
export function iniciales(nombre: string) {
  const palabras = nombre
    .split(/\s+/)
    .filter((p) => p && !CONECTORES.has(p.toLowerCase()));
  return (
    palabras
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "?"
  );
}

// Fondos de avatar: tonos apagados de la misma paleta cálida, para que las empresas se distingan
// en una lista sin que ninguno compita con el amarillo.
const AVATARES = [
  "#3A2F1C",
  "#2C3530",
  "#33304A",
  "#3E2C26",
  "#2B3440",
  "#3A3322",
  "#3B2A30",
  "#2A3A36",
  "#36302A",
  "#2E2A3A",
  "#3A2626",
  "#2A3340",
];
export function colorAvatar(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATARES[hash % AVATARES.length];
}

// Promedia una serie larga en `puntos` tramos: un sparkline de 90 días dibujado punto a punto es
// ruido, no forma.
export function resumir(valores: number[], puntos = 30) {
  if (valores.length <= puntos) return valores;
  const paso = valores.length / puntos;
  return Array.from({ length: puntos }, (unused, i) => {
    const desde = Math.floor(i * paso);
    const hasta = Math.max(desde + 1, Math.floor((i + 1) * paso));
    const tramo = valores.slice(desde, hasta);
    return tramo.reduce((n, v) => n + v, 0) / tramo.length;
  });
}

export const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const DIAS_SEMANA_LARGO = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
