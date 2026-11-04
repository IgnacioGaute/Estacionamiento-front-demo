export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { getTicketSchedule } from '@/services/tickets.service';

// Caja abre en Turnos si están activos (es lo que el administrador revisa a diario) y si no en
// Ingresos y gastos. Los enlaces viejos con ?tab= y los filtros siguen funcionando.
export default async function CajaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const shiftsEnabled = (await getTicketSchedule())?.shiftsEnabled === true;
  const destino = shiftsEnabled && query.tab !== 'movimientos' ? 'turnos' : 'movimientos';
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(query)) if (typeof valor === 'string' && clave !== 'tab') params.set(clave, valor);
  const resto = params.toString();
  redirect(`/admin/caja/${destino}${resto ? '?' + resto : ''}`);
}
