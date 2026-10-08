'use client';

import React from 'react';
import { ArrowLeft, ChevronRight, ChevronsDown, ChevronsLeft } from 'lucide-react';
import { ParkingMark } from '@/components/brand/logo';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  url: string;
  icon?: React.ReactNode | (() => React.JSX.Element);
  isActive?: boolean;
  items?: { title: string; url: string }[];
}

// La barra lateral flota como la de arriba: mismo negro, mismo borde, mismas esquinas. Se aplica
// desde afuera sobre el panel interno del Sidebar de shadcn (con `!` porque su variante flotante
// trae sus propias esquinas, borde y sombra con más especificidad). Va por encima de la barra de
// arriba (z-40) porque su pestaña entra en el hueco de esa barra; la sombra es un filtro, no
// box-shadow, para que siga también la forma de la pestaña.
export const PANEL_FLOTANTE = cn(
  'group/sidebar z-40 py-3 pl-3 pr-0',
  '[&>[data-sidebar=sidebar]]:relative [&>[data-sidebar=sidebar]]:!rounded-[18px] [&>[data-sidebar=sidebar]]:!border-white/[0.07] [&>[data-sidebar=sidebar]]:!bg-[#0B0A08]',
  '[&>[data-sidebar=sidebar]]:!shadow-none [&>[data-sidebar=sidebar]]:[filter:drop-shadow(0_14px_18px_rgba(0,0,0,0.55))]',
);

// En el celular la barra baja como un panel debajo de la barra de arriba, con el hueco donde
// encaja la pestaña (arriba al centro). El centro del hueco coincide con el de la pestaña: el pie
// de la barra de arriba queda 12 px por encima del panel.
export const PANEL_MOVIL = cn(
  'inset-x-2.5 bottom-auto top-[78px] w-auto max-h-[calc(100dvh-92px)] overflow-y-auto rounded-[20px] border border-white/[0.07] !bg-[#0B0A08] p-0',
  '[mask-image:radial-gradient(circle_21px_at_50%_-12px,transparent_20.5px,#000_21px)] [-webkit-mask-image:radial-gradient(circle_21px_at_50%_-12px,transparent_20.5px,#000_21px)]',
);

// La pestaña del encastre: abre y cierra la barra. Un aro sutil, la flecha doble en amarillo que
// gira según el estado y un brillo al pasar el mouse.
const BOTON_PESTANIA =
  'grid size-[30px] place-items-center rounded-full bg-white/[0.06] text-gm-yellow ring-1 ring-white/10 transition-[background-color,transform,box-shadow] duration-200 hover:scale-105 hover:bg-gm-yellow/15 hover:shadow-[0_0_16px_hsl(var(--gm-yellow)/0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow active:scale-95';

// Computadora: sale del borde derecho de la barra lateral, a la altura del centro de la barra de
// arriba, y entra en su hueco.
export function PestaniaLateral() {
  const { state, toggleSidebar, isMobile } = useSidebar();
  if (isMobile) return null;
  const plegada = state === 'collapsed';
  return (
    <span className="absolute -right-6 top-3 z-10 grid size-9 place-items-center rounded-full bg-[#0B0A08]">
      <button
        type="button"
        onClick={toggleSidebar}
        aria-expanded={!plegada}
        aria-label={plegada ? 'Desplegar la barra lateral' : 'Plegar la barra lateral'}
        title={plegada ? 'Desplegar' : 'Plegar'}
        className={BOTON_PESTANIA}
      >
        <ChevronsLeft className={cn('size-4 transition-transform duration-300', plegada && 'rotate-180')} strokeWidth={2.4} aria-hidden />
      </button>
    </span>
  );
}

// Celular: cuelga del centro de la barra de arriba y encaja en el panel que baja.
export function PestaniaMovil() {
  const { openMobile, setOpenMobile } = useSidebar();
  return (
    <span className="absolute left-1/2 top-full z-10 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#0B0A08] md:hidden">
      <button
        type="button"
        onClick={() => setOpenMobile(!openMobile)}
        aria-expanded={openMobile}
        aria-label={openMobile ? 'Cerrar el menú' : 'Abrir el menú'}
        className={BOTON_PESTANIA}
      >
        <ChevronsDown className={cn('size-4 transition-transform duration-300', openMobile && 'rotate-180')} strokeWidth={2.4} aria-hidden />
      </button>
    </span>
  );
}

