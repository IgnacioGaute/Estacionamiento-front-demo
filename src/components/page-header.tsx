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
        {/* Dónde estás, en texto de 12 px y sin mayúsculas espaciadas: eran 10,5 px dentro de un
            <nav> sin enlaces, que se leía como un menú que no navegaba. */}
        {breadcrumb && breadcrumb.length > 0 && (
          <p className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {breadcrumb.map((b, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                {b}
                {i < breadcrumb.length - 1 && <span aria-hidden className="opacity-50">/</span>}
              </span>
            ))}
          </p>
        )}
        <h1 className="gm-display mt-1 text-[26px] font-bold leading-tight tracking-[0.01em] text-foreground md:text-[30px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-[14px] text-muted-foreground">
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
