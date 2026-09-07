'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={`${MONO_BADGE} gap-1 gm-tnum`}>
          <CalendarIcon className="size-2.5" />
          {isToday ? 'Hoy' : dayjs(date).format('DD/MM/YYYY')}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={es}
          selected={dayjs(date).toDate()}
          onSelect={apply}
          defaultMonth={dayjs(date).toDate()}
          disabled={(day) => day > new Date()}
          className="bg-gm-surface-2"
        />
      </PopoverContent>
    </Popover>
  );
}
