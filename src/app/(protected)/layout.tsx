import { auth } from "@/auth";
import { SessionProvider } from "next-auth/react";
import { cookies } from "next/headers";
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
  const platform = session.user.role === "SUPER_ADMIN";
  if (!platform) {
    try {
      context = await getOperationalContext();
    } catch (e) {
      error = e instanceof Error ? e.message : "No se pudo cargar tu empresa.";
    }
  }
  const selected = (await cookies()).get("parking-playa")?.value;
  const operator = context.role === "USER";
  const chosen = operator
    ? context.playas.length === 1
      ? context.playas[0].id
      : ""
    : context.playas.find((p) => selected === `${session.user.id}:${p.id}`)
        ?.id || (context.playas.length === 1 ? context.playas[0].id : "");
  return (
    <SessionProvider session={session}>
      <TenantProvider context={context} playaId={chosen}>
        <div className="flex w-full flex-col overflow-hidden">
          {platform || chosen ? children : <NoPlaya message={error} />}
        </div>
      </TenantProvider>
    </SessionProvider>
  );
}
