'use client';

// La barra lateral del super admin. No opera una playa, así que en vez del menú de operación
// lleva las dos pantallas de plataforma y un acceso rápido a las empresas que más mueven: es a
// donde vuelve una y otra vez.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Building2, LayoutDashboard } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { ParkingMark } from '@/components/brand/logo';
import { EmpresaConDetalle, PlataformaMetrics } from '@/types/tenancy.type';
import {
  getEmpresasAction,
  getPlataformaMetricsAction,
} from '@/actions/tenancy/tenancy.action';
import { iniciales } from '@/components/plataforma/formato';

const ROTULO =
  'px-3 pb-2 font-mono text-[10.5px] tracking-[0.14em] text-[#8A8073] group-data-[collapsible=icon]:hidden';

export function SuperAdminSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { data: session } = useSession();
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
  ];

  const nombre = `${session?.user?.firstName ?? ''} ${session?.user?.lastName ?? ''}`.trim();

  return (
    <Sidebar collapsible="icon" className="group/sidebar border-r border-[#2E2820] bg-[#1A1511]" {...props}>
      {/* Continúa la franja de la barra superior. */}
      <div className="gm-stripes h-[3px] w-full shrink-0" aria-hidden />

      <SidebarHeader className="h-[75px] shrink-0 flex-row items-center justify-between gap-2 border-b border-[#2E2820] bg-[#1A1511] px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
        <Link
          href="/admin/metricas"
          onClick={cerrarEnMovil}
          className="flex min-w-0 items-center gap-3 group-data-[collapsible=icon]:hidden"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-[#362F26] bg-gm-surface-2">
            <ParkingMark size="sm" />
          </span>
          <span className="flex min-w-0 flex-col gap-1">
            <span className="font-display text-[15px] font-semibold leading-none tracking-[0.05em] text-foreground">
              ESTACIONAMIENTO
            </span>
            <span className="truncate font-mono text-[9.5px] tracking-[0.12em] text-muted-foreground">
              CONSOLA DE PLATAFORMA
            </span>
          </span>
        </Link>
        <SidebarTrigger className="h-8 w-8 shrink-0 rounded-md hover:bg-gm-surface-2 hover:text-foreground" />
      </SidebarHeader>

      <SidebarContent className="gap-7 bg-[#1A1511] px-2 py-5">
        <SidebarGroup className="p-0">
          <span className={ROTULO}>PLATAFORMA</span>
          <SidebarMenu className="gap-1">
            {items.map(({ titulo, url, Icono, activo, cuenta }) => (
              <SidebarMenuItem key={url}>
                <SidebarMenuButton
                  asChild
                  tooltip={titulo}
                  isActive={activo}
                  className="h-11 gap-3 rounded-xl px-3 text-sm font-medium text-[#C9BFB1] hover:bg-[#231D17] hover:text-foreground data-[active=true]:bg-[#2A231B] data-[active=true]:font-semibold data-[active=true]:text-foreground [&[data-active=true]>svg]:text-gm-yellow"
                >
                  <Link href={url} onClick={cerrarEnMovil} aria-current={activo ? 'page' : undefined}>
                    <Icono className="size-[18px]" />
                    <span className="flex-1">{titulo}</span>
                    {cuenta !== undefined && (
                      <span
                        className={`rounded-full px-[7px] py-0.5 font-mono text-[11px] ${
                          activo
                            ? 'bg-gm-yellow font-semibold text-gm-ink'
                            : 'border border-[#362F26] text-muted-foreground'
                        }`}
                      >
                        {cuenta}
                      </span>
                    )}
                    {activo && cuenta === undefined && (
                      <span aria-hidden className="size-1.5 rounded-full bg-gm-yellow" />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {atajos.length > 0 && (
          <SidebarGroup className="p-0 group-data-[collapsible=icon]:hidden">
            <span className={ROTULO}>ACCESO RÁPIDO</span>
            <ul className="flex flex-col gap-1">
              {atajos.map((e) => {
                const actual = e.id === empresaActual;
                return (
                  <li key={e.id}>
                    <Link
                      href={`/admin/empresas/${e.id}`}
                      onClick={cerrarEnMovil}
                      aria-current={actual ? 'page' : undefined}
                      className={`flex h-10 items-center gap-2.5 rounded-[10px] px-3 text-[13px] transition-colors hover:bg-[#231D17] ${
                        actual ? 'bg-[#231D17] font-semibold text-foreground' : 'text-[#C9BFB1]'
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`flex size-6 shrink-0 items-center justify-center rounded-[7px] font-display text-[11px] font-semibold ${
                          actual ? 'bg-gm-yellow text-gm-ink' : 'bg-[#2A241D] text-[#E9E1D4]'
                        }`}
                      >
                        {iniciales(e.nombre)}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{e.nombre}</span>
                      <span
                        role="img"
                        aria-label={e.estado === 'ACTIVA' ? 'Activa' : 'Suspendida'}
                        className={`size-[7px] shrink-0 rounded-full ${
                          e.estado === 'ACTIVA' ? 'bg-emerald-400' : 'bg-[#FF7A4D]'
                        }`}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link
              href="/admin/empresas"
              onClick={cerrarEnMovil}
              className="px-3 pt-2 text-[12.5px] font-semibold text-gm-yellow hover:text-[#FFD84D]"
            >
              Ver las {empresas.length} empresas →
            </Link>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-[#2E2820] bg-[#1A1511] p-3 group-data-[collapsible=icon]:p-1.5">
        <div className="flex items-center gap-2.5 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <span
            title={nombre || 'Super admin'}
            className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-gm-yellow font-display text-[13px] font-bold text-gm-ink"
          >
            {nombre ? iniciales(nombre) : 'SA'}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
            <span className="truncate text-[13px] font-semibold">{nombre || 'Super admin'}</span>
            <span className="text-[11.5px] text-muted-foreground">Super admin · dueño de la plataforma</span>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
