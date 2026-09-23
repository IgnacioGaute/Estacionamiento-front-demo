import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import type { ParkingReceiptSnapshot } from '@/types/parking-receipt.type';
import { ParkingReceiptView } from '@/components/parking-receipt-view';
import { ReceiptPrint } from './receipt-print';
import { ReceiptDownloads } from './receipt-downloads';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Comprobante de estacionamiento', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 5, userScalable: true };

export default async function PublicReceiptPage({ params, searchParams }: {
  params: Promise<{ token: string }>; searchParams: Promise<{ print?: string }>;
}) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) notFound();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/public/parking-receipts/${token}`, { cache: 'no-store' });
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error('No se pudo cargar el comprobante. Intentá nuevamente.');
  const receipt: ParkingReceiptSnapshot = await response.json();
  const { print } = await searchParams;
  const width = print === '58' ? 58 : 80;
  return <main id="public-receipt" className="mx-auto my-8 max-w-sm rounded-lg bg-white p-5 text-black">
    <ParkingReceiptView receipt={receipt} />
    <ReceiptDownloads receipt={receipt} />
    <ReceiptPrint width={width} autoPrint={print === '58' || print === '80'} />
  </main>;
}
