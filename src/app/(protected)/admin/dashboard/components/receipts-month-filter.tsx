'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/es';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('es');

const MONTH_OPTIONS_COUNT = 12;

export function ReceiptsMonthFilter({ month }: { month: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const options = Array.from({ length: MONTH_OPTIONS_COUNT }, (_, i) => {
    const d = dayjs().tz('America/Argentina/Buenos_Aires').startOf('month').subtract(i, 'month');
    return { value: d.format('YYYY-MM'), label: d.format('MMMM YYYY') };
  });

  const onChange = (nextMonth: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('receiptsMonth', nextMonth);
    router.push(`?${params.toString()}`);
  };

  return (
    <Select value={month} onValueChange={onChange}>
      <SelectTrigger className="h-7 w-auto gap-1.5 border-border bg-transparent px-2.5 text-[11px] font-mono capitalize">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-[13px] capitalize">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
