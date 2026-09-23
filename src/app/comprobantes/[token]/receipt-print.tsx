'use client';
import { useEffect, useRef } from 'react';

export function ReceiptPrint({ width, autoPrint = true }: { width: 58 | 80; autoPrint?: boolean }) {
  const started = useRef(false);
  useEffect(() => {
    if (!autoPrint || started.current) return;
    started.current = true;
    document.fonts.ready.then(() => window.print());
  }, [autoPrint]);
  return <>
    <style>{`@media print {
      @page { size: auto; margin: 0; }
      html, body { background: white !important; color: black !important; margin: 0 !important; padding: 0 !important; min-height: 0 !important; }
      body * { visibility: hidden; }
      #public-receipt, #public-receipt * { visibility: visible; }
      #public-receipt { position: absolute; top: 0; left: 0; width: ${width}mm; max-width: ${width}mm; padding: 3mm; margin: 0; border: 0; border-radius: 0; box-sizing: border-box; }
      #public-receipt .receipt-print-controls { display: none; }
    }`}</style>
    <div className="receipt-print-controls mt-5 space-y-2 text-center">
      <button className="rounded bg-black px-4 py-2 text-white" onClick={() => window.print()}>Imprimir comprobante</button>
      <p className="text-xs">Seleccioná tu térmica USB y papel de {width} mm. Desactivá encabezados y pies de página.</p>
    </div>
  </>;
}
