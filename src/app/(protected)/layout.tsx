import { auth } from "@/auth";
import { getTicketSchedule } from '@/services/tickets.service';
import { SessionProvider } from "next-auth/react";
import { cookies } from "next/headers";
import { redirect } from 'next/navigation';
import { randomUUID } from 'crypto';
import { contextoOperativo } from '@/lib/configuracion-inicial.server';
import { ACCESS_SELECTION_ROUTE, PLATFORM_SELECTION, selectedAccess } from '@/lib/access-scope';
import { FalloBackend } from '@/lib/fallos-backend';
import type { OperationalContext } from "@/actions/tenancy/context.action";
import { TenantProvider, NoPlaya } from "@/components/tenant-provider";
import { EstadoDeAcceso, type MotivoEstadoDeAcceso } from '@/components/estado-de-acceso';
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id || !session.token) return null;
  // La cuenta no se pudo volver a validar (red, 429, 5xx): la sesión sigue, la aplicación no.
  if (session.validacionPendiente)
    return <EstadoDeAcceso motivo="sesion-pendiente" intento={randomUUID()} />;
  let context: OperationalContext = { empresa: null, playas: [] };
  let fallo: { motivo: MotivoEstadoDeAcceso; mensaje?: string; reintentarEnMs: number | null } | null = null;
  const selected = (await cookies()).get("parking-playa")?.value;
  const superAdmin = session.user.role === 'SUPER_ADMIN';
  const platform = superAdmin && selectedAccess(selected, session.user.id) === PLATFORM_SELECTION;
  if (!platform) {
    try {
      context = await contextoOperativo();
    } catch (e) {
      // Una consulta fallida no es «sin asignación»: se dice qué pasó y se ofrece reintentar.
      const categoria = e instanceof FalloBackend ? e.categoria : 'transporte';
      fallo = {
        // 401: la cuenta ya no vale. 403: sin empresa activa. El resto (red, 429, 5xx, respuesta
        // inválida o un error inesperado) se trata como temporal y se reintenta.
        motivo: categoria === 'autenticacion' ? 'sesion-invalida' : categoria === 'permiso' ? 'sin-empresa' : 'contexto-no-disponible',
        mensaje: categoria === 'permiso' && e instanceof Error ? e.message : undefined,
        reintentarEnMs: e instanceof FalloBackend ? e.reintentarEnMs : null,
      };
    }
  }
  if (fallo) return <EstadoDeAcceso motivo={fallo.motivo} mensaje={fallo.mensaje} reintentarEnMs={fallo.reintentarEnMs} intento={randomUUID()} />;
  const operator = context.role === "USER";
  const chosen = operator
    ? context.playas.length === 1
      ? context.playas[0].id
      : ""
    : context.playas.find((p) => selected === `${session.user.id}:${p.id}`)
        ?.id || (!superAdmin && context.playas.length === 1 ? context.playas[0].id : "");
  if (superAdmin && !platform && !chosen) redirect(ACCESS_SELECTION_ROUTE);
  const schedule = !platform && chosen ? await getTicketSchedule() : null;
  return (
    <SessionProvider session={session}>
      <TenantProvider context={context} playaId={chosen} shiftsEnabled={schedule?.shiftsEnabled === true}>
        {/* clip recorta el desborde horizontal sin crear un contenedor de scroll que anule el topbar sticky. */}
        <div className="flex w-full flex-col overflow-x-clip">
          {platform || chosen ? children : <NoPlaya />}
        </div>
      </TenantProvider>
    </SessionProvider>
  );
}
