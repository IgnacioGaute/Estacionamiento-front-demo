interface MonoTooltipProps {
  active?: boolean;
  payload?: { value: number; name?: string; dataKey?: string; color?: string; fill?: string }[];
  label?: string;
  indicator?: 'dot' | 'line';
  formatter?: (value: number, name: string) => React.ReactNode;
}

export function MonoTooltip({ active, payload, label, indicator = 'dot', formatter }: MonoTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="pointer-events-none z-50 rounded-xl border border-border bg-gm-surface-2/90 px-3 py-2 text-xs shadow-2xl backdrop-blur-md">
      {label && (
        <div className="mb-1.5 border-b border-border pb-1 font-medium tracking-tight text-muted-foreground">
          {label}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((item, idx) => {
          const color = item.color || item.fill || 'hsl(var(--gm-yellow))';
          const name = item.name || item.dataKey || '';
          const valueDisplay = formatter ? formatter(item.value, name) : item.value.toLocaleString();
          return (
            <div key={idx} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {indicator === 'dot' ? (
                  <span className="size-2 rounded-full ring-1 ring-white/20" style={{ backgroundColor: color }} />
                ) : (
                  <span className="h-0.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                )}
                <span className="font-normal text-muted-foreground">{name}:</span>
              </div>
              <span className="gm-tnum font-semibold">{valueDisplay}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
