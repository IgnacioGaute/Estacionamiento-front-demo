'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Segmento } from '@/components/ui/segmento';
import { Moon, Sun } from 'lucide-react';

// Las pestañas de tipo de vehículo: el Rubber Segment de toda la app (ui/segmento). `panelId` queda
// por compatibilidad con quien lo usa.
export function VehicleTariffTabs({ vehicles, value, onChange, label = 'Tipo de vehículo de las tarifas vigentes' }: {
  vehicles: { code: string; name: string }[]; value: string; onChange: (code: string) => void; panelId: string; label?: string;
}) {
  return <Segmento aria-label={label} size="lg" value={value} onChange={onChange}
    items={vehicles.map((vehicle) => ({ value: vehicle.code, label: vehicle.name }))} />;
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
