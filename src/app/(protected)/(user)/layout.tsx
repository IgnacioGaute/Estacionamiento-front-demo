import { AppNavbar } from "@/components/navegation/app-navbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cookies } from "next/headers";
import { NotificationSidebar } from "./components/notifications-sidebar";
import { llevarAConfiguracionInicial } from "@/lib/configuracion-inicial.server";


export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await llevarAConfiguracionInicial();
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true";

  return (
          <SidebarProvider defaultOpen={defaultOpen}>
            <AppNavbar>
              <div className="flex flex-col flex-1 overflow-y-auto">
                <main className="container mx-auto px-6 py-6">{children}</main>
              </div>
            </AppNavbar>
          </SidebarProvider>
  );
}
