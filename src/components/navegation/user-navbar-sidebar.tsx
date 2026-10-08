'use client';

import { KeyRound } from 'lucide-react';
import { useTenant } from '@/components/tenant-provider';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { NavAprender, NavMain, NavVolver, PANEL_FLOTANTE, PANEL_MOVIL, PestaniaLateral } from './nav-main';

// La barra lateral del operador en las pantallas de administración: la misma pieza flotante que la
// del administrador, con lo único que puede abrir (Inquilinos, si la playa lo tiene).
export function UserNavbarSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { inquilinosEnabled } = useTenant();
  const items = inquilinosEnabled ? [{ title: 'Inquilinos', url: '/renters', icon: <KeyRound /> }] : [];
  return (
    <Sidebar variant="floating" collapsible="icon" className={PANEL_FLOTANTE} mobileSide="top" mobileClassName={PANEL_MOVIL} {...props}>
      <PestaniaLateral />
      <SidebarHeader className="h-12 shrink-0 flex-row items-center px-4 pb-0 pt-1">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground group-data-[collapsible=icon]:hidden">
          Operación
        </span>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-1">
        <NavVolver />
        {items.length > 0 && <NavMain items={items} />}
      </SidebarContent>

      <SidebarFooter className="border-t border-white/[0.06] p-2">
        <NavAprender />
      </SidebarFooter>
    </Sidebar>
  );
}
