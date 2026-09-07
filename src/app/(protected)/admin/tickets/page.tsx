export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"
import { getTickets, getTicketPriceBrackets, getTicketSchedule } from '@/services/tickets.service';
import { currentUser } from '@/lib/auth';
import { TicketsAdminBody } from './components/tickets-admin-body';

export default async function UserPage() {
  const tickets = await getTickets();
  const priceBrackets = await getTicketPriceBrackets();
  const ticketSchedule = await getTicketSchedule();
  const user = await currentUser();

  // ✅ Ordenar tickets por número de código de barras (numéricamente)
  const sortedTickets = (tickets?.data || []).sort((a, b) => {
    const codeA = parseInt(a.codeBar, 10);
    const codeB = parseInt(b.codeBar, 10);
    return codeA - codeB;
  });

  return (
    <div className="container mx-auto px-4 py-6 space-y-10">
      <TicketsAdminBody
        sortedTickets={sortedTickets}
        ticketSchedule={ticketSchedule}
        priceBrackets={priceBrackets || []}
        isAdmin={user?.role === 'ADMIN'}
      />
    </div>
  );
}
