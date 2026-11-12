'use client';

// Lo que se ve en vez de la aplicación cuando no se puede confirmar el acceso. Distingue una falla
// de comunicación (la sesión sigue abierta y se reintenta sola) de un rechazo real (sin empresa
// activa, sesión que ya no vale). Una falla temporal nunca se presenta como «sin asignación» ni
// deja Cerrar sesión como única salida.

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut, RefreshCw } from 'lucide-react';
import { logoutAction } from '@/actions/auth/logout.action';
import { AppIcon } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { useReintentoAutomatico } from '@/hooks/use-reintento-automatico';

export type MotivoEstadoDeAcceso = 'sesion-pendiente' | 'contexto-no-disponible' | 'sin-empresa' | 'sesion-invalida';

const TEXTOS: Record<MotivoEstadoDeAcceso, { titulo: string; detalle: string }> = {
  'sesion-pendiente': {
    titulo: 'No pudimos validar tu sesión',
    detalle: 'El servidor no respondió. Tu sesión sigue abierta, pero hasta confirmarla no se pueden registrar entradas, salidas ni cobros.',
  },
  'contexto-no-disponible': {
    titulo: 'No pudimos cargar tu empresa y tus playas',
    detalle: 'Es un problema de comunicación con el servidor, no un cambio en tus permisos. Tu sesión sigue abierta.',
  },
  'sin-empresa': {
    titulo: 'Tu cuenta no tiene una empresa activa',
    detalle: 'Pedile al administrador de la empresa que revise tu acceso. Cuando lo resuelva, comprobalo de nuevo desde acá.',
  },
  'sesion-invalida': {
    titulo: 'Tu sesión ya no es válida',
    detalle: 'Puede que hayan cambiado tu contraseña o tu acceso. Iniciá sesión de nuevo para seguir.',
  },
};

const hora = (ms: number) =>
  new Date(ms).toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });

export function EstadoDeAcceso({
  motivo,
  mensaje,
  intento,
  reintentarEnMs = null,
}: {
  motivo: MotivoEstadoDeAcceso;
  // Mensaje del backend para un rechazo de negocio (sin empresa). No se usa para fallas temporales.
  mensaje?: string;
  // Cambia en cada render del servidor: así se cuenta cada intento fallido.
  intento: string;
  reintentarEnMs?: number | null;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [fallos, setFallos] = useState(0);
  const [ultimoIntento, setUltimoIntento] = useState<number | null>(null);
  const [online, setOnline] = useState(true);
  const titulo = useRef<HTMLHeadingElement>(null);
  const temporal = motivo === 'sesion-pendiente' || motivo === 'contexto-no-disponible';
  const textos = TEXTOS[motivo];

  useEffect(() => {
    setFallos((f) => f + 1);
    setUltimoIntento(Date.now());
  }, [intento]);

  // La pantalla reemplaza a toda la aplicación: el foco va al título para que se anuncie.
  useEffect(() => { titulo.current?.focus(); }, []);

  useEffect(() => {
    const actualizar = () => setOnline(navigator.onLine);
    actualizar();
    window.addEventListener('online', actualizar);
    window.addEventListener('offline', actualizar);
    return () => { window.removeEventListener('online', actualizar); window.removeEventListener('offline', actualizar); };
  }, []);

  const reintentar = () => {
    // Un solo intento a la vez; sin red, refresh terminaría en la página de error del navegador.
    if (pendiente || !navigator.onLine) return;
    startTransition(() => router.refresh());
  };
  const { agotado } = useReintentoAutomatico(temporal ? fallos : 0, reintentar, { maxIntentos: 5, baseMs: 3_000, maxMs: 60_000, retryAfterMs: reintentarEnMs });

  const estado = !temporal
    ? null
    : pendiente
      ? 'Reintentando…'
      : !online
        ? 'Sin conexión. Reintentamos apenas vuelva.'
        : agotado
          ? 'No hubo respuesta después de varios intentos. Revisá la conexión y probá de nuevo.'
          : 'Reintentamos solos en unos segundos.';

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <section className="w-full min-w-0 max-w-md rounded-2xl border border-white/[0.07] bg-gm-hondo p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] sm:p-8" aria-labelledby="estado-acceso-titulo">
        <AppIcon className="mb-6 size-10" />
        <h1 id="estado-acceso-titulo" ref={titulo} tabIndex={-1} className="m-0 text-balance text-2xl font-semibold tracking-[-0.02em] focus:outline-none">
          {textos.titulo}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-gm-texto-2">{(motivo === 'sin-empresa' && mensaje) || textos.detalle}</p>

        {temporal && (
          <p role="status" aria-live="polite" className="mt-4 flex min-h-6 items-start gap-2 text-sm text-muted-foreground">
            {pendiente && <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden />}
            <span>
              {estado}
              {ultimoIntento && !pendiente && <span className="block text-[13px]">Último intento: {hora(ultimoIntento)}</span>}
            </span>
          </p>
        )}

        <div className="mt-6 grid gap-2">
          {motivo === 'sesion-invalida' ? (
            <form action={logoutAction}>
              <Button type="submit" className="h-12 w-full gap-2 rounded-xl bg-gm-yellow text-[15px] font-semibold text-gm-ink hover:bg-gm-yellow/90">
                Iniciar sesión de nuevo
              </Button>
            </form>
          ) : (
            <>
              <Button
                type="button"
                onClick={reintentar}
                disabled={pendiente || !online}
                className="h-12 w-full gap-2 rounded-xl bg-gm-yellow text-[15px] font-semibold text-gm-ink hover:bg-gm-yellow/90"
              >
                {pendiente ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
                {pendiente ? 'Reintentando…' : motivo === 'sin-empresa' ? 'Comprobar de nuevo' : 'Reintentar ahora'}
              </Button>
              <form action={logoutAction} className="text-center">
                <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow">
                  <LogOut className="size-4" aria-hidden />
                  Cerrar sesión
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
