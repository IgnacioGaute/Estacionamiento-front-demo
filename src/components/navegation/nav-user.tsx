'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  AlertCircle,
  BellDot,
  Box,
  ChevronDown,
  LogOut,
  Banknote,
  TicketIcon,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { useTenant } from '@/components/tenant-provider';
import { User } from 'next-auth';
import { BoxListDialog } from '../box-list-dialog';
import { CreateOtherPaymentDialog } from '@/app/(protected)/admin/other-payments/components/create-other-payment-dialog';
import { useNotifications } from '@/hooks/use-notification';
import { cn } from '@/lib/utils';
import { InstallAppMenuItem } from './install-app-menu-item';
import { HojaDeRama, Rama as RamaMenu } from './branched-menu';

type RamaId = 'operacion' | 'clientes' | 'admin';

// Las mismas secciones que el sidebar de administración, para que el menú no quede atrás
// cuando ahí se agregue una.
const SECCIONES_CLIENTES = [
  { label: 'Propietarios', url: '/owners' },
  { label: 'Inquilinos', url: '/renters' },
  { label: 'Particulares', url: '/privates' },
];

const SECCIONES_ADMIN = [
  { label: 'Panel', url: '/admin/dashboard' },
  { label: 'Usuarios', url: '/admin/users' },
  { label: 'Tickets y precios', url: '/admin/tickets' },
  { label: 'Frecuentes', url: '/admin/frecuentes' },
  // { label: 'Tipos de cochera', url: '/admin/parking-type' },
  { label: 'Historial de turnos', url: '/admin/caja' },
  { label: 'Configuración', url: '/admin/configuracion' },
  { label: 'Varios', url: '/admin/other-payments' },
];

function OperationalNavUser({
  userNav,
}: {
  userNav: {
    name: string;
    email: string;
    avatar: string;
    role: User['role'];
  };
}) {
  const [openBoxDialog, setOpenBoxDialog] = useState(false);
  const { shiftsEnabled } = useTenant();
  const [openPaymentsDialog, setOpenPaymentsDialog] = useState(false);
  const { hasNewNoteAlert, clearNoteAlert } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const esAdmin = userNav.role === 'ADMIN';

  // Se abre una rama por vez. Con Administración desplegada son siete hijos: las tres ramas
  // abiertas a la vez pasarían de alto la pantalla en un monitor chico.
  const [rama, setRama] = useState<RamaId | null>(null);
  const alternarRama = (id: RamaId) => setRama((actual) => (actual === id ? null : id));

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Al abrir el menú, se despliega la rama donde estás parado: el menú muestra dónde estás en
  // vez de obligarte a buscarlo.
  useEffect(() => {
    if (!isOpen) return;
    if (pathname.startsWith('/admin')) setRama('admin');
    else if (SECCIONES_CLIENTES.some((s) => pathname.startsWith(s.url))) setRama('clientes');
    else setRama('operacion');
  }, [isOpen, pathname]);

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

          {/* Operación: lo que se usa todo el día */}
          <RamaMenu
            label="Operación"
            abierta={rama === 'operacion'}
            onAlternar={() => alternarRama('operacion')}
          >
            <Link href="/tickets">
              <HojaDeRama activa={pathname === '/tickets'}>
                <TicketIcon className="size-3.5" />
                Tickets
              </HojaDeRama>
            </Link>

            <Link href="/notes">
              <HojaDeRama activa={pathname === '/notes'} onSelect={clearNoteAlert}>
                <AlertCircle className="size-3.5" />
                Avisos
                {hasNewNoteAlert && (
                  <BellDot className="ml-auto size-3.5 text-gm-orange" />
                )}
              </HojaDeRama>
            </Link>
          </RamaMenu>

          {/* Clientes y Administración son de encargado: el operador no las ve */}
          {/* {esAdmin && (
            <RamaMenu
              label="Clientes"
              abierta={rama === 'clientes'}
              onAlternar={() => alternarRama('clientes')}
            >
              {SECCIONES_CLIENTES.map((seccion) => (
                <Link key={seccion.url} href={seccion.url}>
                  <HojaDeRama activa={pathname === seccion.url}>
                    {seccion.label}
                  </HojaDeRama>
                </Link>
              ))}
            </RamaMenu>
          )} */}

          {esAdmin && (
            <RamaMenu
              label="Administración"
              abierta={rama === 'admin'}
              onAlternar={() => alternarRama('admin')}
            >
              {SECCIONES_ADMIN.filter(seccion => shiftsEnabled || seccion.url !== '/admin/caja').map((seccion) => (
                <Link key={seccion.url} href={seccion.url}>
                  <HojaDeRama activa={pathname === seccion.url}>
                    {seccion.label}
                  </HojaDeRama>
                </Link>
              ))}
            </RamaMenu>
          )}

          <DropdownMenuSeparator className="bg-border/40 -mx-1.5 my-1" />

          {/* Hojas sueltas, sin codo: son acciones, no destinos. Las ramas llevan a una
              pantalla; esto abre algo encima de donde ya estás, así que colgarlo de un codo
              haría que el árbol mienta sobre lo que es. */}
          <DropdownMenuItem
            onClick={() => setOpenBoxDialog(true)}
            className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] text-foreground transition-colors duration-150 hover:bg-white/[0.08] focus:bg-white/[0.08]"
          >
            <Box className="size-3.5 text-muted-foreground" />
            Planilla de caja
          </DropdownMenuItem>

          <InstallAppMenuItem />

          {!esAdmin && (
              <DropdownMenuItem onSelect={() => { setIsOpen(false); setOpenPaymentsDialog(true); }} className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] text-foreground transition-colors duration-150 hover:bg-white/[0.08] focus:bg-white/[0.08]">
                <Banknote className="size-3.5 text-muted-foreground" />
                Gastos e ingresos
              </DropdownMenuItem>
          )}

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
      {!esAdmin && <CreateOtherPaymentDialog open={openPaymentsDialog} onOpenChange={setOpenPaymentsDialog} />}
    </>
  );
}

// El menú de plataforma no monta avisos, caja ni suscripciones operativas.
export function NavUser(props: { userNav: { name: string; email: string; avatar: string; role: User['role'] } }) {
  if (props.userNav.role !== 'SUPER_ADMIN') return <OperationalNavUser {...props} />;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-lg border border-border px-3 py-2 text-sm">
        {props.userNav.name.trim() || 'Mi cuenta'} · Super admin
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="px-2 py-2 text-xs text-muted-foreground">{props.userNav.email}</div>
        <DropdownMenuItem asChild><Link href="/admin/empresas">Empresas, playas y usuarios</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>Cerrar sesión</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
