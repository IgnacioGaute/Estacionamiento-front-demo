import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import Link from 'next/link';
import { ReactNode } from 'react';
import { currentUser } from '@/lib/auth';
import { NavUser } from './nav-user';
import { ParkingMark } from '@/components/brand/logo';

interface AppNavbarProps {
  children: ReactNode;
  adminSidebar?: ReactNode;
  userSidebar?: ReactNode;
}

export async function AppNavbar({ children, adminSidebar, userSidebar }: AppNavbarProps) {
  const user = await currentUser();

  return (
    <>
      {user?.role === 'ADMIN' ? (
        <div className="hidden md:block">{adminSidebar}</div>
      ) : (
        <div className="hidden md:block">{userSidebar}</div>
      )}

      <SidebarInset className="flex flex-col">
        {/* — TOPBAR — */}
        <header className="sticky top-0 z-30 border-b border-border/60 bg-gm-surface/80 backdrop-blur-xl supports-[backdrop-filter]:bg-gm-surface/60">
          {/* Caution-tape accent */}
          <div className="gm-stripes h-[3px] w-full" aria-hidden />

          <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
            {(adminSidebar || userSidebar) && (
              <SidebarTrigger className="md:hidden -ml-1 h-9 w-9 border border-border/60 bg-white/[0.04] hover:bg-white/[0.08]" />
            )}

            <Link
              href="/tickets"
              className="group ml-1 inline-flex items-center gap-2 transition-opacity hover:opacity-90"
            >
              <ParkingMark size="sm" />
            </Link>

            {/* Subtle separator */}
            <div className="hidden md:block h-6 w-px bg-border/40" />

            {/* Ambient label */}
            <span className="hidden md:inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(120_35%_55%)] animate-pulse" />
              Operativo
            </span>

            <div className="flex-1" />

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
      </SidebarInset>
    </>
  );
}
