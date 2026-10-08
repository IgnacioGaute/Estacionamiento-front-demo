import { PlayaSelector } from '@/components/tenant-provider';
import { SidebarInset } from '@/components/ui/sidebar';
import Link from 'next/link';
import { ReactNode } from 'react';
import { currentUser } from '@/lib/auth';
import { NavUser } from './nav-user';
import { BarraOperativa } from './barra-operativa';
import { PestaniaMovil } from './nav-main';
import { cn } from '@/lib/utils';
import { PlatformBar } from './platform-bar';
import { AppIcon } from '@/components/brand/logo';
import { AssistantWidget } from '@/components/assistant/assistant-widget';
import { OfflinePreparation } from '@/components/offline-preparation';
import { AvisoCuenta } from '@/components/aviso-cuenta';

interface AppNavbarProps {
  children: ReactNode;
  adminSidebar?: ReactNode;
  userSidebar?: ReactNode;
}

export async function AppNavbar({ children, adminSidebar, userSidebar }: AppNavbarProps) {
  const user = await currentUser();
  const userNav = {
    avatar: user?.image ?? '',
    email: user?.email ?? '',
    name: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`,
    role: user?.role || 'USER',
  };
  // La barra lateral flotante encastra con esta barra, también la de la consola de plataforma.
  const encastre = !!(adminSidebar || userSidebar);

  return (
    <>
      {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') ? (
        <>{adminSidebar}</>
      ) : (
        <>{userSidebar}</>
      )}

      <SidebarInset className="flex flex-col">
        {/* — TOPBAR — */}
        {/* La barra flota separada de los bordes, más oscura que la página. El degradé de atrás tapa
            lo que pasa por debajo al desplazar, en el espacio entre la barra y el borde. Con la
            barra lateral, las dos encastran: en computadora la pestaña de la lateral entra en el
            hueco del extremo izquierdo de esta barra; en el celular la pestaña cuelga del centro
            de esta barra y abre el menú, que baja y encaja en ella. La sombra es un filtro para que
            siga esas formas. */}
        <header className="barra-superior sticky top-0 z-30 bg-gradient-to-b from-background from-60% to-transparent px-2.5 pb-2 pt-2.5 sm:px-4 sm:pt-3">
          <div className="relative [filter:drop-shadow(0_14px_18px_rgba(0,0,0,0.55))]">
          <div
            className={cn(
              'flex h-14 shrink-0 items-center gap-1.5 rounded-2xl border border-white/[0.07] bg-[#0B0A08]/95 px-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:h-[60px] sm:gap-2 sm:rounded-[18px] sm:px-2.5',
              // El hueco: 3 px más grande que la pestaña (radio 18) y centrado donde queda ella, a
              // la altura del centro de la barra y entre los dos bordes.
              encastre && 'md:pl-5 md:[-webkit-mask-image:radial-gradient(circle_21px_at_-10px_31px,transparent_20.5px,#000_21px)] md:[mask-image:radial-gradient(circle_21px_at_-10px_31px,transparent_20.5px,#000_21px)]',
            )}
          >
            <Link
              href={user?.role === 'SUPER_ADMIN' ? '/admin/empresas' : '/tickets'}
              aria-label={user?.role === 'SUPER_ADMIN' ? 'Ir a empresas' : 'Ir a Entradas y salidas'}
              className="group grid size-10 shrink-0 place-items-center rounded-[9px] transition-[filter] hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow"
            >
              {/* El mismo ícono que la pestaña y la pantalla de carga. */}
              <AppIcon className="size-10" />
            </Link>

            {/* El super admin no opera una playa: en vez del selector lleva la ruta actual, el
                buscador de la plataforma y su estado. */}
            {user?.role === 'SUPER_ADMIN' ? (
              <>
                <PlatformBar />
                <NavUser userNav={userNav} />
              </>
            ) : (
              <>
                <div className="min-w-0 shrink">
                  <PlayaSelector />
                </div>
                <BarraOperativa userNav={userNav} />
              </>
            )}
          </div>
          {encastre && <PestaniaMovil />}
          </div>
        </header>

        {user?.role !== 'SUPER_ADMIN' && <AvisoCuenta />}
        {user?.role !== 'SUPER_ADMIN' && <OfflinePreparation />}
        {children}
        <AssistantWidget />
      </SidebarInset>
    </>
  );
}
