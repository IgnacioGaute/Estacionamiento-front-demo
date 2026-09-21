export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { getTicketRegistrations, getTickets, getTicketPriceBrackets, getTicketSchedule, getTicketsRegistrationForDay } from "@/services/tickets.service";
import { currentUser } from "@/lib/auth";
import CardTicket from "./components/ticket.card";

export default async function TicketPage() {
  const user = await currentUser();
  const registrations = await getTicketRegistrations();
  const ticketsCatalog = await getTickets();
  const priceBrackets = await getTicketPriceBrackets();
  const schedule = await getTicketSchedule();
  const registrationsForDay = await getTicketsRegistrationForDay();

  return (
    <div className="px-3 py-5 sm:px-6 sm:py-7">
      <CardTicket
        initialRegistrations={registrations}
        ticketCatalog={ticketsCatalog?.data || []}
        priceBrackets={priceBrackets || []}
        registrationsForDay={registrationsForDay || []}
        schedule={schedule}
        isAdmin={user?.role === "ADMIN"}
        barcodeTicketsEnabled={schedule?.barcodeTicketsEnabled ?? true}
      />
    </div>
  );
}
