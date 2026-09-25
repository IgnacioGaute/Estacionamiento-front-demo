export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { currentUser } from '@/lib/auth';
import { PageHeader } from '@/components/page-header';
import { getEstadoMercadoPagoAction } from '@/actions/mercadopago/mercadopago.action';
import { ConexionMercadoPago } from './conexion-mercadopago';

// Esta ruta es además la URL de retorno registrada en MercadoPago, así que tiene que existir con
// esta dirección exacta: cambiarla obliga a cambiarla también en el panel de la aplicación.
export default async function MercadoPagoPage() {
  const user = await currentUser();
  // La cuenta de cobro es de una empresa. El SUPER_ADMIN no tiene una, y el operador no decide
  // adónde va la plata.
  if (user?.role !== 'ADMIN') redirect('/tickets');

  const { estado, error } = await getEstadoMercadoPagoAction();

  return (
    <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
      <Link
        href="/admin/configuracion"
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold transition-colors hover:bg-secondary/40"
      >
        <ArrowLeft className="size-4" />
        Configuración
      </Link>

      <PageHeader
        title="Cobro con MercadoPago"
        breadcrumb={['Administración', 'Configuración', 'MercadoPago']}
        description="La cuenta donde entra el dinero de los cobros con QR. Es una por empresa: vale para todas sus playas."
      />

      {error || !estado ? (
        <p role="alert" className="rounded-2xl border border-destructive p-6 text-sm">
          {error ?? 'No se pudo consultar la cuenta de MercadoPago.'}
        </p>
      ) : (
        // useSearchParams necesita un limite de Suspense para no forzar el renderizado dinamico
        // de toda la pagina.
        <Suspense
          fallback={
            <div role="status" className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
              Cargando…
            </div>
          }
        >
          <ConexionMercadoPago inicial={estado} />
        </Suspense>
      )}
    </div>
  );
}
