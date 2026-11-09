import { MercadoPagoCargando } from './cargando';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { CONFIGURACION_INICIAL_ROUTE } from '@/routes';
import { getConfiguracionInicial } from '@/services/configuracion-inicial.service';
import { currentUser } from '@/lib/auth';
import { EncabezadoSeccion } from '@/components/encabezado-seccion';
import { getCajasQrAction, getEstadoMercadoPagoAction } from '@/actions/mercadopago/mercadopago.action';
import { configuracionAliasAction } from '@/actions/mercadopago/verificacion-alias.action';
import { getComisionesCajaAction } from '@/actions/box-lists/comisiones.action';
import { ConexionMercadoPago } from './conexion-mercadopago';

// Esta ruta es además la URL de retorno registrada en MercadoPago, así que tiene que existir con
// esta dirección exacta: cambiarla obliga a cambiarla también en el panel de la aplicación.
export default async function MercadoPagoPage() {
  const user = await currentUser();
  // La cuenta de cobro es de una empresa. El SUPER_ADMIN no tiene una, y el operador no decide
  // adónde va la plata.
  if (user?.role !== 'ADMIN') redirect('/tickets');

  const [{ estado, error }, verificacion, comisiones, qr, configuracionInicial] = await Promise.all([
    getEstadoMercadoPagoAction(),
    configuracionAliasAction(),
    getComisionesCajaAction(),
    getCajasQrAction(),
    getConfiguracionInicial().catch(() => null),
  ]);
  // MercadoPago vuelve siempre acá después de autorizar la cuenta: si la playa está en su
  // configuración inicial, el administrador sigue desde este aviso.
  const enConfiguracionInicial = !!configuracionInicial && !configuracionInicial.configuracion.terminadaEn;

  return (
    <>
      {enConfiguracionInicial && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gm-yellow/40 bg-gm-yellow/[0.07] p-4">
          <p className="text-sm"><span className="font-semibold">Estás configurando tu playa.</span> Cuando termines con MercadoPago, seguí con los pasos que faltan.</p>
          <Link href={CONFIGURACION_INICIAL_ROUTE} className="inline-flex h-10 items-center gap-2 rounded-lg bg-gm-yellow px-4 text-sm font-semibold text-gm-ink">
            Seguir con la configuración<ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      )}
      <EncabezadoSeccion
        title="Mercado Pago"
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
            <MercadoPagoCargando />
          }
        >
          <ConexionMercadoPago inicial={estado} verificacionAlias={verificacion.datos ?? null} comisiones={comisiones.datos?.conectada ? comisiones.datos : null} cajasQr={qr.cajas ?? null} />
        </Suspense>
      )}
    </>
  );
}
