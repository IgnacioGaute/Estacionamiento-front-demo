import { cn } from '@/lib/utils';

interface PageHeaderProps {
  breadcrumb?: string[];
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  breadcrumb,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-end md:justify-between',
        className
      )}
    >
      <div className="min-w-0">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav
            aria-label="breadcrumb"
            className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground"
          >
            {breadcrumb.map((b, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                {b}
                {i < breadcrumb.length - 1 && <span className="opacity-50">/</span>}
              </span>
            ))}
          </nav>
        )}
        <h1 className="gm-display mt-1 text-[26px] font-bold leading-tight tracking-[0.01em] text-foreground md:text-[30px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-[13.5px] text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      )}
    </header>
  );
}
