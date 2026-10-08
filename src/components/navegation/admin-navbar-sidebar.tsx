'use client';

import {
  Banknote,
  BookUser,
  Gauge,
  ReceiptText,
  SlidersHorizontal,
  Tags,
  UsersRound,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { NavAprender, NavMain, NavVolver, PANEL_FLOTANTE, PANEL_MOVIL, PestaniaLateral } from './nav-main';
import { useSession } from 'next-auth/react';
import { SuperAdminSidebar } from './super-admin-sidebar';

export function AdminNavbarSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession();
  const role = session?.user?.role?.toUpperCase() ?? 'USER';
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isAdmin = role === 'ADMIN' || isSuperAdmin;

  // El super admin administra la plataforma, no opera un estacionamiento: tiene su propia barra
  // con métricas, empresas y el acceso rápido. El acceso a los datos de cada playa existe en el
  // backend, pero no se muestra acá para no mezclar los dos trabajos.
  if (isSuperAdmin) return <SuperAdminSidebar {...props} />;

  const navItems = isAdmin
    ? [
        { title: 'Panel', url: '/admin/dashboard', icon: <Gauge /> },
        { title: 'Usuarios', url: '/admin/users', icon: <UsersRound /> },
        { title: 'Tarifas', url: '/admin/tarifas', icon: <Tags /> },
        { title: 'Frecuentes', url: '/admin/frecuentes', icon: <BookUser /> },
        { title: 'Caja', url: '/admin/caja', icon: <Banknote /> },
        { title: 'Configuración', url: '/admin/configuracion', icon: <SlidersHorizontal /> },
        { title: 'Mi plan', url: '/admin/plan', icon: <ReceiptText /> },
      ]
    : [];

  return (
    <Sidebar variant="floating" collapsible="icon" className={PANEL_FLOTANTE} mobileSide="top" mobileClassName={PANEL_MOVIL} {...props}>
      <PestaniaLateral />
      <SidebarHeader className="h-12 shrink-0 flex-row items-center px-4 pb-0 pt-1">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground group-data-[collapsible=icon]:hidden">
          Administración
        </span>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-1">
        <NavVolver />
        <NavMain items={navItems} />
      </SidebarContent>

      <SidebarFooter className="border-t border-white/[0.06] p-2">
        <NavAprender />
      </SidebarFooter>
    </Sidebar>
  );
}
