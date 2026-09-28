export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { getTariffPlanAction } from '@/actions/tickets/tariff-plan.action';
import { getTicketsPrice } from '@/services/tickets.service';
import { TariffsBody } from './tariffs-body';

export default async function TariffsPage() {
  const user = await currentUser();
  if (user?.role !== 'ADMIN') redirect('/');
  const [tariff, passes] = await Promise.all([getTariffPlanAction(), getTicketsPrice()]);
  const passPrices = (passes?.data || []).filter(price => ['DIA', 'SEMANA', 'MES'].includes(price.ticketTimeType ?? ''));
  return <div className="container mx-auto space-y-6 px-4 py-6">
    <TariffsBody initialPlan={tariff.plan ?? null} loadError={tariff.error} passPrices={passPrices} />
  </div>;
}

