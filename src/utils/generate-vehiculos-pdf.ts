// El informe de Vehículos en PDF, con los filtros que se están viendo. No copia la planilla: es un
// documento para imprimir o mandar. A4 apaisado, fondo blanco (gasta poca tinta), el amarillo de
// la marca solo como acento, un resumen arriba y la tabla con la permanencia en el color de su
// tramo, como en la pantalla de operación. Sirve igual en una playa con cobro y en una gratuita:
// las filas no llevan importes; el encabezado dice en qué modo está la playa.

import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, type RGB } from 'pdf-lib';
import { TRAMOS, formatEstadia, tramoInfo } from '@/utils/estadia';
import type { EstadoPlanilla, FilaPlanillaVehiculos, PlanillaVehiculos } from '@/services/tickets.service';

export type ContextoPdfVehiculos = {
  playa: string;
  empresa?: string | null;
  desde: string;
  hasta: string;
  estado: EstadoPlanilla;
  gratuita: boolean;
  // Los filtros que no son el período, ya en palabras: «Operador: Ana», «Tipo: Auto»…
  filtros: string[];
  generado: Date;
};

const ANCHO = 842; // A4 apaisado
const ALTO = 595;
const MARGEN = 36;
const UTIL = ANCHO - MARGEN * 2;

const hex = (color: string): RGB => {
  const n = parseInt(color.replace('#', ''), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
const TINTA = hex('#1A1814');
const GRIS = hex('#6B655B');
const GRIS_CLARO = hex('#9A9488');
const LINEA = hex('#E4E0D8');
const FONDO = hex('#F5F3EE');
const FILA_ALTERNA = hex('#FAF9F6');
const AMARILLO = hex('#F5C219');
const CABECERA = hex('#24211C');
const ADENTRO = hex('#B7791F');

const TITULOS: Record<EstadoPlanilla, string> = {
  TODAS: 'Entradas y salidas',
  ENTRADAS: 'Entradas',
  SALIDAS: 'Salidas',
  PRESENTES: 'Vehículos adentro',
};

// Las fuentes estándar del PDF solo codifican WinAnsi (latín, acentos, «», ñ, –, —, …). Lo que
// no entra (emojis, otros alfabetos) se reemplaza para que un nombre raro no rompa el informe.
const EXTRAS_WINANSI = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');
export function textoSeguro(texto: string) {
  return Array.from(texto ?? '')
    .map((c) => {
      const code = c.charCodeAt(0);
      if (c === '\n' || c === '\t') return ' ';
      if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || EXTRAS_WINANSI.has(c)) return c;
      return '?';
    })
    .join('');
}

// Recorta al ancho disponible con «…».
function ajustar(texto: string, fuente: PDFFont, tamano: number, ancho: number) {
  let t = textoSeguro(texto);
  if (fuente.widthOfTextAtSize(t, tamano) <= ancho) return t;
  while (t.length > 1 && fuente.widthOfTextAtSize(`${t}…`, tamano) > ancho) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

const dd = (n: number) => String(n).padStart(2, '0');
// El día llega como «2026-10-23» o como fecha completa («2026-10-23T03:00:00.000Z», la medianoche
// de Buenos Aires en UTC): en los dos casos el día son los primeros diez caracteres.
const partes = (dia: string) => dia.slice(0, 10).split('-');
const fechaLarga = (dia: string) => {
  const [a, m, d] = partes(dia);
  return `${d}/${m}/${a}`;
};
const fechaHora = (dia: string | null, hora: string | null) => {
  if (!dia) return '—';
  const [a, m, d] = partes(dia);
  return `${d}/${m}/${a.slice(2)}  ${hora?.slice(0, 5) ?? ''}`.trim();
};
const momento = (f: Date) =>
  `${dd(f.getDate())}/${dd(f.getMonth() + 1)}/${f.getFullYear()} ${dd(f.getHours())}:${dd(f.getMinutes())}`;

type Columna = { titulo: string; ancho: number; alinear?: 'derecha' };
const COLUMNAS: Columna[] = [
  { titulo: '#', ancho: 28 },
  { titulo: 'Vehículo', ancho: 120 },
  { titulo: 'Tipo', ancho: 90 },
  { titulo: 'Entrada', ancho: 95 },
  { titulo: 'Salida', ancho: 95 },
  { titulo: 'Permanencia', ancho: 110 },
  { titulo: 'Registró la entrada', ancho: 116 },
  { titulo: 'Registró la salida', ancho: 116 },
];
const ALTO_FILA = 22;
const ALTO_CABECERA = 22;

export async function generarPdfVehiculos(
  filas: FilaPlanillaVehiculos[],
  resumen: PlanillaVehiculos['resumen'] | null | undefined,
  contexto: ContextoPdfVehiculos,
  nombreTipo: (code: string | null) => string,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(textoSeguro(`Vehículos · ${contexto.playa}`));
  doc.setCreator('Estacionamiento');
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.CourierBold);

  const presentes = contexto.estado === 'PRESENTES';
  const periodo = presentes
    ? `Al ${momento(contexto.generado)}`
    : contexto.desde === contexto.hasta
      ? `Del ${fechaLarga(contexto.desde)}`
      : `Del ${fechaLarga(contexto.desde)} al ${fechaLarga(contexto.hasta)}`;
  const texto = (pagina: PDFPage, t: string, x: number, y: number, tamano: number, fuente = normal, color = TINTA) =>
    pagina.drawText(textoSeguro(t), { x, y, size: tamano, font: fuente, color });

  const paginas: PDFPage[] = [];
  let pagina!: PDFPage;
  let y = 0;

  const cabeceraTabla = () => {
    pagina.drawRectangle({ x: MARGEN, y: y - ALTO_CABECERA, width: UTIL, height: ALTO_CABECERA, color: CABECERA });
    let x = MARGEN;
    for (const c of COLUMNAS) {
      texto(pagina, c.titulo, x + 8, y - 14.5, 8.5, negrita, rgb(1, 1, 1));
      x += c.ancho;
    }
    y -= ALTO_CABECERA;
  };

  const nuevaPagina = () => {
    pagina = doc.addPage([ANCHO, ALTO]);
    paginas.push(pagina);
    pagina.drawRectangle({ x: 0, y: ALTO - 6, width: ANCHO, height: 6, color: AMARILLO });
    if (paginas.length === 1) return;
    // Las hojas siguientes repiten una línea de contexto y los títulos de la tabla.
    y = ALTO - MARGEN - 4;
    texto(pagina, `${TITULOS[contexto.estado]} · ${contexto.playa}`, MARGEN, y - 10, 10, negrita);
    const derecha = periodo;
    texto(pagina, derecha, MARGEN + UTIL - normal.widthOfTextAtSize(textoSeguro(derecha), 9), y - 10, 9, normal, GRIS);
    y -= 24;
    cabeceraTabla();
  };

  // Primera hoja: título, contexto y resumen.
  nuevaPagina();
  y = ALTO - MARGEN - 6;
  texto(pagina, 'INFORME DE VEHÍCULOS', MARGEN, y - 9, 8, negrita, GRIS);
  texto(pagina, TITULOS[contexto.estado], MARGEN, y - 34, 22, negrita);
  texto(pagina, periodo, MARGEN, y - 52, 10.5, normal, GRIS);

  const derechaX = MARGEN + UTIL;
  const playa = ajustar(contexto.playa, negrita, 12, 300);
  texto(pagina, playa, derechaX - negrita.widthOfTextAtSize(playa, 12), y - 12, 12, negrita);
  if (contexto.empresa) {
    const empresa = ajustar(contexto.empresa, normal, 9, 300);
    texto(pagina, empresa, derechaX - normal.widthOfTextAtSize(empresa, 9), y - 26, 9, normal, GRIS);
  }
  const generado = `Generado el ${momento(contexto.generado)}`;
  texto(pagina, generado, derechaX - normal.widthOfTextAtSize(generado, 8.5), y - 40, 8.5, normal, GRIS_CLARO);

  // Etiquetas: el modo de la playa y los filtros aplicados.
  let xEtiqueta = MARGEN;
  const etiqueta = (t: string, destacada = false) => {
    const contenido = textoSeguro(t);
    const ancho = normal.widthOfTextAtSize(contenido, 8.5) + 16;
    pagina.drawRectangle({
      x: xEtiqueta, y: y - 80, width: ancho, height: 17,
      color: destacada ? hex('#FDF3D0') : FONDO,
      borderColor: destacada ? hex('#E9C95A') : LINEA, borderWidth: 0.6,
    });
    pagina.drawText(contenido, { x: xEtiqueta + 8, y: y - 74.5, size: 8.5, font: normal, color: TINTA });
    xEtiqueta += ancho + 6;
  };
  etiqueta(contexto.gratuita ? 'Playa en modo gratuito' : 'Playa con cobro', true);
  for (const f of contexto.filtros) etiqueta(f);
  y -= 98;

  // Resumen en cuatro recuadros.
  const permanencia = resumen?.permanenciaMediana != null ? formatEstadia(resumen.permanenciaMediana) : '—';
  const datos: [string, string, string][] = [
    ['Entradas', String(resumen?.entradas ?? '—'), presentes ? 'del día' : 'en el período'],
    ['Salidas', String(resumen?.salidas ?? '—'), presentes ? 'del día' : 'en el período'],
    ['Adentro ahora', String(resumen?.presentes ?? '—'), 'en la playa'],
    ['Permanencia típica', permanencia, 'mediana de las salidas'],
  ];
  const separacion = 10;
  const anchoCaja = (UTIL - separacion * 3) / 4;
  datos.forEach(([titulo, valor, pie], i) => {
    const x = MARGEN + i * (anchoCaja + separacion);
    pagina.drawRectangle({ x, y: y - 58, width: anchoCaja, height: 58, color: FONDO, borderColor: LINEA, borderWidth: 0.6 });
    if (i === 2) pagina.drawRectangle({ x, y: y - 58, width: 3, height: 58, color: AMARILLO });
    texto(pagina, titulo, x + 12, y - 16, 8.5, negrita, GRIS);
    texto(pagina, valor, x + 12, y - 38, 19, negrita);
    texto(pagina, pie, x + 12, y - 51, 7.5, normal, GRIS_CLARO);
  });
  y -= 80;

  // Cantidad y leyenda de colores de la permanencia.
  texto(pagina, `${filas.length} ${filas.length === 1 ? 'registro' : 'registros'}`, MARGEN, y - 4, 9.5, negrita);
  let xLeyenda = MARGEN + UTIL;
  for (const t of [...TRAMOS].reverse()) {
    const ancho = normal.widthOfTextAtSize(t.label, 8) ;
    xLeyenda -= ancho;
    texto(pagina, t.label, xLeyenda, y - 4, 8, normal, GRIS);
    xLeyenda -= 10;
    pagina.drawCircle({ x: xLeyenda + 4, y: y - 1.5, size: 3, color: hex(t.color) });
    xLeyenda -= 12;
  }
  y -= 14;
  cabeceraTabla();

  // Filas.
  filas.forEach((f, i) => {
    if (y - ALTO_FILA < MARGEN + 24) nuevaPagina();
    const base = y - ALTO_FILA;
    if (i % 2 === 1) pagina.drawRectangle({ x: MARGEN, y: base, width: UTIL, height: ALTO_FILA, color: FILA_ALTERNA });
    pagina.drawLine({ start: { x: MARGEN, y: base }, end: { x: MARGEN + UTIL, y: base }, thickness: 0.5, color: LINEA });
    const yTexto = base + 7.5;
    let x = MARGEN;
    const celda = (indice: number) => {
      const c = COLUMNAS[indice];
      const inicio = x;
      x += c.ancho;
      return { x: inicio + 8, ancho: c.ancho - 14 };
    };

    const numero = celda(0);
    texto(pagina, String(i + 1), numero.x, yTexto, 8, normal, GRIS_CLARO);

    const vehiculo = celda(1);
    const patente = ajustar(f.vehiculo, mono, 10.5, vehiculo.ancho - (f.origen === 'BARCODE' ? 38 : 0));
    texto(pagina, patente, vehiculo.x, yTexto, 10.5, mono);
    if (f.origen === 'BARCODE') texto(pagina, 'tarjeta', vehiculo.x + mono.widthOfTextAtSize(patente, 10.5) + 5, yTexto + 0.5, 7.5, normal, GRIS);

    const tipo = celda(2);
    texto(pagina, ajustar(nombreTipo(f.tipo), normal, 9, tipo.ancho), tipo.x, yTexto, 9);

    const entrada = celda(3);
    texto(pagina, fechaHora(f.entradaDia, f.entradaHora), entrada.x, yTexto, 9);

    const salida = celda(4);
    if (f.salidaDia) texto(pagina, fechaHora(f.salidaDia, f.salidaHora), salida.x, yTexto, 9);
    else texto(pagina, 'Adentro', salida.x, yTexto, 9, negrita, ADENTRO);

    const estadia = celda(5);
    if (f.permanenciaMinutos != null) {
      pagina.drawCircle({ x: estadia.x + 3, y: yTexto + 3, size: 3, color: hex(tramoInfo(f.permanenciaMinutos).color) });
      const t = formatEstadia(f.permanenciaMinutos) + (f.salidaDia ? '' : ' y sigue');
      texto(pagina, ajustar(t, normal, 9, estadia.ancho - 12), estadia.x + 11, yTexto, 9);
    } else texto(pagina, '—', estadia.x, yTexto, 9, normal, GRIS_CLARO);

    const operadorEntrada = celda(6);
    texto(pagina, ajustar(f.operadorEntrada ?? 'No registrado', normal, 9, operadorEntrada.ancho), operadorEntrada.x, yTexto, 9, normal, f.operadorEntrada ? TINTA : GRIS_CLARO);

    const operadorSalida = celda(7);
    if (f.salidaDia) texto(pagina, ajustar(f.operadorSalida ?? 'No registrado', normal, 9, operadorSalida.ancho), operadorSalida.x, yTexto, 9, normal, f.operadorSalida ? TINTA : GRIS_CLARO);
    else texto(pagina, '—', operadorSalida.x, yTexto, 9, normal, GRIS_CLARO);

    y = base;
  });

  // Pie de cada hoja, con el total de hojas ya conocido.
  paginas.forEach((p, i) => {
    p.drawLine({ start: { x: MARGEN, y: MARGEN - 4 }, end: { x: MARGEN + UTIL, y: MARGEN - 4 }, thickness: 0.5, color: LINEA });
    p.drawText(textoSeguro(`Estacionamiento · Informe de vehículos · ${contexto.playa}`), { x: MARGEN, y: MARGEN - 16, size: 7.5, font: normal, color: GRIS_CLARO });
    const numero = `Página ${i + 1} de ${paginas.length}`;
    p.drawText(numero, { x: MARGEN + UTIL - normal.widthOfTextAtSize(numero, 7.5), y: MARGEN - 16, size: 7.5, font: normal, color: GRIS_CLARO });
  });

  return doc.save();
}
