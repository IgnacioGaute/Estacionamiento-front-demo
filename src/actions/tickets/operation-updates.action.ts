'use server';
import { readTicketsOperation } from '@/lib/tickets-operation.server';
import { auth } from '@/auth';
import type { TicketsOperationData, TicketsOperationRevisions } from '@/types/tickets-operation.type';

export async function getOperationUpdatesAction(known: Partial<TicketsOperationRevisions> = {}) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.token) return { refreshAccess: true };
    const { data, revisions } = await readTicketsOperation();
    const changes = Object.fromEntries(Object.entries(data).filter(([key]) => known[key as keyof TicketsOperationData] !== revisions[key as keyof TicketsOperationData])) as Partial<TicketsOperationData>;
    return { changes, revisions };
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error && [401, 403].includes(Number(error.status))) return { refreshAccess: true };
    return { error: 'No se pudo actualizar la operación.' };
  }
}
