'use client';

import { Button } from '@/components/ui/button';

export function CompactPagination({ page, total, pageSize, onChange }: {
  page: number; total: number; pageSize: number; onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return <nav aria-label="Páginas de la lista" className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
    <p aria-live="polite" className="text-xs text-muted-foreground">{page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} de {total}</p>
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" className="min-h-9 px-2 text-xs" disabled={page === 0} onClick={() => onChange(page - 1)}>Anterior</Button>
      <span className="text-xs tabular-nums">{page + 1}/{pages}</span>
      <Button type="button" variant="outline" size="sm" className="min-h-9 px-2 text-xs" disabled={page >= pages - 1} onClick={() => onChange(page + 1)}>Siguiente</Button>
    </div>
  </nav>;
}
