import type { ParkingReceiptSnapshot } from '@/types/parking-receipt.type';

function dateTime(day: string | null, time: string | null) {
  return day ? `${day.split('-').reverse().join('/')} ${time?.slice(0, 5) ?? ''}` : '—';
}
export function ParkingReceiptView({ receipt }: { receipt: ParkingReceiptSnapshot }) {
  return <article className="space-y-4 break-words">
    <header className="text-center"><h1 className="text-xl font-bold">{receipt.parkingName}</h1>{receipt.address && <p className="text-sm">{receipt.address}</p>}
      <h2 className="mt-3 font-semibold">Comprobante de {receipt.kind === 'ENTRY' ? 'entrada' : 'salida'}</h2></header>
    <dl className="space-y-2 text-sm">
      <div><dt>Vehículo / ticket</dt><dd className="text-xl font-bold">{receipt.plate}</dd></div>
      {receipt.vehicleType && <div><dt>Tipo</dt><dd>{receipt.vehicleType}</dd></div>}
      <div><dt>Entrada</dt><dd>{dateTime(receipt.entryDay, receipt.entryTime)}</dd></div>
      {receipt.kind === 'EXIT' && <><div><dt>Salida</dt><dd>{dateTime(receipt.departureDay, receipt.departureTime)}</dd></div>
        <div className="border-t pt-3"><dt>Tarifa de la estadía</dt><dd>{new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(receipt.total ?? 0)}</dd></div>
        <div><dt>Total cobrado (incluye anticipos)</dt><dd className="text-xl font-bold">{new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(receipt.collected ?? 0)}</dd></div></>}
    </dl>
    <p className="border-t pt-3 text-center text-xs">Conservá este comprobante. No válido como factura.</p>
  </article>;
}
