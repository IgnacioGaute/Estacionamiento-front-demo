import { AppIcon } from '@/components/brand/logo';

interface HeaderProps {
  title?: string;
  label?: string;
}

// Ícono de la app, título y una línea de ayuda, como en «Elegí dónde entrar». Antes iba el logotipo
// partido «ESTACI|ONAMIENTO» en dos tamaños y con texto en degradé.
export function Header({ title, label }: HeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-1.5">
      <AppIcon className="mb-4 size-10" />
      {title && <h1 className="m-0 text-2xl font-semibold tracking-[-0.02em]">{title}</h1>}
      {label ? <p className="text-sm text-muted-foreground">{label}</p> : null}
    </header>
  );
}
