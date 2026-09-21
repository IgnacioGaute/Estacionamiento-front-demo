import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="flex justify-center items-center min-h-screen py-6">
      <div className="max-w-md space-y-4 p-6 text-center">
        <h1 className="text-2xl font-semibold">Pedí tu acceso al administrador</h1>
        <p className="text-muted-foreground">El administrador de tu empresa crea tu cuenta y te asigna una playa.</p>
        <Link className="inline-block underline" href="/auth/login">Volver a iniciar sesión</Link>
      </div>
    </div>
  );
}
