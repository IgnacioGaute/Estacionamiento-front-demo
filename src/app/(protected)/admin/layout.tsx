import { AdminNavbarSidebar } from "@/components/navegation/admin-navbar-sidebar";
import { AppNavbar } from "@/components/navegation/app-navbar";
import { UserNavbarSidebar } from "@/components/navegation/user-navbar-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cookies } from "next/headers";


export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppNavbar adminSidebar={<AdminNavbarSidebar/>} userSidebar={<UserNavbarSidebar/>}>
      <div className="flex flex-col flex-1 h-full">
          {/* Cada página admin ya trae su propio "container mx-auto px-4 ..." — sin padding acá
              para no duplicarlo (en mobile sumaba ~80px de aire perdido a cada lado). */}
          <main className="flex-1">{children}</main>
        </div>
      </AppNavbar>
    </SidebarProvider>
  );
}
