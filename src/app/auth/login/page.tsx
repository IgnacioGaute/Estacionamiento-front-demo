import { Suspense } from 'react';
import { LoginForm } from '@/app/auth/login/_components/login-form';
import { AppIcon } from '@/components/brand/logo';

// El saludo depende de la hora de la playa: se arma en cada pedido, no al compilar.
export const dynamic = 'force-dynamic';

function saludo() {
  const hora = Number(
    new Intl.DateTimeFormat('es-AR', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date()),
  );
  if (hora < 6) return 'Buenas noches';
  if (hora < 12) return 'Buen día';
  if (hora < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

// Una sola tarjeta y el logo como la pieza que encaja arriba, en un hueco de la tarjeta: el mismo
// encastre de la barra lateral y la de arriba dentro de la app.
export default function LoginPage() {
  return (
    // En pantallas bajas (celulares de 640 px) se achica el aire de arriba y abajo para que entre
    // todo sin scroll y la marca de abajo no quede cortada.
    <div className="relative grid min-h-[100dvh] w-full place-items-center overflow-hidden bg-background px-3.5 pb-20 pt-14 [@media(max-height:700px)]:pb-16 [@media(max-height:700px)]:pt-8">
      <div className="relative w-full max-w-[440px] pt-11">
        {/* La M del logo, gigante y apenas marcada, detrás de todo. Se ubica respecto de la tarjeta y
            no de la pantalla: el vértice de adentro del pico del medio (a 0,2 del ancho desde arriba)
            queda bajo la pieza del logo; centrada en la pantalla asomaba como una punta encima. */}
        <svg
          aria-hidden
          viewBox="0 0 84 72"
          fill="none"
          className="pointer-events-none absolute left-1/2 top-[calc(44px_-_0.2*min(1100px,145vw))] h-auto w-[min(1100px,145vw)] max-w-none -translate-x-1/2"
        >
          <path
            d="M4 68 V10 L26 40 L42 8 L58 40 L80 10 V68"
            stroke="hsl(var(--gm-yellow))"
            strokeOpacity={0.035}
            strokeWidth={8}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>

        <div className="relative [filter:drop-shadow(0_28px_40px_rgba(0,0,0,0.6))]">
          {/* La pieza: el logo en su círculo, centrado sobre el borde de arriba de la tarjeta. */}
          <div className="absolute left-1/2 top-0 z-10 grid size-[88px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#0B0A08]">
            <AppIcon className="size-[58px]" />
          </div>
          {/* El hueco donde encaja: 3 px más grande que la pieza. */}
          <div className="rounded-[28px] bg-[#0B0A08] px-6 pb-7 pt-[66px] [-webkit-mask-image:radial-gradient(circle_47px_at_50%_0,transparent_46.5px,#000_47px)] [mask-image:radial-gradient(circle_47px_at_50%_0,transparent_46.5px,#000_47px)] sm:px-9">
            <p className="text-center text-[11.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground sm:text-xs">{saludo()}</p>
            <h1 className="mt-2 text-center font-display text-[34px] font-bold leading-none sm:text-[38px]">Iniciar sesión</h1>

            <Suspense>
              <LoginForm />
            </Suspense>

            <p className="mt-6 text-balance text-center text-[13px] text-muted-foreground">
              ¿No tenés cuenta? Pedile acceso al administrador de tu playa.
            </p>
          </div>
        </div>
      </div>

      <p className="absolute inset-x-0 bottom-8 text-center font-display text-[13px] font-bold tracking-[0.18em] text-[#7D7365]">
        ESTACIONAMIENTO
      </p>
    </div>
  );
}
