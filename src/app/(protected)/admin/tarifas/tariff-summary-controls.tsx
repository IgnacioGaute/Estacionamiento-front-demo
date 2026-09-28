'use client';

import { useId } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';

// Adapted from Amicro: A / B Segmented Tabs and Light / Dark Mode Toggle.
// https://amicro.vercel.app/Anime — controlled values, vehicle labels and keyboard support.
export function VehicleTariffTabs({ vehicles, value, onChange, panelId, label = 'Tipo de vehículo de las tarifas vigentes' }: {
  vehicles: { code: string; name: string }[]; value: string; onChange: (code: string) => void; panelId: string; label?: string;
}) {
  const layoutId = useId();
  const reduce = useReducedMotion();
  return <div className="min-w-0 max-w-full overflow-x-auto pb-1">
    <LayoutGroup id={layoutId}>
      <div role="tablist" aria-label={label} className="relative inline-flex min-w-max items-center gap-1 rounded-2xl border border-neutral-700/60 bg-neutral-950/40 p-1.5 shadow-inner">
        {vehicles.map((vehicle, index) => {
          const active = value === vehicle.code;
          return <button key={vehicle.code} id={panelId + '-tab-' + vehicle.code} type="button" role="tab" aria-selected={active} aria-controls={panelId} tabIndex={active ? 0 : -1}
            onClick={() => onChange(vehicle.code)} onKeyDown={event => {
              const next = event.key === 'ArrowRight' ? (index + 1) % vehicles.length : event.key === 'ArrowLeft' ? (index - 1 + vehicles.length) % vehicles.length : event.key === 'Home' ? 0 : event.key === 'End' ? vehicles.length - 1 : -1;
              if (next < 0) return;
              event.preventDefault(); onChange(vehicles[next].code);
              const target = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next];
              target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }} className={'relative min-h-11 shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background ' + (active ? 'text-neutral-950' : 'text-muted-foreground hover:text-foreground')}>
            {active && <motion.span layoutId="vehicle-pill" transition={reduce ? { duration: 0 } : { type: 'spring', bounce: 0.2, duration: 0.4 }} className="absolute inset-0 rounded-xl bg-neutral-200 shadow-md" />}
            <span className="relative z-10">{vehicle.name}</span>
          </button>;
        })}
      </div>
    </LayoutGroup>
  </div>;
}

export function TariffDayNightToggle({ value, onChange, description, panelId }: {
  value: 'DAY' | 'NIGHT'; onChange: (value: 'DAY' | 'NIGHT') => void; description: string; panelId: string;
}) {
  const night = value === 'NIGHT';
  const reduce = useReducedMotion();
  return <div className="flex shrink-0 items-center gap-3">
    <motion.button type="button" role="switch" aria-label="Mostrar tarifas de noche" aria-checked={night} aria-controls={panelId}
      title={night ? 'Ver precios de día' : 'Ver precios de noche'} whileTap={reduce ? undefined : { scale: 0.9 }} onClick={() => onChange(night ? 'DAY' : 'NIGHT')}
      className={'relative flex size-14 shrink-0 items-center justify-center rounded-2xl border-2 shadow-md outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none ' + (night ? 'border-indigo-400/70 bg-indigo-950/80 shadow-[0_0_24px_-8px_rgba(129,140,248,0.5)]' : 'border-amber-300 bg-amber-50/90 shadow-[0_0_24px_-8px_rgba(251,191,36,0.5)]')}>
      <motion.span initial={false} animate={{ rotate: night ? 180 : 0 }} transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 200, damping: 12 }} className="relative flex size-6 items-center justify-center">
        <AnimatePresence initial={false} mode="wait">
          <motion.span key={value} initial={reduce ? false : { opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={reduce ? undefined : { opacity: 0, scale: 0.6 }} transition={{ duration: reduce ? 0 : 0.12 }} className="absolute inset-0">
            {night ? <Moon className="size-6 text-indigo-300 drop-shadow-[0_0_8px_rgba(165,180,252,0.5)]" aria-hidden="true" /> : <Sun className="size-6 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" aria-hidden="true" />}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </motion.button>
    <div className="space-y-0.5"><p className={'text-sm font-bold ' + (night ? 'text-indigo-300' : 'text-amber-300')}>{night ? 'Viendo noche' : 'Viendo día'}</p><p className="text-xs text-muted-foreground">{description}</p><p className="text-xs text-muted-foreground">{night ? 'Tocá la luna para ver día' : 'Tocá el sol para ver noche'}</p></div>
  </div>;
}
