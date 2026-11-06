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
import { AsistenteConfiguracion } from './asistente';
import { EquipoConfiguracion } from './equipo';
import { PasesConfiguracion } from './pases';

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
    return <main className="grid min-h-[100dvh] place-items-center bg-gm-hondo p-6">{aviso(error instanceof Error ? error.message : 'No se pudo cargar la configuración de la playa.')}</main>;
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
  const plan = tarifa.plan;
  const conPrecios = !!plan && (plan.schedule.pricingOptions.charging.enabled ? plan.schedule.pricingOptions.charging.rates.length : plan.brackets.length) > 0;

  return (
    <AsistenteConfiguracion
      estado={estado}
      listos={{
        tarifas: conPrecios,
        pases: precioPases.length > 0,
        mercadopago: !!mercadoPago.estado?.conectada,
        // Alguien más además del administrador que la está configurando.
        usuarios: equipo.length > 1,
      }}
      contenido={{
        vehiculos: <VehicleTypesCard enConfiguracionInicial />,
        // TariffsBody lee la URL (useSearchParams): necesita su límite de Suspense.
        tarifas: <Suspense fallback={<DataLoading label="Cargando tarifas…" />}><TariffsBody initialPlan={plan ?? null} loadError={tarifa.error} passPrices={precioPases} enConfiguracionInicial /></Suspense>,
        pases: <PasesConfiguracion precios={precioPases} />,
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
          <EquipoConfiguracion
            yoId={user.id}
            miembros={equipo.map((u) => ({ id: u.id, nombre: `${u.firstName} ${u.lastName}`.trim() || u.username, usuario: u.username, administrador: u.role === 'ADMIN' }))}
          />
        ),
      }}
    />
  );
}
