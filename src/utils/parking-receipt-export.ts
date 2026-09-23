import type { ParkingReceiptSnapshot } from '@/types/parking-receipt.type';

// Dibuja solo los datos públicos del comprobante, sin capturar botones ni la página.
export async function receiptImage(receipt: ParkingReceiptSnapshot): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo generar la imagen.');
  const width = 720, margin = 48;
  const lines: { text: string; size: number; bold: boolean; y: number }[] = [];
  let y = 52;
  function add(text: string, size = 26, bold = false) {
    ctx!.font = `${bold ? 'bold ' : ''}${size}px Arial`;
    let line = '';
    // Corte por carácter para tolerar también nombres o patentes sin espacios.
    for (const char of text) {
      if (line && ctx!.measureText(line + char).width > width - margin * 2) {
        lines.push({ text: line, size, bold, y }); y += size * 1.4; line = '';
      }
      line += char;
    }
    lines.push({ text: line, size, bold, y }); y += size * 1.4;
  }
  function field(label: string, value: string, bold = false) {
    y += 18; add(label, 22); add(value, bold ? 32 : 26, bold);
  }
  const time = (day: string | null, hour: string | null) => day ? `${day.split('-').reverse().join('/')} ${hour?.slice(0, 5) ?? ''}` : '—';
  const money = (amount: number | null) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount ?? 0);
  add(receipt.parkingName, 34, true);
  if (receipt.address) add(receipt.address, 24);
  y += 22;
  add(`Comprobante de ${receipt.kind === 'ENTRY' ? 'entrada' : 'salida'}`, 28, true);
  field('Vehículo / ticket', receipt.plate, true);
  if (receipt.vehicleType) field('Tipo', receipt.vehicleType);
  field('Entrada', time(receipt.entryDay, receipt.entryTime));
  if (receipt.kind === 'EXIT') {
    field('Salida', time(receipt.departureDay, receipt.departureTime));
    field('Tarifa de la estadía', money(receipt.total));
    field('Total cobrado (incluye anticipos)', money(receipt.collected), true);
  }
  y += 30;
  add('Conservá este comprobante.', 22);
  add('No válido como factura.', 22);
  canvas.width = width; canvas.height = Math.ceil(y + margin);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, canvas.height);
  ctx.fillStyle = '#111111'; ctx.textBaseline = 'top';
  for (const line of lines) {
    ctx.font = `${line.bold ? 'bold ' : ''}${line.size}px Arial`;
    ctx.fillText(line.text, margin, line.y);
  }
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen.')), 'image/png'));
}

export async function receiptPdf(png: Blob): Promise<Blob> {
  const { PDFDocument } = await import('pdf-lib');
  const document = await PDFDocument.create();
  const image = await document.embedPng(await png.arrayBuffer());
  const width = 288;
  const height = image.height * width / image.width;
  const page = document.addPage([width, height]);
  page.drawImage(image, { x: 0, y: 0, width, height });
  return new Blob([new Uint8Array(await document.save())], { type: 'application/pdf' });
}

export function receiptFileName(receipt: ParkingReceiptSnapshot) {
  const plate = receipt.plate.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30) || 'vehiculo';
  return `comprobante-${receipt.kind === 'ENTRY' ? 'entrada' : 'salida'}-${plate}-${receipt.entryDay ?? 'estadia'}`;
}
