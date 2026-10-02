'use client';

import { useState, type ReactElement, type ReactNode } from 'react';
import * as DateDialog from '@radix-ui/react-dialog';
import { es } from 'date-fns/locale';
import dayjs from 'dayjs';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';

export const appCalendarClassNames = {
  months: 'w-full', month: 'w-full space-y-1',
  caption: 'relative flex h-8 items-center justify-center',
  caption_label: 'text-sm font-semibold capitalize',
  nav_button: 'inline-flex size-8 items-center justify-center rounded-lg border border-border bg-secondary/30 text-foreground transition-colors hover:bg-gm-yellow/15 hover:text-gm-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-30',
  table: 'w-full border-collapse', head_row: 'grid grid-cols-7',
  head_cell: 'py-2 text-center text-[11px] font-semibold uppercase text-muted-foreground',
  row: 'grid grid-cols-7', cell: 'relative p-0 text-center',
  day: 'mx-auto flex h-[clamp(20px,calc((100dvh-180px)/6),36px)] w-9 items-center justify-center rounded-xl text-sm tabular-nums transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow',
  day_selected: '!bg-gm-yellow !text-gm-ink font-bold shadow-sm',
  day_today: 'font-bold text-gm-yellow ring-1 ring-inset ring-gm-yellow/40',
  day_outside: 'text-muted-foreground/40', day_disabled: 'pointer-events-none opacity-25',
};

export function AppCalendarDialog({ open, onOpenChange, title, trigger, children, footer }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  trigger: ReactElement;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return <DateDialog.Root open={open} onOpenChange={onOpenChange}>
    <DateDialog.Trigger asChild>{trigger}</DateDialog.Trigger>
    <DateDialog.Portal>
      <DateDialog.Overlay className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" />
      <DateDialog.Content aria-describedby={undefined} className="fixed left-1/2 top-1/2 z-[71] w-[292px] max-w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl focus:outline-none">
        <div className="flex items-center justify-between border-b border-border px-4 py-2"><DateDialog.Title className="text-sm font-semibold">{title}</DateDialog.Title><DateDialog.Close className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-secondary focus-visible:ring-2 focus-visible:ring-gm-yellow">Cerrar</DateDialog.Close></div>
        {children}
        {footer && <div className="flex items-center justify-between border-t border-border bg-secondary/20 px-4 py-2">{footer}</div>}
      </DateDialog.Content>
    </DateDialog.Portal>
  </DateDialog.Root>;
}

export function AppDatePicker({ value, onChange, title, trigger, min, max, clearable = false }: {
  value: string;
  onChange: (value: string) => void;
  title: string;
  trigger: ReactElement;
  min?: string;
  max?: string;
  clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? dayjs(value).toDate() : undefined;
  const today = dayjs().format('YYYY-MM-DD');
  return <AppCalendarDialog open={open} onOpenChange={setOpen} title={title} trigger={trigger} footer={<>
    {clearable ? <Button type="button" size="sm" variant="ghost" onClick={() => { onChange(''); setOpen(false); }}>Borrar fecha</Button> : <span className="text-xs text-muted-foreground">Elegí una fecha</span>}
    {(!max || today <= max) && <Button type="button" size="sm" variant="ghost" className="text-gm-yellow" onClick={() => { onChange(today); setOpen(false); }}>Ir a hoy</Button>}
  </>}>
    <Calendar key={value || 'sin-fecha'} mode="single" locale={es} weekStartsOn={1} initialFocus selected={selected} defaultMonth={selected ?? new Date()}
      fromMonth={min ? dayjs(min).startOf('month').toDate() : undefined} toMonth={max ? dayjs(max).endOf('month').toDate() : undefined}
      disabled={day => (min ? dayjs(day).format('YYYY-MM-DD') < min : false) || (max ? dayjs(day).format('YYYY-MM-DD') > max : false)}
      onSelect={date => { if (date) { onChange(dayjs(date).format('YYYY-MM-DD')); setOpen(false); } }} className="p-3" classNames={appCalendarClassNames} />
  </AppCalendarDialog>;
}
