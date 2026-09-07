'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  AlertCircle,
  BellDot,
  Box,
  ChevronDown,
  LogOut,
  Shield,
  TicketIcon,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { User } from 'next-auth';
import { NavigationMenuDemo } from './navegation-menu';
import { BoxListDialog } from '../box-list-dialog';
import { useNotifications } from '@/hooks/use-notification';
import { cn } from '@/lib/utils';
import { InstallAppMenuItem } from './install-app-menu-item';

export function NavUser({
  userNav,
}: {
  userNav: {
    name: string;
    email: string;
    avatar: string;
    role: User['role'];
  };
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [openBoxDialog, setOpenBoxDialog] = useState(false);
  const { hasNewNoteAlert, clearNoteAlert } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const initials = userNav.name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'GM';

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'group relative flex items-center gap-3 rounded-2xl border border-transparent bg-white/[0.04] px-2.5 py-2 text-left text-sm transition-all duration-200',
              'hover:bg-white/[0.08]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              isOpen && 'bg-white/[0.08] border-border/60',
            )}
          >
            <Avatar className="h-10 w-10 rounded-xl border border-border/60">
              <AvatarImage src={userNav.avatar} alt={userNav.name} />
              <AvatarFallback className="rounded-xl bg-gm-orange text-white font-display font-bold text-sm tracking-wider">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="hidden lg:flex flex-col leading-tight">
              <span className="text-sm font-medium text-foreground truncate max-w-[160px]">
                {userNav.name.trim() || 'Usuario'}
              </span>
              <span className="text-xs text-muted-foreground">
                {userNav.role === 'ADMIN' ? 'Administrador' : 'Operador'}
              </span>
            </div>

            {hasNewNoteAlert && (
              <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-gm-orange ring-2 ring-gm-surface" />
            )}

            <span
              className={cn(
                'hidden lg:flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-white/5 text-muted-foreground transition-transform duration-200',
                isOpen && 'rotate-180',
              )}
            >
              <ChevronDown className="h-4 w-4" />
            </span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-56 rounded-xl border border-border/70 bg-card/95 p-1.5 shadow-[0_28px_90px_-35px_rgba(0,0,0,0.65)] backdrop-blur-xl"
        >
          {/* User info header */}
          <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.04] px-2.5 py-2 mb-1">
            <Avatar className="h-7 w-7 rounded-md border border-border/60">
              <AvatarImage src={userNav.avatar} alt={userNav.name} />
              <AvatarFallback className="rounded-md bg-gm-orange text-white font-display font-bold text-[10px] tracking-wider">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col min-w-0">
              <span className="text-[12.5px] font-medium text-foreground truncate leading-tight">
                {userNav.name.trim() || 'Usuario'}
              </span>
              <span className="text-[10.5px] text-muted-foreground truncate leading-tight">
                {userNav.email}
              </span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-gm-yellow">
              {userNav.role === 'ADMIN' ? 'Admin' : 'Op.'}
            </span>
          </div>

          {/* Clients submenu (admin only) */}
          {userNav.role === 'ADMIN' && (
            <>
              <NavigationMenuDemo setIsExpanded={setIsExpanded} />
              <DropdownMenuSeparator className="bg-border/40 -mx-1.5 my-1" />
            </>
          )}

          {/* Navigation items */}
          <DropdownMenuGroup>
            <Link href="/tickets">
              <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] text-foreground transition-colors duration-150 hover:bg-white/[0.08] focus:bg-white/[0.08]">
                <TicketIcon className="size-3.5 text-muted-foreground" />
                Tickets
              </DropdownMenuItem>
            </Link>

            <DropdownMenuItem
              onClick={() => setOpenBoxDialog(true)}
              className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] text-foreground transition-colors duration-150 hover:bg-white/[0.08] focus:bg-white/[0.08]"
            >
              <Box className="size-3.5 text-muted-foreground" />
              Planilla de caja
            </DropdownMenuItem>

            <Link href="/notes">
              <DropdownMenuItem
                className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] text-foreground transition-colors duration-150 hover:bg-white/[0.08] focus:bg-white/[0.08]"
                onClick={clearNoteAlert}
              >
                <AlertCircle className="size-3.5 text-muted-foreground" />
                Avisos
                {hasNewNoteAlert && (
                  <BellDot className="ml-auto size-3.5 text-gm-orange" />
                )}
              </DropdownMenuItem>
            </Link>

            <InstallAppMenuItem />
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="bg-border/40 -mx-1.5 my-1" />

          <Link
            href={
              userNav.role === 'ADMIN'
                ? '/admin/dashboard'
                : '/admin/other-payments'
            }
          >
            <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] text-foreground transition-colors duration-150 hover:bg-white/[0.08] focus:bg-white/[0.08]">
              <Shield className="size-3.5 text-muted-foreground" />
              {userNav.role === 'ADMIN' ? 'Administrar' : 'Administrar gastos'}
            </DropdownMenuItem>
          </Link>

          <DropdownMenuSeparator className="bg-border/40 -mx-1.5 my-1" />

          {/* Logout */}
          <DropdownMenuItem
            onClick={() => signOut()}
            className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] text-[#F08775] transition-colors duration-150 hover:bg-destructive/15 focus:bg-destructive/15"
          >
            <LogOut className="size-3.5" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <BoxListDialog open={openBoxDialog} setOpen={setOpenBoxDialog} />
    </>
  );
}
