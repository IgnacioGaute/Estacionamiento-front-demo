'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DateRange } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { AppCalendarDialog, appCalendarClassNames } from '@/components/app-date-picker';

dayjs.extend(utc);
dayjs.extend(timezone);

interface DateRangePickerProps {
  from: string;
  to: string;
}

export function DashboardDateRangePicker({ from, to }: DateRangePickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>({
    from: dayjs(from).toDate(),
    to: dayjs(to).toDate(),
  });

  const apply = (nextRange: DateRange | undefined) => {
    setRange(nextRange);
    if (!nextRange?.from || !nextRange?.to) return;

    const nextFrom = dayjs(nextRange.from).tz('America/Argentina/Buenos_Aires').format('YYYY-MM-DD');
    const nextTo = dayjs(nextRange.to).tz('America/Argentina/Buenos_Aires').format('YYYY-MM-DD');

    const params = new URLSearchParams(searchParams.toString());
    params.set('from', nextFrom);
    params.set('to', nextTo);
    router.push(`?${params.toString()}`);
    setOpen(false);
  };

  return (
    <AppCalendarDialog open={open} onOpenChange={setOpen} title="Período del panel" trigger={
        <Button variant="outline" className="gm-mono gm-tnum">
          <CalendarIcon className="size-4" />
          {dayjs(from).format('DD/MM/YYYY')} – {dayjs(to).format('DD/MM/YYYY')}
        </Button>
      } footer={<span className="text-xs text-muted-foreground">Elegí el inicio y el final del período</span>}>
        <Calendar
          mode="range"
          locale={es}
          selected={range}
          onSelect={apply}
          defaultMonth={range?.from}
          numberOfMonths={1}
          disabled={(day) => day > new Date()}
          className="p-3"
          classNames={appCalendarClassNames}
        />
    </AppCalendarDialog>
  );
}
