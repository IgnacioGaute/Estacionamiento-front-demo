'use client';

import { useState } from 'react';
import { ChevronDown, UserRound } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { TicketRegistration } from '@/types/ticket-registration.type';

// 30123456 → 30.123.456, como se lee un DNI.
const formatoDni = (dni: string) => dni.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// Los datos opcionales que se cargaron al entrar (apellido, DNI, WhatsApp), plegados debajo del
// vehículo para no alargar la salida. El modelo no va acá: está al lado del tipo. Sin datos, no se
// muestra nada.
export function DatosClienteEstadia({ r }: { r: Pick<TicketRegistration, 'lastNameCustomer' | 'documentoCustomer' | 'phoneCustomer'> }) {
  const [abierto, setAbierto] = useState(false);
  const filas = [
    r.lastNameCustomer ? ['Apellido', r.lastNameCustomer] : null,
    r.documentoCustomer ? ['DNI', formatoDni(r.documentoCustomer)] : null,
    r.phoneCustomer ? ['WhatsApp', `+${r.phoneCustomer.replace(/^\+/, '')}`] : null,
  ].filter((fila): fila is [string, string] => !!fila);
  if (!filas.length) return null;

  return (
    <Collapsible open={abierto} onOpenChange={setAbierto} className="mt-2.5">
      <CollapsibleTrigger className="flex min-h-10 w-full items-center gap-2 rounded-xl border border-border bg-gm-surface-3/60 px-3 text-left text-[13px] font-semibold transition-colors hover:border-gm-yellow/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow">
        <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 truncate">
          Datos del cliente
          {!abierto && <span className="font-normal text-muted-foreground"> · {filas.map(([, valor]) => valor).join(' · ')}</span>}
        </span>
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', abierto && 'rotate-180')} aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <dl className="mt-1.5 space-y-1.5 rounded-xl border border-border px-3 py-2.5 text-[13.5px]">
          {filas.map(([dt, dd]) => (
            <div key={dt} className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">{dt}</dt>
              <dd className={cn('min-w-0 truncate text-right font-semibold', dt !== 'Apellido' && 'gm-mono')}>{dd}</dd>
            </div>
          ))}
        </dl>
      </CollapsibleContent>
    </Collapsible>
  );
}
