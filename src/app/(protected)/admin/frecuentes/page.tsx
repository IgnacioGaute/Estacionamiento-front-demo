export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { getFrequentCustomersAction } from '@/actions/tickets/get-frequent-customers.action';
import { FrequentCustomersBody } from './components/frequent-customers-body';

export default async function FrequentCustomersPage() {
  const customers = await getFrequentCustomersAction({ minVisits: 2 });

  return (
    <div className="container mx-auto px-4 py-6 space-y-10">
      <FrequentCustomersBody initialCustomers={customers} />
    </div>
  );
}
