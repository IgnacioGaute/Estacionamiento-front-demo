'use client';

import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp, Clock3, Moon, Sun, type LucideIcon } from 'lucide-react';

type Option = { value: string; label: string; description?: string; icon?: LucideIcon };
export const tariffScheduleOptions: Option[] = [
  { value: 'ANY', label: 'Todo el día', description: 'Precio general, sin distinguir horarios.', icon: Clock3 },
  { value: 'DAY', label: 'Sólo de día', description: 'Durante el horario diurno que configuraste.', icon: Sun },
  { value: 'NIGHT', label: 'Sólo de noche', description: 'Fuera del horario diurno.', icon: Moon },
];

export function TariffSelect({ value, onValueChange, options, name, disabled, compact = false, placeholder = 'Elegir una opción' }: {
  value: string; onValueChange: (value: string) => void; options: Option[]; name: string; disabled?: boolean; compact?: boolean; placeholder?: string;
}) {
  const selected = options.find(option => option.value === value);
  const Icon = selected?.icon;
  return <Select.Root value={value} onValueChange={onValueChange} disabled={disabled}>
    <Select.Trigger aria-label={name} title={selected?.label} className="group flex h-11 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-gm-surface-3 px-3 text-left text-base text-foreground shadow-sm outline-none transition-colors hover:border-amber-500/40 focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/20 data-[state=open]:border-amber-500 data-[state=open]:bg-amber-500/5 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm">
      {Icon && <Icon className="size-4 shrink-0 text-amber-500/80" aria-hidden="true" />}
      <span className="min-w-0 flex-1 truncate"><Select.Value placeholder={placeholder}>{selected?.label}</Select.Value></span>
      <Select.Icon asChild><ChevronDown aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" /></Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content position="popper" align="start" sideOffset={6} collisionPadding={12} className={'z-[70] max-h-[min(360px,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-input bg-popover text-popover-foreground shadow-[0_12px_40px_-8px_rgba(0,0,0,0.55)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 ' + (compact ? 'min-w-[140px]' : 'min-w-[min(280px,calc(100vw-24px))]')}>
        <Select.ScrollUpButton className="flex justify-center bg-muted/40 py-1.5"><ChevronUp className="size-4" /></Select.ScrollUpButton>
        <Select.Viewport className="space-y-1 p-1.5">
          {options.map(option => {
            const OptionIcon = option.icon;
            return <Select.Item key={option.value} value={option.value} textValue={option.label} className="group relative flex min-h-10 cursor-pointer select-none items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 pr-9 outline-none transition-colors data-[state=checked]:border-amber-500/20 data-[state=checked]:bg-amber-500/10 data-[highlighted]:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
              {OptionIcon && <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-data-[state=checked]:bg-amber-500/15 group-data-[state=checked]:text-amber-500"><OptionIcon className="size-4" aria-hidden="true" /></span>}
              <span className="min-w-0"><Select.ItemText><span className="text-sm font-medium group-data-[state=checked]:text-amber-500">{option.label}</span></Select.ItemText>{option.description && <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{option.description}</span>}</span>
              <Select.ItemIndicator className="absolute right-3 text-amber-500"><Check className="size-4" aria-hidden="true" /></Select.ItemIndicator>
            </Select.Item>;
          })}
        </Select.Viewport>
        <Select.ScrollDownButton className="flex justify-center bg-muted/40 py-1.5"><ChevronDown className="size-4" /></Select.ScrollDownButton>
      </Select.Content>
    </Select.Portal>
  </Select.Root>;
}
