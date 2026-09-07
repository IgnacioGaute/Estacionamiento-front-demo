export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { getCustomers } from '@/services/customers.service';
import { CUSTOMER_TYPE } from '@/types/cutomer.type';
import { PaymentSummaryInlineTable } from '../../components/receipts/payment-summary-inline';

export default async function OwnerInlineDemoPage() {
  const customers = await getCustomers(CUSTOMER_TYPE[0]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6 flex items-baseline gap-3">
        <h1 className="gm-display text-[22px] font-bold uppercase tracking-[0.03em] text-foreground">
          Propietarios
        </h1>
        <span className="gm-mono text-[12px] text-muted-foreground">
          {customers?.length ?? 0} clientes · demo inline
        </span>
      </div>

      <PaymentSummaryInlineTable customers={customers ?? []} />
    </div>
  );
}
