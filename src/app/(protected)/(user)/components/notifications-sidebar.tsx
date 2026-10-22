'use client';

import { Button } from '@/components/ui/button';
import { BotonMantener } from '@/components/ui/boton-mantener';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useNotificationsInterest } from '@/hooks/use-notification-interest';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BellRing,
  CircleDollarSign,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function NotificationSidebar() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const { notifications, clearNotifications, removeNotification } =
    useNotificationsInterest();

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const count = notifications.length;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-10">
          {count > 0 ? (
            <>
              <BellRing className="size-5 text-[#FF8458]" />
              <span className="absolute -top-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-gm-orange text-[10px] font-bold text-white ring-2 ring-gm-surface">
                {count}
              </span>
            </>
          ) : (
            <Bell className="size-5" />
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="flex w-[400px] flex-col border-l border-border bg-gm-surface p-0 sm:w-[440px]">
        <SheetHeader className="border-b border-border px-5 py-4 space-y-1.5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md border border-gm-orange/40 bg-gm-orange/15 text-[#FF8458]">
              <CircleDollarSign className="size-4" />
            </span>
            <div className="flex-1">
              <SheetTitle className="gm-display text-lg font-bold tracking-[0.02em]">
                Intereses aplicados
              </SheetTitle>
              <SheetDescription className="text-[12px] text-muted-foreground">
                Días 10, 20 y último de cada mes — clientes con deuda.
              </SheetDescription>
            </div>
            {count > 0 && (
              <Badge variant="orange">{count}</Badge>
            )}
          </div>

          {/* Liviano: se limpia manteniendo apretado el botón (BotonMantener), sin diálogo. */}
          {count > 0 && (
            <BotonMantener size="sm" hecho="Limpias" icono={<Trash2 className="size-3.5" />} onHold={clearNotifications} className="self-end">
              Mantené para limpiar todo
            </BotonMantener>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {count === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
              <Bell className="size-8 opacity-50" />
              <p className="text-[13px]">No hay notificaciones por ahora.</p>
            </div>
          )}

          {notifications.map((notification) => (
            <article
              key={notification.id}
              className="rounded-md border border-border bg-gm-surface-2 p-3 relative"
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 size-7 text-muted-foreground hover:text-foreground"
                onClick={() => removeNotification(notification.id)}
              >
                <X className="size-3.5" />
              </Button>

              <div className="flex items-start gap-2.5 pr-7">
                <AlertTriangle className="size-4 mt-0.5 text-[#FF8458] shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-[13px] font-semibold text-foreground">
                    {notification.title}
                  </h4>
                  <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">
                    {notification.message}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[12px] text-gm-yellow hover:text-gm-yellow hover:bg-gm-yellow/10"
                  onClick={() => {
                    removeNotification(notification.id);
                    const typeMap: Record<string, string> = {
                      OWNER:   'owners',
                      RENTER:  'renters',
                      PRIVATE: 'privates',
                    };
                    const routeType = typeMap[notification.customerType];
                    router.push(
                      `/${routeType}?lastName=${notification.lastName}&showSummary=true`,
                    );
                    setIsOpen(false);
                  }}
                >
                  Ir al detalle
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
