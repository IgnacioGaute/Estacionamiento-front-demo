'use client';

import {
  ArrowLeft,
  Banknote,
  Wrench,
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

export const userNavItems = [
  { title: 'Registrar Gastos', url: '/admin/other-payments', icon: <Banknote /> },
  { title: 'Volver',           url: '/tickets',              icon: <ArrowLeft /> },
];

export function UserNavbarSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="icon"
      className="group/sidebar border-r border-border bg-gm-surface"
      {...props}
    >
      <div className="gm-stripes h-[3px] w-full shrink-0" aria-hidden />

      <SidebarHeader className="h-16 border-b border-border bg-gm-surface flex items-center justify-center px-2">
        <SidebarTrigger className="h-8 w-8 rounded-md hover:bg-gm-surface-2 hover:text-foreground" />
      </SidebarHeader>

      <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground group-data-[collapsible=icon]:hidden">
        Operación
      </div>

      <SidebarContent className="relative overflow-hidden bg-gm-surface px-1 py-1">
        <NavMain items={userNavItems} />
        <SidebarWatermark />
      </SidebarContent>

      <SidebarFooter className="border-t border-border bg-gm-surface p-2 group-data-[collapsible=icon]:p-1.5">
        <div className="group-data-[collapsible=icon]:hidden rounded-md bg-gm-surface-2 border border-border px-3 py-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Turno
          </div>
          <div className="gm-display mt-0.5 text-[12px] font-bold text-gm-yellow">
            Operador
          </div>
        </div>
        <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center py-0.5">
          <Wrench className="size-4 text-gm-yellow" />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
