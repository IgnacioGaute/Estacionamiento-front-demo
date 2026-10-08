'use client';

// La derecha de la barra de quien opera una playa: la hora (con si hay conexión) y la cuenta. Lo
// que hay adentro del menú de la cuenta no cambia.

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useNotifications } from '@/hooks/use-notification';
import { cn } from '@/lib/utils';
import { OperationalNavUser, type UserNav } from './nav-user';

dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = 'America/Argentina/Buenos_Aires';
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Con conexión alcanza un punto verde: es lo normal y no hace falta decirlo. Solo cuando se corta
// aparece el texto. Hasta montar no hay hora (el servidor no sabe la del navegador y no se quiere
// un salto al hidratar).
function Hora() {
  const [ahora, setAhora] = useState<number | null>(null);
  const [enLinea, setEnLinea] = useState(true);
  useEffect(() => {
    const tic = () => setAhora(Date.now());
    const red = () => setEnLinea(navigator.onLine);
    tic();
    red();
    const id = window.setInterval(tic, 15_000);
    window.addEventListener('online', red);
    window.addEventListener('offline', red);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('online', red);
      window.removeEventListener('offline', red);
    };
  }, []);
  const hora = ahora === null ? null : dayjs(ahora).tz(TZ);
  return (
    <span
      title={enLinea ? 'En línea: lo que registrás se guarda al instante' : 'Sin conexión: revisá internet o usá el modo sin conexión'}
      className="flex h-8 shrink-0 items-center gap-2 rounded-[10px] border border-white/[0.06] bg-white/[0.04] px-2.5 sm:h-9 sm:rounded-xl sm:px-3"
    >
      <span aria-hidden className={cn('size-[7px] shrink-0 rounded-full', enLinea ? 'bg-emerald-400' : 'bg-[#F0714A]')} />
      <span className="sr-only">{enLinea ? 'En línea.' : 'Sin conexión.'}</span>
      {!enLinea && <span className="whitespace-nowrap text-xs font-semibold text-[#F0714A]">Sin conexión</span>}
      {hora && (
        <>
          <span className="gm-mono text-[12.5px] font-bold text-foreground sm:text-[13.5px]">{hora.format('HH:mm')}</span>
          <span className="hidden whitespace-nowrap text-xs text-muted-foreground xl:inline">
            {DIAS[hora.day()]} {hora.date()} {MESES[hora.month()]}
          </span>
        </>
      )}
    </span>
  );
}

export function BarraOperativa({ userNav }: { userNav: UserNav }) {
  // Una sola consulta de avisos sin leer, para el punto de la cuenta.
  const notas = useNotifications();
  return (
    <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-2">
      <Hora />
      <OperationalNavUser userNav={userNav} notas={notas} />
    </div>
  );
}
