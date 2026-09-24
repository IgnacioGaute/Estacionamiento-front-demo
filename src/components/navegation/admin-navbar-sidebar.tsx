'use client';

import {
  ArrowLeft,
  Banknote,
  Building2,
  LayoutDashboard,
  ParkingCircle,
  Repeat,
  Shield,
  Ticket,
  User,
  Wallet,
  Settings,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
  SidebarRail,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { NavMain } from './nav-main';
import { SidebarWatermark } from './sidebar-watermark';
import { useSession } from 'next-auth/react';
import { useTenant } from '@/components/tenant-provider';

export function AdminNavbarSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession();
  const { shiftsEnabled } = useTenant();
  const role = session?.user?.role?.toUpperCase() ?? 'USER';
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isAdmin = role === 'ADMIN' || isSuperAdmin;

  // El super admin administra la plataforma, no opera un estacionamiento: ve únicamente
  // Empresas. El acceso a los datos de cada playa existe en el backend, pero por ahora no se
  // muestra acá para no mezclar los dos trabajos.
  const superAdminNavItems = [
    { title: 'Empresas', url: '/admin/empresas', icon: <Building2 /> },
    { title: 'Métricas', url: '/admin/metricas', icon: <LayoutDashboard /> },
  ];

  const allNavItems = [
    { title: 'Dashboard',               url: '/admin/dashboard',              icon: <LayoutDashboard /> },
    { title: 'Usuarios',                url: '/admin/users',                  icon: <User /> },
    { title: 'Tickets / Precios',       url: '/admin/tickets',                icon: <Ticket /> },
    { title: 'Frecuentes',              url: '/admin/frecuentes',             icon: <Repeat /> },
    // { title: 'Tipo de Estacionamiento', url: '/admin/parking-type',           icon: <ParkingCircle /> },
    // Ojo con el orden: los no-admin reciben allNavItems.slice(-2), así que sólo pueden quedar
    // «Varios» y «Volver» al final. Caja y turnos muestra el arqueo de cada operador.
    { title: 'Historial de turnos',     url: '/admin/caja',                   icon: <Wallet /> },
    { title: 'Varios',                  url: '/admin/other-payments',         icon: <Banknote /> },
    { title: 'Configuración', url: '/admin/configuracion', icon: <Settings /> },
    { title: 'Volver',                  url: '/tickets',                       icon: <ArrowLeft /> },
  ];

  const navItems = (isSuperAdmin ? superAdminNavItems : isAdmin ? allNavItems : allNavItems.slice(-1)).filter(item => shiftsEnabled || item.url !== '/admin/caja');

  return (
    <Sidebar
      collapsible="icon"
      className="group/sidebar border-r border-border bg-gm-surface"
      {...props}
    >
      {/* Stripe that continues from the topbar */}
      <div className="gm-stripes h-[3px] w-full shrink-0" aria-hidden />

      <SidebarHeader className="h-[75px] shrink-0 border-b border-border bg-gm-surface flex items-center justify-center px-2">
        <SidebarTrigger className="h-8 w-8 rounded-md hover:bg-gm-surface-2 hover:text-foreground" />
      </SidebarHeader>

      <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground group-data-[collapsible=icon]:hidden">
        Administración
      </div>

      <SidebarContent className="relative overflow-hidden bg-gm-surface px-1 py-1">
        <NavMain items={navItems} />
        <SidebarWatermark />
      </SidebarContent>

      <SidebarFooter className="border-t border-border bg-gm-surface p-2 group-data-[collapsible=icon]:p-1.5">
        <div className="group-data-[collapsible=icon]:hidden rounded-md bg-gm-surface-2 border border-border px-3 py-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Modo
          </div>
          <div className="gm-display mt-0.5 text-[12px] font-bold text-gm-yellow">
            {isSuperAdmin ? 'Super administrador' : 'Administrador'}
          </div>
        </div>
        <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center py-0.5">
          <Shield className="size-4 text-gm-yellow" />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
