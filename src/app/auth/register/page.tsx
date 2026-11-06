import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AppIcon } from '@/components/brand/logo';

// El registro no es abierto: la cuenta la crea el administrador. Mismo marco que las demás
// pantallas de acceso (antes era texto suelto sin marca).
export default function RegisterPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <section className="w-full min-w-0 max-w-md rounded-2xl border border-white/[0.07] bg-gm-hondo p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] sm:p-8" aria-labelledby="register-title">
        <AppIcon className="mb-6 size-10" />
        <h1 id="register-title" className="m-0 text-2xl font-semibold tracking-[-0.02em]">Pedí tu acceso al administrador</h1>
        <p className="mb-6 mt-1.5 text-sm text-muted-foreground">El administrador de tu empresa crea tu cuenta y te asigna una playa.</p>
        <Button asChild className="h-11 w-full">
          <Link href="/auth/login">Volver a iniciar sesión</Link>
        </Button>
      </section>
    </main>
  );
}
