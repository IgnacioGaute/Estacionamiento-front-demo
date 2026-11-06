import { Check, Loader2 } from 'lucide-react';

interface FormSuccessProps {
  message?: string;
  // Segunda línea, más tenue: qué pasa ahora (por ejemplo, que se está abriendo el sistema).
  detail?: string;
  // Indicador girando mientras la pantalla siguiente todavía carga, para que no parezca trabado.
  pending?: boolean;
}

export function FormSuccess({ message, detail, pending }: FormSuccessProps) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-[14px] border border-gm-ok/25 bg-gm-ok/[0.07] py-2.5 pl-2.5 pr-3.5 animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gm-ok/15 text-gm-ok">
        <Check className="size-[18px]" strokeWidth={3} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-gm-ok">{message}</span>
        {detail && <span className="block text-[13px] text-muted-foreground">{detail}</span>}
      </span>
      {pending && <Loader2 className="size-[18px] shrink-0 animate-spin text-gm-ok/80" aria-hidden />}
    </div>
  );
}
