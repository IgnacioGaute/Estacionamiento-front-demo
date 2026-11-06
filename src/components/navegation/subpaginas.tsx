'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// Las páginas de una sección (Caja, Configuración) a mano dentro de la página. Con la barra
// lateral plegada sólo se ve el ícono de la sección y en el celular la barra es un panel
// aparte: sin esta fila no había cómo pasar de Turnos a Ingresos y gastos sin abrirla.
export function Subpaginas({ items, seccion }: { items?: { label: string; url: string }[]; seccion: string }) {
  const pathname = usePathname();
  if (!items || items.length < 2) return null;
  return (
    <nav aria-label={`Páginas de ${seccion}`} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1.5">
        {items.map((item) => {
          const actual = pathname === item.url || pathname.startsWith(item.url + '/');
          return (
            <li key={item.url}>
              <Link
                href={item.url}
                aria-current={actual ? 'page' : undefined}
                className={cn(
                  'inline-flex h-11 items-center whitespace-nowrap rounded-lg px-3.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow sm:h-9',
                  actual
                    ? 'bg-gm-yellow/[0.12] text-gm-yellow ring-1 ring-inset ring-gm-yellow/25'
                    : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground',
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
