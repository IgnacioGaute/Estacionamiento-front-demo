import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getOperationalContext } from '@/actions/tenancy/context.action';
import { AppIcon } from '@/components/brand/logo';
import { AccessSelector } from './selector';

export default async function AccessSelectionPage() {
  const session = await auth();
  if (!session?.user.id || !session.token) redirect('/auth/login');
  if (session.user.role !== 'SUPER_ADMIN') redirect('/tickets');

  let playas: Awaited<ReturnType<typeof getOperationalContext>>['playas'] = [];
  let error = '';
  try {
    playas = (await getOperationalContext()).playas;
  } catch {
    error = 'No se pudieron cargar las playas. Podés entrar a la plataforma o volver a intentar.';
  }

  return (
    // Flex y min-w-0: en un grid centrado la tarjeta tomaba el ancho del texto más largo y se
    // salía de la pantalla del celular.
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <section className="w-full min-w-0 max-w-md rounded-2xl border border-white/[0.07] bg-[#0E0D0B] p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] sm:p-8" aria-labelledby="access-title">
        <div className="mb-6 flex items-center gap-3">
          <AppIcon className="size-10" />
          <span className="rounded-full border border-gm-yellow/25 bg-gm-yellow/[0.08] px-2.5 text-[12px] font-medium leading-6 text-gm-yellow">Super admin</span>
        </div>
        <h1 id="access-title" className="m-0 text-2xl font-semibold tracking-[-0.02em]">Elegí dónde entrar</h1>
        <p className="mb-6 mt-1.5 text-sm text-muted-foreground">La plataforma para administrar todo, o una playa para trabajar en ella.</p>
        <AccessSelector playas={playas} loadError={error} />
      </section>
    </main>
  );
}
