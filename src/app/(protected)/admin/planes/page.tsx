export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { PlanesPanel } from './components/planes-panel';

export default async function PlanesPage() {
  // Lo que la plataforma le cobra a cada empresa: solo el super admin. La ruta además figura en
  // las secciones de plataforma del middleware.
  const session = await auth();
  if ((session?.user?.role ?? '').toUpperCase() !== 'SUPER_ADMIN') redirect('/tickets');

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 sm:p-8">
      <PlanesPanel />
    </div>
  );
}
