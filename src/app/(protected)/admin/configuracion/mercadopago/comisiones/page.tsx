import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { currentUser } from '@/lib/auth';
import { getComisionesCajaAction } from '@/actions/box-lists/comisiones.action';
import { ComisionesCajaForm } from '@/components/comisiones-caja-form';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function ComisionesPage() {
  if ((await currentUser())?.role !== 'ADMIN') redirect('/tickets');
  const result = await getComisionesCajaAction();
  if (result.datos && !result.datos.conectada) redirect('/admin/configuracion/mercadopago');
  return <div className="mx-auto max-w-3xl space-y-7 px-4 py-7 sm:px-6">
    <Link href="/admin/configuracion/mercadopago" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Mercado Pago</Link>
    <header><h1 className="text-xl font-semibold tracking-tight">Comisiones</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Ajustá el neto estimado de caja para los cobros que llegan a tu cuenta de Mercado Pago.</p></header>
    {result.datos ? <ComisionesCajaForm inicial={result.datos.tasas} referencia={result.datos.referencia} /> : <p role="alert" className="text-sm text-destructive">{result.error ?? 'No se pudo cargar la configuración. Volvé a intentar.'}</p>}
  </div>;
}
