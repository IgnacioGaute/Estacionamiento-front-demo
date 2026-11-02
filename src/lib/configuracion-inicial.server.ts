import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getOperationalContext } from '@/actions/tenancy/context.action';
import { CONFIGURACION_INICIAL_ROUTE, RUTAS_DURANTE_CONFIGURACION } from '@/routes';

// Un solo pedido del contexto por render: lo leen (protected)/layout y los layouts de cada sección.
export const contextoOperativo = cache(getOperationalContext);

/**
 * Lleva al administrador de una playa nueva a su configuración inicial antes de entrar. Se llama
 * desde los layouts de las secciones ((user) y admin) y no desde (protected)/layout: ese layout lo
 * comparte la configuración misma, y un redirect ahí durante una navegación del cliente dejaba la
 * página siguiente sin contenido. El operador y el super admin entran igual.
 */
export async function llevarAConfiguracionInicial() {
  const session = await auth();
  if (session?.user.role !== 'ADMIN') return;
  const contexto = await contextoOperativo().catch(() => null);
  if (!contexto || contexto.role !== 'ADMIN') return;
  const elegida = (await cookies()).get('parking-playa')?.value;
  // Misma elección que (protected)/layout: la playa del selector o la única de la empresa.
  const playa = contexto.playas.find((p) => elegida === `${session.user.id}:${p.id}`) ?? (contexto.playas.length === 1 ? contexto.playas[0] : undefined);
  if (!playa?.configuracionPendiente) return;
  const ruta = (await headers()).get('x-ruta') ?? '';
  if (RUTAS_DURANTE_CONFIGURACION.some((libre) => ruta === libre || ruta.startsWith(libre + '/'))) return;
  redirect(CONFIGURACION_INICIAL_ROUTE);
}
