export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { currentUser } from "@/lib/auth";
import { readTicketsOperation } from '@/lib/tickets-operation.server';
import { TicketsLiveData } from './components/tickets-live-data';

export default async function TicketPage() {
  const user = await currentUser();
  const initial = await readTicketsOperation();

  return (
    <div className="py-2 sm:px-6 sm:py-7 lg:px-0 lg:py-2">
      <TicketsLiveData
        initial={initial}
        isAdmin={user?.role === "ADMIN" || user?.role === "SUPER_ADMIN"}
      />
    </div>
  );
}
