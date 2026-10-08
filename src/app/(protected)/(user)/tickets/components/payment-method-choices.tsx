'use client';

import { ArrowLeftRight, Banknote, Check, Landmark, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MedioCobro = 'CASH' | 'QR' | 'ALIAS' | 'TRANSFER';
const medios = [
  { id: 'CASH', titulo: 'Efectivo', ayuda: 'Contalo antes de confirmar', Icon: Banknote, verificado: false },
  { id: 'QR', titulo: 'QR / celular', ayuda: 'Se acredita solo', Icon: QrCode, verificado: true },
  { id: 'ALIAS', titulo: 'Al alias', ayuda: 'Se detecta sola', Icon: ArrowLeftRight, verificado: true },
  { id: 'TRANSFER', titulo: 'Transferencia', ayuda: 'Verificala antes de confirmar', Icon: Landmark, verificado: false },
] as const;

export function PaymentMethodChoices({ value, onChange, aliasDisponible, disabled }: {
  value: MedioCobro | null;
  onChange: (medio: MedioCobro) => void;
  aliasDisponible: boolean;
  disabled?: boolean;
}) {
  const disponibles = medios.filter(m => m.id !== 'ALIAS' || aliasDisponible);
  return <div className="grid grid-cols-2 gap-2.5 short:gap-2">
    {disponibles.map(({ id, titulo, ayuda, Icon, verificado }, index) => {
      const elegido = value === id;
      return <button key={id} type="button" aria-pressed={elegido} disabled={disabled} onClick={() => onChange(id)}
        className={cn('relative flex min-h-[66px] flex-col items-start justify-center gap-1 rounded-2xl border-[1.5px] px-3.5 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-50 short:min-h-[54px] short:py-2', elegido ? 'border-gm-yellow bg-gm-yellow/[0.12] shadow-[inset_0_0_0_1px_hsl(var(--gm-yellow))]' : 'border-gm-line-strong bg-gm-surface-2 hover:border-gm-yellow/40', disponibles.length % 2 === 1 && index === disponibles.length - 1 && 'col-span-2')}>
        <span className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          {elegido ? <span className="grid size-5 shrink-0 place-items-center rounded-full bg-gm-yellow text-gm-ink" aria-hidden><Check className="size-3.5" strokeWidth={3} /></span> : <Icon className={cn('size-5 shrink-0', verificado ? 'text-gm-yellow' : 'text-muted-foreground')} aria-hidden />}
          <span className="gm-display min-w-0 text-[13px] leading-tight tracking-[0.03em] sm:text-[15px]">{titulo}</span>
        </span>
        <span className={cn('text-[11.5px] leading-tight text-muted-foreground', value && 'short:hidden')}>{ayuda}</span>
      </button>;
    })}
  </div>;
}
