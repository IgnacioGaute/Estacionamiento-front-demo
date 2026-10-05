// Plate Recognizer rechaza imágenes de más de 3 MB, y una foto de cámara de celular pesa entre 3
// y 8 MB: subida tal cual, el reconocimiento fallaba en casi todos los teléfonos reales. Para leer
// una patente sobra con ~1600 px del lado largo; además la foto viaja mucho más rápido con datos.
const LADO_MAXIMO = 1600;
const LIMITE_BYTES = 3 * 1024 * 1024;

function cargarImagen(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la foto.'));
    };
    img.src = url;
  });
}

function aJpeg(canvas: HTMLCanvasElement, calidad: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', calidad));
}

async function dibujarComoJpeg(
  fuente: CanvasImageSource,
  ancho: number,
  alto: number,
): Promise<File | null> {
  const escala = Math.min(1, LADO_MAXIMO / Math.max(ancho, alto));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(ancho * escala);
  canvas.height = Math.round(alto * escala);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(fuente, 0, 0, canvas.width, canvas.height);

  for (const calidad of [0.85, 0.7]) {
    const blob = await aJpeg(canvas, calidad);
    if (blob && blob.size <= LIMITE_BYTES) {
      return new File([blob], 'patente.jpg', { type: 'image/jpeg' });
    }
  }
  return null;
}

// Se dibuja desde un <img> y no con createImageBitmap porque el <img> ya aplica la orientación
// EXIF en todos los navegadores móviles: una foto sacada con el celular vertical no llega acostada.
export async function prepararFotoPatente(file: File): Promise<File> {
  let img: HTMLImageElement;
  try {
    img = await cargarImagen(file);
  } catch {
    // Formato que el navegador no sabe dibujar: se manda como vino y decide el servidor.
    return file;
  }
  return (await dibujarComoJpeg(img, img.naturalWidth, img.naturalHeight)) ?? file;
}

// Cuadro actual de la cámara en vivo. Null mientras el video todavía no tiene imagen.
export function capturarCuadro(video: HTMLVideoElement): Promise<File | null> {
  if (!video.videoWidth || !video.videoHeight) return Promise.resolve(null);
  return dibujarComoJpeg(video, video.videoWidth, video.videoHeight);
}
