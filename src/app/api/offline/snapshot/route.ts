import { auth } from '@/auth';
import { getAuthHeaders } from '@/lib/auth';
import { getOperationalContext } from '@/actions/tenancy/context.action';
import type { TicketRegistration } from '@/types/ticket-registration.type';
import type { TicketRegistrationForDay } from '@/types/ticket-registration-for-day.type';
import type { TicketPriceBracket } from '@/types/ticket-price-bracket.type';

export const dynamic = 'force-dynamic';
const reply = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store, private', 'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff' } });
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.token) return reply({ error: 'Iniciá sesión para preparar la copia.' }, 401);
  if (!['ADMIN', 'USER'].includes(session.user.role)) return reply({ error: 'Esta función es para operadores de una playa.' }, 403);
  try {
    const headers = await getAuthHeaders();
    const context = await getOperationalContext();
    const playa = context.playas.find(p => p.id === headers['X-Playa-Id']);
    if (!playa || !context.empresa) return reply({ error: 'Seleccioná una playa autorizada.' }, 403);
    const capturedAt = new Date().toISOString();
    const read = async (path: string) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/${path}`, { headers, cache: 'no-store', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('No se pudo obtener una copia completa. No se reemplazó la anterior.');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('La respuesta no permite preparar una copia completa.');
      return data;
    };
    const [hourly, daily, prices] = await Promise.all([read('registrations'), read('registrationForDays'), read('priceBrackets')]) as [TicketRegistration[], TicketRegistrationForDay[], TicketPriceBracket[]];
    return reply({ version: 1, capturedAt, expiresAt: Date.parse(capturedAt) + 86400000,
      scope: { userId: session.user.id, empresaId: context.empresa.id, playaId: playa.id }, parking: `${context.empresa.nombre} · ${playa.nombre}`,
      vehicles: [
        ...hourly.filter(r => !r.departureDay && !r.departureTime).map(r => ({ identification: r.licensePlateOriginal || r.vehiclePlateCustomer || r.codeBarTicket || 'Sin patente', type: r.vehicleType || r.ticket?.vehicleType || 'Vehículo', entry: `${r.entryDay} ${r.entryTime}`, period: 'Por hora' })),
        ...daily.filter(r => !r.retired).map(r => ({ identification: r.vehiclePlateCustomer || 'Sin patente', type: r.vehicleType, entry: String(r.dateNow ?? '').slice(0, 10), period: 'Día / semana / mes' })),
      ],
      prices: prices.map(p => ({ vehicle: p.vehicleType, label: p.label, period: p.ticketDayType || 'General', price: p.price })),
    });
  } catch { return reply({ error: 'No se pudo obtener una copia completa. Revisá la conexión y volvé a intentar.' }, 503); }
}
