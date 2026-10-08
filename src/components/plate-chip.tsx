import { cn } from '@/lib/utils';

// La patente dibujada como chapa (blanca, franja azul): en listas y resúmenes el operador la
// reconoce de un vistazo, igual que en el auto. Con `highlight` marca la parte que coincide con
// lo que se escribió en el buscador.
const TAMANIOS = {
  xs: { caja: 'min-w-[78px] rounded-[5px] border', franja: 'h-1', texto: 'px-1.5 pb-0.5 text-[12.5px]' },
  sm: { caja: 'min-w-[96px] rounded-[6px] border-[1.5px]', franja: 'h-1.5', texto: 'px-2 pb-1 pt-0.5 text-[15px]' },
  md: { caja: 'min-w-[124px] rounded-[7px] border-2', franja: 'h-2', texto: 'px-2.5 pb-1 pt-0.5 text-[19px]' },
  lg: { caja: 'min-w-[156px] rounded-[8px] border-2', franja: 'h-[9px]', texto: 'px-3 pb-1.5 pt-0.5 text-[24px]' },
} as const;

const normalizar = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

export function PlateChip({
  plate,
  size = 'md',
  highlight,
  className,
}: {
  plate: string;
  size?: keyof typeof TAMANIOS;
  highlight?: string;
  className?: string;
}) {
  const t = TAMANIOS[size];
  const buscado = highlight ? normalizar(highlight) : '';
  const desde = buscado ? plate.toUpperCase().indexOf(buscado) : -1;
  return (
    <span className={cn('inline-flex shrink-0 flex-col overflow-hidden border-[#0E0E0E] bg-[#F4F2EC]', t.caja, className)}>
      <span className={cn('block bg-[#1E4FA8]', t.franja)} aria-hidden />
      <span className={cn('gm-mono block whitespace-nowrap text-center font-bold uppercase leading-tight tracking-[0.05em] text-[#111]', t.texto)}>
        {desde >= 0 ? (
          // El resaltado es solo visual: un lector de pantalla leería la patente partida en dos.
          <>
            <span className="sr-only">{plate}</span>
            <span aria-hidden>
              {plate.slice(0, desde)}
              <mark className="rounded-[2px] bg-gm-yellow text-inherit">{plate.slice(desde, desde + buscado.length)}</mark>
              {plate.slice(desde + buscado.length)}
            </span>
          </>
        ) : (
          plate
        )}
      </span>
    </span>
  );
}
