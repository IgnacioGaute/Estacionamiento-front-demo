import type { RecognizePlateResult } from '@/actions/tickets/recognize-plate.action';
import { capturarCuadro } from './plate-photo';
import { MUESTRA_ALTO, MUESTRA_ANCHO, aGrises, diferencia, nitidez, zonaDeLaGuia } from './plate-frame';
import { looksLikeKnownPlateFormat, sanitizePlateInput } from './plate.utils';

// Cada consulta a Plate Recognizer se paga, encuentre o no una patente. El celular mira el video
// varias veces por segundo (gratis) y consulta solo cuando dentro de la guía hay algo nítido y la
// imagen está quieta; tras una lectura fallida espera a que el encuadre cambie, porque el mismo
// cuadro daría lo mismo. La idea es quedar en 1 o 2 consultas por auto.
const TIEMPO_MAXIMO_MS = 10_000;
export const CONSULTAS_MAXIMAS = 5;
// Plate Recognizer atiende una consulta por segundo (plan gratuito) para toda la plataforma.
const PAUSA_ENTRE_CONSULTAS_MS = 1100;
const CONFIANZA_MINIMA = 0.8;
// Lo que tarda el autofoco del celular en asentarse al abrir la cámara.
const ESPERA_ENFOQUE_MS = 700;
const MUESTREO_MS = 120;

// Umbrales calibrados con escenas simuladas (muestra de 160 px de la guía): patente nítida ≈ 17,
// patente lejana ≈ 8, muy desenfocada ≈ 11, asfalto o pared sin patente < 2. El movimiento se mide
// relativo a la nitidez, así un desplazamiento de unos 4 px pesa igual con o sin mucho detalle.
const NITIDEZ_MINIMA = 5;
// Frente al mejor cuadro de los últimos segundos: descarta los que salieron movidos o desenfocados.
const NITIDEZ_RELATIVA = 0.7;
const VENTANA_NITIDEZ_MS = 3000;
const MOVIMIENTO_RELATIVO = 0.5;
const MOVIMIENTO_MINIMO = 1.5;
const MUESTRAS_QUIETAS = 2;
// Cuánto tiene que cambiar el encuadre después de una lectura fallida (acercarse, otro ángulo).
const CAMBIO_RELATIVO = 1;

// El visor y la guía se dibujan con estas mismas medidas: la zona que se analiza es la que el
// operador ve dentro del recuadro.
export const ASPECTO_VISOR = 3 / 4;
export const ANCHO_GUIA = 0.78;

export type EstadoBusqueda = 'apuntando' | 'leyendo' | 'mover';

