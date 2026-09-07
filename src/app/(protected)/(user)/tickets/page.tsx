export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { getTicketRegistrations, getTickets, getTicketPriceBrackets, getTicketSchedule } from "@/services/tickets.service";
import CardTicket from "./components/ticket.card";

export default async function TicketPage() {
  const registrations = await getTicketRegistrations();
  const ticketsCatalog = await getTickets();
  const priceBrackets = await getTicketPriceBrackets();
  const schedule = await getTicketSchedule();

  return (
    <div className="py-10 px-4 sm:px-6">
      <CardTicket
        initialRegistrations={registrations}
        ticketCatalog={ticketsCatalog?.data || []}
        priceBrackets={priceBrackets || []}
        barcodeTicketsEnabled={schedule?.barcodeTicketsEnabled ?? true}
      />
    </div>
  );
}
