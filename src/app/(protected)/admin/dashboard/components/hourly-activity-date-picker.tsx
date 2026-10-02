'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import { Calendar } from '@/components/ui/calendar';
import { AppCalendarDialog, appCalendarClassNames } from '@/components/app-date-picker';
import { MONO_BADGE } from './mono-style';

dayjs.extend(utc);
dayjs.extend(timezone);

export function HourlyActivityDatePicker({ date }: { date: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const today = dayjs().tz('America/Argentina/Buenos_Aires').format('YYYY-MM-DD');
  const isToday = date === today;

  const apply = (nextDate: Date | undefined) => {
    if (!nextDate) return;
    const next = dayjs(nextDate).tz('America/Argentina/Buenos_Aires').format('YYYY-MM-DD');

    const params = new URLSearchParams(searchParams.toString());
    params.set('hourlyDate', next);
    router.push(`?${params.toString()}`);
    setOpen(false);
  };

  return (
    <AppCalendarDialog open={open} onOpenChange={setOpen} title="Fecha de actividad" trigger={
        <button type="button" aria-label="Elegir fecha de actividad" className={`${MONO_BADGE} gap-1 gm-tnum`}>
          <CalendarIcon className="size-2.5" />
          {isToday ? 'Hoy' : dayjs(date).format('DD/MM/YYYY')}
        </button>
      } footer={<><span className="text-xs text-muted-foreground">Hasta el día de hoy</span><button type="button" className="text-sm font-medium text-gm-yellow" onClick={() => apply(new Date())}>Ir a hoy</button></>}>
        <Calendar
          mode="single"
          locale={es}
          selected={dayjs(date).toDate()}
          onSelect={apply}
          defaultMonth={dayjs(date).toDate()}
          disabled={(day) => day > new Date()}
          className="p-3"
          classNames={appCalendarClassNames}
        />
    </AppCalendarDialog>
  );
}