export type ResultadoBusqueda =
  | { tipo: 'patente'; plate: string; dudosa: boolean }
  | { tipo: 'sin-resultado' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'cancelado' };

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Busca una patente en el video en vivo hasta leerla con confianza, agotar el tiempo o las
// consultas, o que `cancelado()` dé true. `alCambiar` avisa qué mostrarle al operador.
export async function buscarPatente(
  video: HTMLVideoElement,
  {
    reconocer,
    alCambiar,
    cancelado,
  }: {
    reconocer: (foto: File) => Promise<RecognizePlateResult>;
    alCambiar: (estado: EstadoBusqueda) => void;
    cancelado: () => boolean;
  },
): Promise<ResultadoBusqueda> {
  const lienzo = document.createElement('canvas');
  lienzo.width = MUESTRA_ANCHO;
  lienzo.height = MUESTRA_ALTO;
  const ctx = lienzo.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { tipo: 'error', mensaje: 'No se pudo abrir la cámara.' };
  ctx.imageSmoothingQuality = 'high';

  const muestrear = () => {
    if (!video.videoWidth || !video.videoHeight) return null;
    const zona = zonaDeLaGuia(video.videoWidth, video.videoHeight, ASPECTO_VISOR, ANCHO_GUIA);
    ctx.drawImage(video, zona.x, zona.y, zona.ancho, zona.alto, 0, 0, MUESTRA_ANCHO, MUESTRA_ALTO);
    const gris = aGrises(ctx.getImageData(0, 0, MUESTRA_ANCHO, MUESTRA_ALTO).data);
    return { gris, nitidez: nitidez(gris, MUESTRA_ANCHO) };
  };

  // El muestreo corre cada 120 ms: solo se avisa cuando cambia lo que hay que mostrar.
  let estadoActual: EstadoBusqueda | null = null;
  const avisar = (estado: EstadoBusqueda) => {
    if (estado === estadoActual) return;
    estadoActual = estado;
    alCambiar(estado);
  };

  await esperar(ESPERA_ENFOQUE_MS);
  const fin = Date.now() + TIEMPO_MAXIMO_MS;
  let anterior: Float32Array | null = null;
  // Muestra del último cuadro consultado sin éxito: hasta que el encuadre cambie, no se consulta.
  let fallida: Float32Array | null = null;
  let quietas = 0;
  let recientes: { t: number; valor: number }[] = [];
  let ultimaConsulta = 0;
  let consultas = 0;
  let mejor: { plate: string; score: number } | null = null;

  // Con la app en segundo plano el video se congela o queda en negro: se corta la búsqueda.
  while (!document.hidden && Date.now() < fin && consultas < CONSULTAS_MAXIMAS) {
    await esperar(MUESTREO_MS);
    if (cancelado()) return { tipo: 'cancelado' };
    const muestra = muestrear();
    if (!muestra) continue;
    const ahora = Date.now();

    const movimiento = anterior ? diferencia(muestra.gris, anterior) : Infinity;
    anterior = muestra.gris;
    const quieta = movimiento < Math.max(MOVIMIENTO_MINIMO, MOVIMIENTO_RELATIVO * muestra.nitidez);
    quietas = quieta ? quietas + 1 : 0;
    recientes = recientes.filter((r) => ahora - r.t < VENTANA_NITIDEZ_MS);
    recientes.push({ t: ahora, valor: muestra.nitidez });
    const pico = Math.max(...recientes.map((r) => r.valor));

    if (fallida && diferencia(muestra.gris, fallida) > CAMBIO_RELATIVO * Math.max(muestra.nitidez, 1)) {
      fallida = null;
    }
    if (fallida) {
      avisar('mover');
      continue;
    }

    const vale =
      quietas >= MUESTRAS_QUIETAS &&
      muestra.nitidez >= Math.max(NITIDEZ_MINIMA, NITIDEZ_RELATIVA * pico) &&
      ahora - ultimaConsulta >= PAUSA_ENTRE_CONSULTAS_MS;
    if (!vale) {
      avisar('apuntando');
      continue;
    }

    const cuadro = await capturarCuadro(video);
    if (cancelado()) return { tipo: 'cancelado' };
    if (!cuadro) continue;
    avisar('leyendo');
    ultimaConsulta = Date.now();
    consultas++;

    const resultado = await reconocer(cuadro).catch(
      (): RecognizePlateResult => ({ error: 'Error de conexión con el servidor.' }),
    );
    if (cancelado()) return { tipo: 'cancelado' };

    if ('error' in resultado) {
      // Ocupado: el mismo cuadro sirve, se vuelve a consultar pasada la pausa.
      if (resultado.code === 'PLATE_RECOGNIZER_BUSY') continue;
      if (resultado.code === 'SIN_PATENTE') {
        fallida = muestra.gris;
        continue;
      }
      return { tipo: 'error', mensaje: resultado.error };
    }

    const plate = sanitizePlateInput(resultado.plate);
    const score = resultado.score ?? 0;
    // Los cuatro formatos argentinos, motos incluidas; una lectura con otro formato no se carga
    // sola (puede ser un cartel o una patente extranjera: se escribe a mano).
    if (looksLikeKnownPlateFormat(plate)) {
      if (score >= CONFIANZA_MINIMA) return { tipo: 'patente', plate, dudosa: false };
      if (!mejor || score > mejor.score) mejor = { plate, score };
    }
    fallida = muestra.gris;
  }

  if (cancelado()) return { tipo: 'cancelado' };
  if (mejor) return { tipo: 'patente', plate: mejor.plate, dudosa: true };
  return { tipo: 'sin-resultado' };
}
