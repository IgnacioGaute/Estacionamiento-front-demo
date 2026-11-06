'use client';

import { BackButton } from './back-button';
import { Header } from './header';

interface CardWrapperProps {
  children?: React.ReactNode;
  title?: string;
  headerLabel?: string;
  backButtonLabel?: string;
  backButtonHref?: string;
}

// El mismo marco que «Elegí dónde entrar» y la pantalla de error: las pantallas de acceso eran
// cuatro lenguajes distintos. Ancho fluido: con 420 px fijos la tarjeta se cortaba en un celular.
export function CardWrapper({
  children,
  title,
  headerLabel,
  backButtonLabel,
  backButtonHref,
}: CardWrapperProps) {
  return (
    <section className="w-full min-w-0 max-w-md rounded-2xl border border-white/[0.07] bg-[#0E0D0B] p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] sm:p-8">
      <Header title={title} label={headerLabel} />
      {children}
      {backButtonHref && backButtonLabel && (
        <div className="flex justify-center pt-5">
          <BackButton label={backButtonLabel} backButtonHref={backButtonHref} />
        </div>
      )}
    </section>
  );
}
