import { auth } from "@/auth";
import { getTicketSchedule } from '@/services/tickets.service';
import { SessionProvider } from "next-auth/react";
import { cookies } from "next/headers";
import { redirect } from 'next/navigation';
import { ACCESS_SELECTION_ROUTE, PLATFORM_SELECTION, selectedAccess } from '@/lib/access-scope';
import {
  getOperationalContext,
  OperationalContext,
} from "@/actions/tenancy/context.action";
import { TenantProvider, NoPlaya } from "@/components/tenant-provider";
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id || !session.token) return null;
  let context: OperationalContext = { empresa: null, playas: [] },
    error = "";
  const selected = (await cookies()).get("parking-playa")?.value;
  const superAdmin = session.user.role === 'SUPER_ADMIN';
  const platform = superAdmin && selectedAccess(selected, session.user.id) === PLATFORM_SELECTION;
  if (!platform) {
    try {
      context = await getOperationalContext();
    } catch (e) {
      error = e instanceof Error ? e.message : "No se pudo cargar tu empresa.";
    }
  }
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
          {platform || chosen ? children : <NoPlaya message={error} />}
        </div>
      </TenantProvider>
    </SessionProvider>
  );
}