// Cada ítem: el ícono en su cajita y el nombre. Plegada, la cajita es el botón (44 px).
export const ITEM = cn(
  'group/item relative h-11 w-full rounded-xl px-1.5 text-[14px] font-semibold tracking-tight transition-[background-color,color,box-shadow] duration-150',
  'text-[#D9D1C3] hover:bg-white/[0.04] hover:text-foreground',
  'data-[active=true]:font-bold data-[active=true]:text-gm-ink data-[active=true]:shadow-[0_10px_24px_-12px_hsl(26_92%_55%/0.75)]',
  // El degradado de la M del logo (amarillo a naranja) marca la sección donde estás. Escrito
  // entero: Tailwind solo genera clases que encuentra literales.
  'data-[active=true]:bg-gradient-to-r data-[active=true]:from-gm-yellow data-[active=true]:to-[hsl(26_92%_55%)]',
  'group-data-[collapsible=icon]:!size-11 group-data-[collapsible=icon]:!p-1.5',
);
export const CAJITA =
  'grid size-8 shrink-0 place-items-center rounded-[10px] bg-white/[0.05] text-[#CFC5B5] transition-colors group-hover/item:bg-white/[0.08] group-hover/item:text-foreground group-data-[active=true]/item:bg-gm-ink/[0.14] group-data-[active=true]/item:text-gm-ink [&>svg]:size-[18px] [&>svg]:stroke-[1.9]';

// Plegada, cada botón de 44 px queda centrado en la tira (si no, se pega a la izquierda).
export const CENTRADO = 'gap-1 group-data-[collapsible=icon]:items-center';

function Icono({ icon }: { icon: NavItem['icon'] }) {
  if (!icon) return null;
  return <span className={CAJITA}>{React.isValidElement(icon) ? icon : typeof icon === 'function' ? (icon as () => React.JSX.Element)() : null}</span>;
}

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <SidebarGroup>
      <SidebarMenu className={CENTRADO}>
        {items.map((item) => {
          const isActive = mounted && pathname === item.url;
          const hasActiveChild =
            mounted && item.items?.some((subItem) => pathname === subItem.url);

          if (!item.items?.length) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild tooltip={item.title} isActive={isActive} className={ITEM}>
                  <Link href={item.url} onClick={() => { if (isMobile) setOpenMobile(false); }} className="flex w-full items-center gap-3">
                    <Icono icon={item.icon} />
                    <span className="truncate">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={hasActiveChild}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title} className={cn(ITEM, 'gap-3')}>
                    <Icono icon={item.icon} />
                    <span className="truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
                    <ChevronRight className="ml-auto size-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-150 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent className="animate-accordion-down group-data-[collapsible=icon]:hidden">
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={mounted && pathname === subItem.url}
                          className={cn(
                            'group flex w-full items-center rounded-lg py-2 pl-9 pr-3 text-[12.5px] font-medium transition-colors',
                            'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground',
                            'data-[active=true]:bg-gm-yellow data-[active=true]:text-gm-ink',
                          )}
                        >
                          <Link href={subItem.url} onClick={() => { if (isMobile) setOpenMobile(false); }}>
                            <span className="truncate">{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

// Arriba de todo: la salida a Entradas y salidas. Va neutra, como un ítem más, y separada por una
// línea: el degradado queda solo para la sección donde estás.
export function NavVolver() {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarGroup className="pb-0">
      <SidebarMenu className={CENTRADO}>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="Volver al mostrador" className={ITEM}>
            <Link href="/tickets" onClick={() => { if (isMobile) setOpenMobile(false); }} className="flex w-full items-center gap-3">
              <span className={CAJITA}>
                <ArrowLeft aria-hidden />
              </span>
              <span className="truncate">Volver al mostrador</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <span aria-hidden className="mx-1.5 mt-2 h-px bg-white/[0.07]" />
    </SidebarGroup>
  );
}

// Al pie: el centro de aprendizaje (se abre en otra pestaña).
export function NavAprender() {
  return (
    <SidebarMenu className={CENTRADO}>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          tooltip="Centro de aprendizaje"
          className="group/item h-11 rounded-xl px-1.5 text-[13px] font-semibold text-muted-foreground hover:bg-white/[0.04] hover:text-foreground group-data-[collapsible=icon]:!size-11 group-data-[collapsible=icon]:!p-1.5"
        >
          <a href="https://estacionamiento-demo-landing.vercel.app/aprender" target="_blank" rel="noopener noreferrer" className="flex w-full items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-[10px]">
              <ParkingMark size="sm" className="h-auto w-[18px]" />
            </span>
            <span className="truncate">Centro de aprendizaje</span>
            <span className="sr-only"> (se abre en otra pestaña)</span>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
