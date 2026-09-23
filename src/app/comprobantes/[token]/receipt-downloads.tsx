'use client';

import { useEffect, useState } from 'react';
import type { ParkingReceiptSnapshot } from '@/types/parking-receipt.type';
import { receiptFileName, receiptImage, receiptPdf } from '@/utils/parking-receipt-export';

export function ReceiptDownloads({ receipt }: { receipt: ParkingReceiptSnapshot }) {
  const [image, setImage] = useState<{ file: File; url: string; shareable: boolean } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    receiptImage(receipt).then(blob => {
      if (!active) return;
      const file = new File([blob], `${receiptFileName(receipt)}.png`, { type: 'image/png' });
      objectUrl = URL.createObjectURL(blob);
      let shareable = false;
      try { shareable = !!navigator.canShare?.({ files: [file] }); } catch { /* Descarga disponible como alternativa. */ }
      setImage({ file, url: objectUrl, shareable });
    }).catch(() => { if (active) setError('No se pudo preparar la descarga. Recargá la página para reintentar.'); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [receipt]);
  async function downloadPdf() {
    if (!image) return;
    setBusy(true); setError('');
    try {
      const blob = await receiptPdf(image.file);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `${receiptFileName(receipt)}.pdf`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch { setError('No se pudo generar el PDF. Intentá nuevamente.'); }
    finally { setBusy(false); }
  }
  async function share() {
    if (!image) return;
    try { await navigator.share({ files: [image.file], title: 'Comprobante de estacionamiento' }); }
    catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) { setPreview(true); setError('Podés descargar la imagen o mantenerla presionada para guardarla.'); }
    }
  }
  const button = 'block w-full rounded-lg border border-neutral-300 px-3 py-3 text-center text-sm font-medium disabled:opacity-50';
  return <section className="receipt-print-controls mt-5 space-y-2 border-t border-neutral-300 pt-4" aria-label="Guardar comprobante">
    <button type="button" className={`${button} bg-black text-white`} disabled={!image || busy} onClick={downloadPdf}>{busy ? 'Generando PDF…' : 'Descargar PDF'}</button>
    {image ? <a href={image.url} download={image.file.name} className={button}>Descargar imagen</a> : <button type="button" className={button} disabled>Preparando imagen…</button>}
    {image?.shareable && <button type="button" className={button} onClick={share}>Compartir / guardar imagen</button>}
    {image && <button type="button" className="w-full py-2 text-sm underline" onClick={() => setPreview(value => !value)}>{preview ? 'Ocultar imagen' : 'Ver imagen para guardar'}</button>}
    {preview && image && <div className="space-y-2"><p className="text-xs">Mantené presionada la imagen para ver las opciones de guardado de tu celular.</p>
      {/* Imagen local generada en el navegador; no requiere el optimizador de Next. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.url} alt="Comprobante de estacionamiento para guardar" className="h-auto w-full border border-neutral-200" />
    </div>}
    <p className="text-xs text-neutral-600">Las descargas se guardan en Archivos o Descargas. Para guardarla en Fotos, usá las opciones de compartir o mantené presionada la imagen, según tu celular.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}
