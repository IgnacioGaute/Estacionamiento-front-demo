'use client';

import Link from 'next/link';
import { CircleSlash } from 'lucide-react';
import { useTenant } from '@/components/tenant-provider';

// Secciones de dinero (tarifas, inquilinos, clientes mensuales, gastos, MercadoPago): en una playa
// gratuita no existen. Se reemplaza la pantalla por una explicación en vez de mostrar formularios
// que el backend rechazaría. La modalidad la define la plataforma; no se cambia desde acá.
export function SoloConCobro({ children, seccion }: { children: React.ReactNode; seccion: string }) {
  const { cobroHabilitado } = useTenant();
  if (cobroHabilitado) return <>{children}</>;
  return <ModalidadGratuitaAviso seccion={seccion} />;
}

export function ModalidadGratuitaAviso({ seccion }: { seccion: string }) {
  return (
    <div className="container mx-auto max-w-xl px-4 py-10">
      <div className="rounded-[22px] border border-border bg-card p-6 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-gm-yellow/10 text-gm-yellow">
          <CircleSlash className="size-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-bold">{seccion} no está disponible</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Esta playa funciona en modalidad gratuita: registra entradas y salidas de vehículos sin
          tarifas, cobros ni caja. La modalidad la define la plataforma; si necesitás cobrar,
          pedí el cambio a soporte.
        </p>
        <Link
          href="/tickets"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-gm-yellow px-5 text-sm font-bold text-gm-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Ir a Entradas y salidas
        </Link>
      </div>
    </div>
  );
}
