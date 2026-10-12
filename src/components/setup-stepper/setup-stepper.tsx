'use client';

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { Check } from 'lucide-react';
import Stepper from '@/components/ui/stepper/Stepper';
import { cn } from '@/lib/utils';
import './setup-stepper.css';

export { Step } from '@/components/ui/stepper/Stepper';

// Los asistentes de configuración (Tarifas, Mercado Pago, Turnos de caja) usan el Stepper de React
// Bits tal cual; acá sólo se le pasan los colores del sistema por sus variables de tema y un
// indicador con el estado de cada paso.
const TEMA = {
  '--stepper-frame': 'hsl(var(--gm-surface))',
  '--stepper-frame-edge': 'hsl(var(--gm-line))',
  '--stepper-frame-highlight': 'hsl(0 0% 100% / 0.03)',
  '--stepper-frame-shadow': '0 24px 50px -24px rgb(0 0 0 / 0.9)',
  '--stepper-tile': 'linear-gradient(180deg, hsl(var(--gm-surface-3)) 0%, hsl(var(--gm-surface-2)) 100%)',
  '--stepper-tile-edge': 'hsl(var(--gm-line-strong))',
  '--stepper-tile-highlight': 'hsl(0 0% 100% / 0.05)',
  '--stepper-tile-shadow': '0 8px 16px -10px rgb(0 0 0 / 0.9)',
  '--stepper-well': 'hsl(var(--background))',
  '--stepper-track': 'hsl(var(--gm-line))',
  '--stepper-ink': 'hsl(var(--foreground))',
  '--stepper-muted': 'hsl(var(--muted-foreground))',
  '--stepper-faint': 'hsl(var(--gm-line-strong))',
  '--stepper-ring': 'hsl(var(--gm-yellow) / 0.5)',
  '--stepper-solid': 'hsl(var(--gm-yellow))',
  '--stepper-solid-ink': 'hsl(var(--gm-ink))',
  '--stepper-hover-fill': 'hsl(0 0% 100% / 0.03)',
} as CSSProperties & Record<`--${string}`, string>;

export type StepStatus = 'complete' | 'active' | 'upcoming';
export const STEP_STATES: Record<StepStatus, string> = { complete: 'Listo', active: 'En curso', upcoming: 'Pendiente' };

export function SetupStepper({ titles, step, onStepChange, onComplete, completeLabel, nextLabel = 'Continuar', nextDisabled, locked, disabled, stateLabel, backButtonProps, nextButtonProps, className, children }: {
  titles: string[];
  step: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  completeLabel: ReactNode;
  nextLabel?: ReactNode;
  nextDisabled?: boolean;
  // Pasos a los que todavía no se puede saltar (por ejemplo, sin la cuenta vinculada).
  locked?: (step: number) => boolean;
  disabled?: boolean;
  // Reemplaza el texto de estado de un paso («En curso · 1/2»).
  stateLabel?: (step: number, status: StepStatus) => string | undefined;
  backButtonProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  nextButtonProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  className?: string;
  children: ReactNode;
}) {
  return <Stepper
    className={cn('setup-stepper', titles.length > 3 && 'setup-stepper--compact', className)}
    step={step}
    onStepChange={onStepChange}
    onFinalStepCompleted={onComplete}
    width="100%"
    radius={22}
    style={TEMA}
    backButtonText="Atrás"
    nextButtonText={nextLabel}
    completeButtonText={completeLabel}
    backButtonProps={{ disabled, ...backButtonProps, className: 'setup-stepper__back' }}
    nextButtonProps={{ ...nextButtonProps, disabled: disabled || nextDisabled, className: 'setup-stepper__next' }}
    renderStepIndicator={({ step: number, currentStep, onStepClick }) => {
      const status: StepStatus = number < currentStep ? 'complete' : number === currentStep ? 'active' : 'upcoming';
      const state = stateLabel?.(number, status) ?? STEP_STATES[status];
      const blocked = !!locked?.(number);
      return <button type="button" onClick={() => onStepClick(number)} disabled={disabled || number === currentStep || blocked} aria-current={status === 'active' ? 'step' : undefined} aria-label={`Paso ${number}: ${titles[number - 1]} · ${state}`} className="setup-stepper__indicator" data-status={status}>
        <span className="setup-stepper__badge" data-status={status}>{status === 'complete' ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : number}</span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="setup-stepper__title" data-status={status}>{titles[number - 1]}</span>
          <span className="setup-stepper__state" data-status={status}>{state}</span>
        </span>
        <span aria-hidden className="setup-stepper__bar" data-status={status} />
      </button>;
    }}
  >{children}</Stepper>;
}

export function SetupStepHeading({ number, total, title, optional, children }: { number: number; total: number; title: string; optional?: boolean; children?: ReactNode }) {
  return <div>
    <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gm-yellow">Paso {number} de {total}{optional && <span className="rounded-full border border-gm-line-strong px-2 py-px text-[10px] tracking-[0.08em] text-muted-foreground">Opcional</span>}</p>
    <h3 className="mt-1.5 text-lg font-semibold">{title}</h3>
    {children && <p className="mt-1 text-sm text-muted-foreground">{children}</p>}
  </div>;
}
