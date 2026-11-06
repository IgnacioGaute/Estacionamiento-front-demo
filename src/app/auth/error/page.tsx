import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AppIcon } from '@/components/brand/logo';

enum Error {
  Configuration = 'Configuration',
  AccessDenied = 'AccessDenied',
  Verification = 'Verification',
  Default = 'Default',
}

// Cada error dice qué pasó y qué hacer. Mismo marco que «Elegí dónde entrar»: antes era una
// tarjeta clara pegada arriba, la única pantalla fuera del tema oscuro.
const errorMap: Record<Error, { titulo: string; texto: string }> = {
  [Error.Configuration]: {
    titulo: 'No pudimos iniciar sesión',
    texto: 'Hubo un problema con la configuración del servidor. Probá de nuevo en unos minutos; si sigue pasando, avisale al administrador de tu playa.',
  },
  [Error.AccessDenied]: {
    titulo: 'No tenés acceso con esta cuenta',
    texto: 'Para entrar necesitás una invitación válida. Pedile acceso al administrador de tu playa.',
  },
  [Error.Verification]: {
    titulo: 'El enlace ya no sirve',
    texto: 'No pudimos verificar tu correo: el enlace venció o ya se usó. Pedí un enlace de verificación nuevo.',
  },
  [Error.Default]: {
    titulo: 'Algo salió mal',
    texto: 'Ocurrió un error inesperado. Probá de nuevo; si sigue pasando, avisale al administrador de tu playa.',
  },
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const p = await searchParams;
  const { titulo, texto } = errorMap[p.error as Error] ?? errorMap[Error.Default];

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <section className="w-full min-w-0 max-w-md rounded-2xl border border-white/[0.07] bg-[#0E0D0B] p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] sm:p-8" aria-labelledby="auth-error-title">
        <AppIcon className="mb-6 size-10" />
        <h1 id="auth-error-title" className="m-0 text-2xl font-semibold tracking-[-0.02em]">{titulo}</h1>
        <p className="mb-6 mt-1.5 text-sm text-muted-foreground">{texto}</p>
        <Button asChild className="h-11 w-full">
          <Link href="/auth/login">Volver a iniciar sesión</Link>
        </Button>
      </section>
    </main>
  );
}
