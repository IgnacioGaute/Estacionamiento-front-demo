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

  const escala = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * escala);
  canvas.height = Math.round(img.naturalHeight * escala);
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  for (const calidad of [0.85, 0.7]) {
    const blob = await aJpeg(canvas, calidad);
    if (blob && blob.size <= LIMITE_BYTES) {
      return new File([blob], 'patente.jpg', { type: 'image/jpeg' });
    }
  }
  return file;
}
