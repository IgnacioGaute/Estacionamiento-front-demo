export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { getFrequentCustomersPageAction } from '@/actions/tickets/get-frequent-customers.action';
import { FrequentCustomersBody } from './components/frequent-customers-body';

export default async function FrequentCustomersPage() {
  const result = await getFrequentCustomersPageAction({ minVisits: 2, page: 1, limit: 25 });

  return (
    <div className="container mx-auto px-4 py-6 space-y-10">
      <FrequentCustomersBody initialCustomers={result.data} initialTotal={result.meta.totalItems} />
    </div>
  );
}
