import { cn } from '@/lib/utils';

interface GarageMitreLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  withTagline?: boolean;
  stacked?: boolean;
  className?: string;
}

export function GarageMitreLogo({
  size = 'md',
  withTagline = false,
  stacked = false,
  className,
}: GarageMitreLogoProps) {
  const dims = {
    sm: { garage: 'text-[14px]', mitre: 'text-[14px]', sub: 'text-[9px]'  },
    md: { garage: 'text-[20px]', mitre: 'text-[18px]', sub: 'text-[10px]' },
    lg: { garage: 'text-[36px]', mitre: 'text-[32px]', sub: 'text-[12px]' },
    xl: { garage: 'text-[64px]', mitre: 'text-[56px]', sub: 'text-[14px]' },
  }[size];

  return (
    <div
      className={cn(
        'inline-flex',
        stacked ? 'flex-col items-start gap-1' : 'items-baseline gap-0',
        className
      )}
    >
      <span className={cn('gm-display font-bold text-foreground', dims.garage)}>ESTACI</span>
      <div className="flex flex-col leading-none">
        <span className={cn('gm-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-gm-yellow to-gm-orange whitespace-nowrap', dims.mitre)}>
          ONAMIENTO
        </span>
      </div>
    </div>
  );
}

export function ParkingMark({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const px = { sm: 20, md: 28, lg: 40 }[size];

  return (
    <svg
      width={px}
      height={(px * 72) / 84}
      viewBox="0 0 84 72"
      fill="none"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="parking-mark-grad" x1="0" y1="0" x2="84" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="hsl(var(--gm-yellow))" />
          <stop offset="1" stopColor="hsl(var(--gm-orange))" />
        </linearGradient>
      </defs>
      <path
        d="M4 68 V10 L26 40 L42 8 L58 40 L80 10 V68"
        stroke="url(#parking-mark-grad)"
        strokeWidth={10}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// El ícono de la app entero: fondo, M y la franja de obra al pie. Es el mismo dibujo que
// src/app/icon.svg y los PNG de public/ (pestaña, teléfono, pantalla de inicio): si se cambia acá,
// se cambia allá también, para que la barra, la pantalla de carga y la pestaña sean iguales.
export function AppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      <defs>
        <clipPath id="app-icon-forma">
          <rect width="64" height="64" rx="14" />
        </clipPath>
        <linearGradient id="app-icon-m" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="hsl(46 92% 53%)" />
          <stop offset="1" stopColor="hsl(14 80% 51%)" />
        </linearGradient>
        <pattern id="app-icon-franja" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="16" fill="hsl(46 92% 53%)" />
        </pattern>
      </defs>
      <g clipPath="url(#app-icon-forma)">
        <rect width="64" height="64" fill="hsl(30 78% 7%)" />
        <path
          d="M10 50 V20 L23 38 L32 16 L41 38 L54 20 V50"
          stroke="url(#app-icon-m)"
          strokeWidth={8}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <rect y="57.6" width="64" height="6.4" fill="url(#app-icon-franja)" />
      </g>
    </svg>
  );
}

export function GarageMitreMonogram({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const cls =
    size === 'sm'
      ? 'text-[13px] px-2 py-[4px]'
      : size === 'lg'
      ? 'text-[28px] px-3 py-[8px]'
      : 'text-[18px] px-[10px] py-[5px]';
  return <span className={cn('gm-plate font-display', cls, className)}>GM</span>;
}
