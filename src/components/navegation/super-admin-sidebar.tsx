'use client';

// La barra lateral del super admin. No opera una playa, así que en vez del menú de operación
// lleva las dos pantallas de plataforma y un acceso rápido a las empresas que más mueven: es a
// donde vuelve una y otra vez.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, CreditCard, LayoutDashboard } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { EmpresaConDetalle, PlataformaMetrics } from '@/types/tenancy.type';
import {
  getEmpresasAction,
  getPlataformaMetricsAction,
} from '@/actions/tenancy/tenancy.action';
import { iniciales } from '@/components/plataforma/formato';
import { cn } from '@/lib/utils';
import { CAJITA, CENTRADO, ITEM, NavAprender, PANEL_FLOTANTE, PANEL_MOVIL, PestaniaLateral } from './nav-main';

// La misma barra flotante que la de la empresa (encastra con la de arriba, baja como panel en el
// celular): cambian el contenido y el rótulo, no la forma.
export function SuperAdminSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const [empresas, setEmpresas] = useState<EmpresaConDetalle[]>([]);
  const [metrics, setMetrics] = useState<PlataformaMetrics | null>(null);

  useEffect(() => {
    void getEmpresasAction().then((r) => setEmpresas(r.empresas ?? []));
    void getPlataformaMetricsAction(30).then((r) => setMetrics(r.metrics ?? null));
  }, []);

  const empresaActual = pathname.startsWith('/admin/empresas/')
    ? pathname.split('/')[3]
    : null;

  // Las cinco que más cobraron en 30 días; la que se está mirando va primero aunque no esté.
  const atajos = useMemo(() => {
    const cobrado = new Map<string, number>();
    for (const p of metrics?.playas ?? [])
      cobrado.set(p.empresaId, (cobrado.get(p.empresaId) ?? 0) + p.cobrado);
    const ordenadas = [...empresas].sort(
      (a, b) => (cobrado.get(b.id) ?? 0) - (cobrado.get(a.id) ?? 0),
    );
    const actual = ordenadas.find((e) => e.id === empresaActual);
    return (actual ? [actual, ...ordenadas.filter((e) => e !== actual)] : ordenadas).slice(0, 5);
  }, [empresas, metrics, empresaActual]);

  const cerrarEnMovil = () => {
    if (isMobile) setOpenMobile(false);
  };

  const items = [
    { titulo: 'Métricas', url: '/admin/metricas', Icono: LayoutDashboard, activo: pathname === '/admin/metricas' },
    {
      titulo: 'Empresas',
      url: '/admin/empresas',
      Icono: Building2,
      activo: pathname.startsWith('/admin/empresas'),
      cuenta: empresas.length || undefined,
    },
    {
      titulo: 'Planes y cobros',
      url: '/admin/planes',
      Icono: CreditCard,
      activo: pathname.startsWith('/admin/planes'),
      // Las que vencieron o están suspendidas por falta de pago: lo que hay que cobrar.
      cuenta:
        empresas.filter(
          (e) =>
            e.suscripcion?.estado === 'VENCIDA' ||
            (e.suscripcion?.estado === 'SUSPENDIDA' && e.suscripcion.motivoSuspension === 'FALTA_DE_PAGO'),
        ).length || undefined,
    },
  ];

  return (
    <Sidebar variant="floating" collapsible="icon" className={PANEL_FLOTANTE} mobileSide="top" mobileClassName={PANEL_MOVIL} {...props}>
      <PestaniaLateral />
      <SidebarHeader className="h-12 shrink-0 flex-row items-center px-4 pb-0 pt-1">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground group-data-[collapsible=icon]:hidden">
          Plataforma
        </span>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-1">
        <SidebarGroup>
          <SidebarMenu className={CENTRADO}>
            {items.map(({ titulo, url, Icono, activo, cuenta }) => (
              <SidebarMenuItem key={url}>
                <SidebarMenuButton asChild tooltip={titulo} isActive={activo} className={ITEM}>
                  <Link href={url} onClick={cerrarEnMovil} aria-current={activo ? 'page' : undefined} className="flex w-full items-center gap-3">
                    <span className={CAJITA}>
                      <Icono aria-hidden />
                    </span>
                    <span className="flex-1 truncate">{titulo}</span>
                    {/* Plegada no hay lugar: el número vuelve al desplegarla. */}
                    {cuenta !== undefined && (
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-[7px] py-0.5 font-mono text-[11px] font-semibold group-data-[collapsible=icon]:hidden',
                          activo ? 'bg-gm-ink text-gm-yellow' : 'bg-white/[0.06] text-muted-foreground',
                        )}
                      >
                        {cuenta}
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {atajos.length > 0 && (
          <SidebarGroup className="pt-1 group-data-[collapsible=icon]:hidden">
            <span aria-hidden className="mx-1.5 mb-3 h-px bg-white/[0.07]" />
            <span className="px-2.5 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Acceso rápido
            </span>
            <ul className="flex flex-col gap-1">
              {atajos.map((e) => {
                const actual = e.id === empresaActual;
                return (
                  <li key={e.id}>
                    <Link
                      href={`/admin/empresas/${e.id}`}
                      onClick={cerrarEnMovil}
                      aria-current={actual ? 'page' : undefined}
                      className={cn(
                        'flex h-10 items-center gap-3 rounded-xl px-1.5 text-[13px] transition-colors hover:bg-white/[0.04] hover:text-foreground',
                        actual ? 'bg-white/[0.06] font-semibold text-foreground' : 'text-[#D9D1C3]',
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'grid size-8 shrink-0 place-items-center rounded-[10px] font-display text-[11.5px] font-semibold',
                          actual ? 'bg-gm-yellow text-gm-ink' : 'bg-white/[0.05] text-[#E9E1D4]',
                        )}
                      >
                        {iniciales(e.nombre)}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{e.nombre}</span>
                      <span
                        role="img"
                        aria-label={e.estado === 'ACTIVA' ? 'Activa' : 'Suspendida'}
                        className={cn('mr-2 size-[7px] shrink-0 rounded-full', e.estado === 'ACTIVA' ? 'bg-emerald-400' : 'bg-[#FF7A4D]')}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link
              href="/admin/empresas"
              onClick={cerrarEnMovil}
              className="px-2.5 pt-2 text-[12.5px] font-semibold text-gm-yellow hover:text-[#FFD84D]"
            >
              Ver las {empresas.length} empresas →
            </Link>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-white/[0.06] p-2">
        <NavAprender />
      </SidebarFooter>
    </Sidebar>
  );
}
