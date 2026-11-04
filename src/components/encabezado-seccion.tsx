import type { ReactNode } from 'react';

// El título de cada opción dentro de una sección con menú propio (Configuración, Caja): el título
// grande de la sección ya está arriba, en su layout.
export function EncabezadoSeccion({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </header>
  );
}
