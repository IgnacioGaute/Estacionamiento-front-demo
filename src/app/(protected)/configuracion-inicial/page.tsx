export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { DataLoading } from '@/components/ui/data-loading';
import { getConfiguracionInicial } from '@/services/configuracion-inicial.service';
import { getTicketSchedule, getTicketsPrice } from '@/services/tickets.service';
import { getUsers } from '@/services/users.service';
import { getTariffPlanAction } from '@/actions/tickets/tariff-plan.action';
import { getCajasQrAction, getEstadoMercadoPagoAction } from '@/actions/mercadopago/mercadopago.action';
import { configuracionAliasAction } from '@/actions/mercadopago/verificacion-alias.action';
import { getComisionesCajaAction } from '@/actions/box-lists/comisiones.action';
import { VehicleTypesCard } from '../admin/tickets/components/vehicle-types-card';
import { TariffsBody } from '../admin/tarifas/tariffs-body';
import { OperationSettings } from '../admin/configuracion/operation-settings';
import { ConexionMercadoPago } from '../admin/configuracion/mercadopago/conexion-mercadopago';
import { CreateUserDialog } from '../admin/users/components/create-user-dialog';
import { AsistenteConfiguracion } from './asistente';

const aviso = (texto: string) => <p role="alert" className="rounded-2xl border border-destructive p-5 text-sm">{texto}</p>;

// Los pasos de una playa nueva. Cada paso usa la misma pantalla que después se encuentra en
// Configuración, así lo que se carga acá se guarda por el camino de siempre (y queda en el historial).
export default async function ConfiguracionInicialPage() {
  const user = await currentUser();
  if (user?.role !== 'ADMIN') redirect('/tickets');
  let estado;
  try {
    estado = await getConfiguracionInicial();
  } catch (error) {
    return <main className="grid min-h-[100dvh] place-items-center bg-[#100f0d] p-6">{aviso(error instanceof Error ? error.message : 'No se pudo cargar la configuración de la playa.')}</main>;
  }
  if (estado.configuracion.terminadaEn) redirect('/tickets');

  const [schedule, tarifa, pases, usuarios, mercadoPago, verificacion, comisiones, qr] = await Promise.all([
    getTicketSchedule(),
    getTariffPlanAction(),
    getTicketsPrice(),
    getUsers(),
    getEstadoMercadoPagoAction(),
    configuracionAliasAction(),
    getComisionesCajaAction(),
    getCajasQrAction(),
  ]);
  const precioPases = (pases?.data || []).filter((precio) => ['DIA', 'SEMANA', 'MES'].includes(precio.ticketTimeType ?? ''));
  const equipo = (usuarios?.data ?? []).filter((u) => u.role !== 'SUPER_ADMIN');

  return (
    <AsistenteConfiguracion
      estado={estado}
      contenido={{
        vehiculos: <VehicleTypesCard />,
        // TariffsBody lee la URL (useSearchParams): necesita su límite de Suspense.
        tarifas: <Suspense fallback={<DataLoading label="Cargando tarifas…" />}><TariffsBody initialPlan={tarifa.plan ?? null} loadError={tarifa.error} passPrices={precioPases} /></Suspense>,
        turnos: schedule
          ? <OperationSettings sueldoAutomatico={schedule.sueldoAutomatico} sueldosPorUsuario={schedule.sueldosPorUsuario} shiftsEnabled={schedule.shiftsEnabled ?? false} multipleShiftsEnabled={schedule.multipleShiftsEnabled ?? false} enConfiguracionInicial />
          : aviso('No se pudo cargar la configuración de turnos. Podés omitir este paso y hacerlo después.'),
        mercadopago: mercadoPago.error || !mercadoPago.estado
          ? aviso(mercadoPago.error ?? 'No se pudo consultar la cuenta de MercadoPago. Podés omitir este paso y hacerlo después.')
          : (
            // useSearchParams necesita un límite de Suspense.
            <Suspense fallback={<DataLoading label="Cargando MercadoPago…" />}>
              <ConexionMercadoPago inicial={mercadoPago.estado} verificacionAlias={verificacion.datos ?? null} comisiones={comisiones.datos?.conectada ? comisiones.datos : null} cajasQr={qr.cajas ?? null} enConfiguracionInicial />
            </Suspense>
          ),
        usuarios: (
          <div className="space-y-4 rounded-2xl border border-gm-line bg-gm-surface p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Cuentas de la empresa</h2>
              <CreateUserDialog />
            </div>
            <ul className="divide-y divide-gm-line">
              {equipo.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0 truncate"><span className="font-semibold">{u.firstName} {u.lastName}</span> <span className="text-muted-foreground">· {u.username}</span></span>
                  <span className="shrink-0 rounded-full border border-gm-line-strong px-2.5 py-0.5 text-xs text-muted-foreground">{u.role === 'ADMIN' ? 'Administrador' : 'Operador'}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">Los operadores registran entradas y cobran; el administrador además configura. Las cuentas nuevas quedan en esta playa.</p>
          </div>
        ),
      }}
    />
  );
}
