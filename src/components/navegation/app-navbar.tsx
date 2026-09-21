import { PlayaSelector } from '@/components/tenant-provider';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import Link from 'next/link';
import { ReactNode } from 'react';
import { currentUser } from '@/lib/auth';
import { NavUser } from './nav-user';
import { ParkingMark } from '@/components/brand/logo';
import { AssistantWidget } from '@/components/assistant/assistant-widget';

interface AppNavbarProps {
  children: ReactNode;
  adminSidebar?: ReactNode;
  userSidebar?: ReactNode;
}

export async function AppNavbar({ children, adminSidebar, userSidebar }: AppNavbarProps) {
  const user = await currentUser();

  return (
    <>
      {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') ? (
        <>{adminSidebar}</>
      ) : (
        <>{userSidebar}</>
      )}

      <SidebarInset className="flex flex-col">
        {/* — TOPBAR — */}
        <header className="sticky top-0 z-30 border-b border-border/60 bg-gm-surface/80 backdrop-blur-xl supports-[backdrop-filter]:bg-gm-surface/60">
          {/* Caution-tape accent */}
          <div className="gm-stripes h-[3px] w-full" aria-hidden />

          <div className="flex h-[74px] shrink-0 items-center gap-2.5 px-3 py-2 sm:gap-4 sm:px-6">
            {(adminSidebar || userSidebar) && (
              <SidebarTrigger className="md:hidden -ml-1 h-9 w-9 border border-border/60 bg-white/[0.04] hover:bg-white/[0.08]" />
            )}

            <Link
              href={user?.role === 'SUPER_ADMIN' ? '/admin/empresas' : '/tickets'}
              className="group hidden shrink-0 items-center gap-2 transition-opacity hover:opacity-90 sm:inline-flex"
            >
              <ParkingMark size="sm" />
            </Link>

            {/* Subtle separator */}
            <div className="hidden md:block h-6 w-px bg-border/40" />

            {user?.role === 'SUPER_ADMIN' && (
              <span className="hidden shrink-0 items-center gap-2 rounded-full border border-gm-yellow/25 bg-gm-yellow/[0.07] px-3 py-1.5 text-[10px] font-semibold text-gm-yellow lg:inline-flex">
                Administración de la plataforma
              </span>
            )}

            <div className="min-w-0 flex-1">
              <PlayaSelector />
            </div>

            <NavUser
              userNav={{
                avatar: user?.image ?? '',
                email: user?.email ?? '',
                name: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`,
                role: user?.role || 'USER',
              }}
            />
          </div>
        </header>

        {children}
        <AssistantWidget />
      </SidebarInset>
    </>
  );
}
