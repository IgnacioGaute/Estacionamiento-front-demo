'use server';
import { getTariffPlanAction } from '@/actions/tickets/tariff-plan.action';
import { getVehicleTypesAction } from '@/actions/tickets/vehicle-types.action';
import { avanzarConfiguracion, guardarPlayaConfiguracion } from '@/services/configuracion-inicial.service';
import type { AvanceConfiguracion, EstadoConfiguracionInicial, PasoConfiguracion } from '@/types/configuracion-inicial.type';

type Resultado = { estado?: EstadoConfiguracionInicial; error?: string };

const intentar = async (fn: () => Promise<EstadoConfiguracionInicial>): Promise<Resultado> => {
  try {
    return { estado: await fn() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo guardar. Revisá la conexión e intentá de nuevo.' };
  }
};

export async function guardarPlayaConfiguracionAction(datos: { nombre?: string; direccion?: string }, paso?: PasoConfiguracion) {
  const guardado = await intentar(() => guardarPlayaConfiguracion(datos));
  // Dónde sigue el recorrido va aparte: el nombre y la dirección quedan guardados aunque eso falle.
  if (guardado.estado && paso) return intentar(() => avanzarConfiguracion({ paso }));
  return guardado;
}

export async function avanzarConfiguracionAction(cambio: AvanceConfiguracion) {
  return intentar(() => avanzarConfiguracion(cambio));
}

// Lo mínimo para empezar a trabajar en cada paso obligatorio. Los datos ya los guardó cada pantalla;
// acá solo se confirma que alcanzan antes de seguir.
export async function comprobarPasoAction(paso: PasoConfiguracion): Promise<{ error?: string }> {
  if (paso === 'vehiculos') {
    const tipos = await getVehicleTypesAction().catch(() => null);
    if (!tipos) return { error: 'No se pudieron consultar los vehículos. Intentá de nuevo.' };
    return tipos.some((tipo) => tipo.enabled) ? {} : { error: 'Activá al menos un tipo de vehículo para seguir.' };
  }
  if (paso === 'tarifas') {
    const { plan, error } = await getTariffPlanAction();
    if (error || !plan) return { error: error ?? 'No se pudieron consultar las tarifas.' };
    const conPrecios = plan.schedule.pricingOptions.charging.enabled ? plan.schedule.pricingOptions.charging.rates.length > 0 : plan.brackets.length > 0;
    return conPrecios ? {} : { error: 'Aplicá tus tarifas para seguir: sin precios no se puede cobrar.' };
  }
  return {};
}
