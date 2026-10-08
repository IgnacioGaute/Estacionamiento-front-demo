import { AlertTriangle } from 'lucide-react';

interface FormErrorProps {
  message?: string;
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-[14px] border border-destructive/35 bg-destructive/[0.08] py-2.5 pl-2.5 pr-3.5 animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-destructive/15 text-[#F08775]">
        <AlertTriangle className="size-[17px]" strokeWidth={2.4} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-sm font-semibold text-[#F5A497]">{message}</span>
    </div>
  );
}
