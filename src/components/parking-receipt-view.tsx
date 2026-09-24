import type { ParkingReceiptSnapshot } from '@/types/parking-receipt.type';

// Pesos enteros en la operación, pero si alguna tarifa tuviera decimales no se ocultan.
const money = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function dateTime(day: string | null, time: string | null) {
  if (!day) return '—';
  return `${day.split('-').reverse().join('/')} · ${time?.slice(0, 5) ?? ''}`.trim();
}

// La diferencia entre dos marcas locales no depende de la zona del servidor, así que el mismo
// cálculo vale en el render del servidor y en el del navegador.
function stayLength(receipt: ParkingReceiptSnapshot) {
  if (!receipt.entryDay || !receipt.entryTime || !receipt.departureDay || !receipt.departureTime) return null;
  const from = new Date(`${receipt.entryDay}T${receipt.entryTime}`).getTime();
  const to = new Date(`${receipt.departureDay}T${receipt.departureTime}`).getTime();
  const minutes = Math.round((to - from) / 60000);
  if (!Number.isFinite(minutes) || minutes < 0) return null;
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-neutral-200 py-2 last:border-b-0">
      <dt className="shrink-0 text-xs text-neutral-500">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

export function ParkingReceiptView({ receipt }: { receipt: ParkingReceiptSnapshot }) {
  const exit = receipt.kind === 'EXIT';
  const stay = stayLength(receipt);

  return (
    <article className="receipt break-words text-black">
      <header className="text-center">
        <span className="receipt-badge inline-block rounded-full border border-black px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">
          {exit ? 'Salida' : 'Entrada'}
        </span>
        <h1 className="receipt-title mt-3 text-[22px] font-extrabold leading-tight tracking-tight">
          {receipt.parkingName}
        </h1>
        {receipt.address && <p className="mt-1 text-xs text-neutral-600">{receipt.address}</p>}
      </header>

      <div className="my-5 border-t border-dashed border-neutral-300" />

      <section className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Vehículo / ticket</p>
        <p className="receipt-plate mt-2 rounded-md border-2 border-black px-3 py-2 font-mono text-2xl font-bold tracking-[0.12em]">
          {receipt.plate}
        </p>
        {receipt.vehicleType && (
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-600">
            {receipt.vehicleType}
          </p>
        )}
      </section>

      <dl className="mt-5">
        <Row label="Entrada" value={dateTime(receipt.entryDay, receipt.entryTime)} />
        {exit && <Row label="Salida" value={dateTime(receipt.departureDay, receipt.departureTime)} />}
        {exit && stay && <Row label="Permanencia" value={stay} />}
      </dl>

      {exit && (
        <section className="receipt-amounts mt-5 rounded-lg border border-neutral-300 px-4 py-3">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-xs text-neutral-500">Tarifa de la estadía</span>
            <span className="text-sm font-semibold tabular-nums">{money.format(receipt.total ?? 0)}</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-neutral-300 pt-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em]">Total cobrado</span>
            <span className="receipt-total text-xl font-extrabold tabular-nums">
              {money.format(receipt.collected ?? 0)}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-neutral-500">Incluye anticipos y ajustes.</p>
        </section>
      )}

      <div className="my-5 border-t border-dashed border-neutral-300" />

      <footer className="text-center text-[11px] leading-relaxed text-neutral-600">
        <p className="font-semibold text-black">Conservá este comprobante.</p>
        <p>No válido como factura.</p>
      </footer>
    </article>
  );
}
