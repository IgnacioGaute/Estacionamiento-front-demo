import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { getOperationalContext } from '@/actions/tenancy/context.action';
import { esGratuita, type Modalidad } from '@/lib/modalidad';

// La modalidad de la playa elegida, para páginas del servidor (las del cliente usan useTenant).
// Elige la playa igual que (protected)/layout.tsx. Ante un error queda «con cobro», que es lo que
// el backend sigue validando de todos modos.
export async function modalidadActual(): Promise<Modalidad> {
  try {
    const session = await auth();
    const context = await getOperationalContext();
    const selected = (await cookies()).get('parking-playa')?.value;
    const playa = context.role === 'USER'
      ? (context.playas.length === 1 ? context.playas[0] : undefined)
      : context.playas.find((p) => selected === `${session?.user?.id}:${p.id}`) ?? (context.playas.length === 1 ? context.playas[0] : undefined);
    return esGratuita(playa?.modalidad) ? 'GRATUITO' : 'CON_COBRO';
  } catch {
    return 'CON_COBRO';
  }
}
