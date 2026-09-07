import { Suspense } from 'react';
import { LoginForm } from '@/app/auth/login/_components/login-form';
import { GarageMitreLogo } from '@/components/brand/logo';

export default function LoginPage() {
  return (
    <div className="grid min-h-[100dvh] w-full grid-cols-1 lg:grid-cols-[1fr_480px]">
      {/* — BRAND PANEL — */}
      <aside
        className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-border p-14"
        style={{
          background:
            'radial-gradient(ellipse at 30% 20%, hsl(var(--gm-yellow) / 0.10), transparent 55%), radial-gradient(ellipse at 80% 90%, hsl(var(--gm-orange) / 0.10), transparent 55%), hsl(var(--gm-surface))',
        }}
      >
        {/* Vertical caution-tape strip on the very edge */}
        <div className="gm-stripes absolute inset-y-0 left-0 w-2" aria-hidden />

        <GarageMitreLogo size="md" />

        <div>
          <div className="text-[11px] font-bold tracking-[0.18em] text-gm-orange">
            OPEN · 24 / 7 · 365
          </div>
          <h2 className="gm-display mt-4 text-[80px] font-bold leading-[0.95] tracking-[-0.01em] text-foreground">
            EL VOLANTE
            <br />
            <span className="text-gm-yellow">DEL NEGOCIO,</span>
            <br />
            EN TUS MANOS.
          </h2>
          <p className="mt-6 max-w-[460px] text-[14px] leading-[1.6] text-muted-foreground">
            Sistema operativo de la cochera: tickets, recibos y caja.
            Diseñado para que el operador haga todo sin levantar la vista del auto que entra.
          </p>

          {/* <div className="mt-10 grid max-w-[460px] grid-cols-3 gap-3">
            {[
              { k: '62', l: 'años operando' },
              { k: '284', l: 'espacios' },
              { k: '1.4k', l: 'clientes activos' },
            ].map((m) => (
              <div
                key={m.l}
                className="rounded-md border border-border bg-black/25 p-3.5"
              >
                <div className="gm-display gm-tnum text-[28px] font-bold leading-none text-gm-yellow">
                  {m.k}
                </div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  {m.l}
                </div>
              </div>
            ))}
          </div> */}
        </div>

        <div className="text-[11px] tracking-[0.04em] text-muted-foreground">
        </div>
      </aside>

      {/* — FORM PANEL — */}
      <section className="flex items-center justify-center bg-background p-8 lg:p-14">
        <div className="w-full max-w-[400px]">
          {/* mobile logo */}
          <div className="mb-8 flex justify-center lg:hidden">
            <GarageMitreLogo size="md" withTagline />
          </div>

          <div className="mb-6">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Acceso de operador
            </div>
            <h1 className="gm-display mt-2 text-[34px] font-bold leading-tight tracking-[0.01em] text-foreground">
              Iniciar sesión
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Ingresá con tu cuenta para abrir caja.
            </p>
          </div>

          <Suspense>
            <LoginForm />
          </Suspense>

          <p className="mt-10 text-center text-[12px] text-muted-foreground">
            ¿Sin cuenta?{' '}
            <span className="text-gm-yellow">Pedile acceso al administrador.</span>
          </p>
        </div>
      </section>
    </div>
  );
}
